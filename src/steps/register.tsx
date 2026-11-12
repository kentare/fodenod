"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";

type Field = "weight" | "age" | "email";

/** Placeholders double as the only labels (WCAG 1.3.1, 3.3.2). */
const FIELDS: readonly { id: Field; placeholder: string }[] = [
  { id: "weight", placeholder: "Vekt (kg)" },
  { id: "age", placeholder: "Alder" },
  { id: "email", placeholder: "E-post" },
];

const EMPTY: Record<Field, string> = {
  weight: "",
  age: "",
  email: "",
};

/** Lenient number check; accepts a Norwegian decimal comma. */
function between(value: string, min: number, max: number) {
  const trimmed = value.trim();
  const n = Number(trimmed.replace(",", "."));
  return trimmed !== "" && Number.isFinite(n) && n >= min && n <= max;
}

const VALID: Record<Field, (value: string) => boolean> = {
  weight: (v) => between(v, 20, 400),
  age: (v) => between(v, 1, 120),
  email: (v) => /@.*\./.test(v),
};

/**
 * Base border colour for every field. Invalid fields get a pink with the
 * faintest hint of red, so colour is the only (barely visible) signal (WCAG 1.4.1).
 */
const OK = "border-blush";
const BAD = "border-[#f397b8]";

const PASTE_PLEASE =
  "Krøllalfa oppdaget. Krøllalfa er ikke tillatt å skrive. Vennligst lim inn en krøllalfa.";
const DICTATE_PLEASE = "Krøllalfa må dikteres. Si «krøllalfa» nå.";
const NOT_AN_AT = "Beklager, det hørtes ikke ut som en krøllalfa.";
/** Anything that sounds like "@" when said out loud (in Norwegian, or not). */
const SPOKEN_AT = /krøll|alfa|snabel|\bat\b|@/i;
/** Chrome sometimes never fires `end` on an utterance; don't wait forever. */
const SPEECH_TIMEOUT_MS = 10_000;

/** The bits of the (prefixed, not in lib.dom) Web Speech recognition API we use. */
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  const w = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function heardAnAt(results: SpeechRecognitionResultList) {
  for (const result of Array.from(results)) {
    for (const alternative of Array.from(result)) {
      if (SPOKEN_AT.test(alternative.transcript)) return true;
    }
  }
  return false;
}

/** Held so Chrome can't garbage-collect an utterance before its `end` fires. */
let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speaks in a Japanese voice (matching `lang="ja"`), a bit too fast. Calls
 * `onDone` once when finished, or right away if there's no speech engine.
 */
function speak(text: string, onDone?: () => void) {
  const synth =
    typeof window === "undefined" ? undefined : window.speechSynthesis;
  if (!synth) {
    onDone?.();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 1.6;
  const voice = synth
    .getVoices()
    .find((v) => v.lang.toLowerCase().startsWith("ja"));
  if (voice) utterance.voice = voice;

  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (currentUtterance === utterance) currentUtterance = null;
    onDone?.();
  };
  if (onDone) timer = setTimeout(finish, SPEECH_TIMEOUT_MS);
  utterance.onend = finish;
  utterance.onerror = finish;

  // Restart instead of queueing, so nothing stacks up.
  synth.cancel();
  currentUtterance = utterance;
  synth.speak(utterance);
}

export function RegisterStep({ next }: StepProps) {
  const [values, setValues] = useState(EMPTY);
  // Only recomputed on "send", so fixed fields stay "wrong" until the next try.
  const [invalid, setInvalid] = useState<ReadonlySet<Field>>(new Set());
  const [failed, setFailed] = useState(false);
  const [listening, setListening] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  /** Where the caret goes after a dictated "@" lands in the email field. */
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const caret = caretRef.current;
    if (caret === null) return;
    caretRef.current = null;
    emailRef.current?.setSelectionRange(caret, caret);
  }, [values.email]);

  // Typing "@" is forbidden: it has to be dictated instead. Native
  // `beforeinput` sees the actual character, whatever the keyboard layout
  // (AltGr+2 on Norwegian keyboards). Paste and drop always stay allowed.
  useEffect(() => {
    const email = emailRef.current;
    if (!email) return;
    let disposed = false;
    /** True from the dictation prompt until recognition ends. */
    let busy = false;
    let recognition: Recognition | null = null;

    const insertAt = () => {
      const start = email.selectionStart ?? email.value.length;
      const end = email.selectionEnd ?? start;
      const value = email.value;
      caretRef.current = start + 1;
      setValues((v) => ({
        ...v,
        email: `${value.slice(0, start)}@${value.slice(end)}`,
      }));
    };

    const listen = (Recognition: RecognitionConstructor) => {
      if (disposed) return;
      const session = new Recognition();
      session.lang = "nb-NO";
      session.interimResults = false;
      session.maxAlternatives = 5;
      session.continuous = false;
      let heard = false;
      session.onresult = (event) => {
        if (heard || !heardAnAt(event.results)) return;
        heard = true;
        insertAt();
      };
      // Errors (no mic, no speech, denied) are always followed by `end`.
      session.onend = () => {
        recognition = null;
        busy = false;
        setListening(false);
        if (!heard && !disposed) speak(NOT_AN_AT);
      };
      recognition = session;
      setListening(true);
      try {
        session.start();
      } catch {
        session.onend();
      }
    };

    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType !== "insertText" || !e.data?.includes("@")) return;
      e.preventDefault();
      // One dictation at a time; extra "@"s are simply swallowed.
      if (busy) return;
      const Recognition = recognitionConstructor();
      if (!Recognition) {
        // No recognition (Firefox): pasting is the only way.
        speak(PASTE_PLEASE);
        return;
      }
      busy = true;
      speak(DICTATE_PLEASE, () => listen(Recognition));
    };

    email.addEventListener("beforeinput", onBeforeInput);
    return () => {
      disposed = true;
      email.removeEventListener("beforeinput", onBeforeInput);
      recognition?.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const border = (field: Field) => (invalid.has(field) ? BAD : OK);

  function reset() {
    setValues(EMPTY);
    setInvalid(new Set());
    setFailed(false);
  }

  function submit() {
    const bad = new Set(
      FIELDS.map((f) => f.id).filter((id) => !VALID[id](values[id])),
    );
    if (bad.size === 0) {
      next();
      return;
    }
    setInvalid(bad);
    setFailed(true);
  }

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 text-ink"
    >
      <div className="flex w-[min(340px,92vw)] flex-col gap-5">
        <header className="mb-6 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-4xl font-extralight tracking-tight text-blush-deep">
            grav
            <span className="rounded-full border border-blush-deep px-2 py-0.5 text-[11px] font-normal tracking-[0.2em]">
              ID
            </span>
          </div>
          <div className="text-[9px] text-ink-faint">Sikker innlogging*</div>
        </header>

        {FIELDS.map(({ id, placeholder }) => (
          <div key={id} className="relative">
            <input
              ref={id === "email" ? emailRef : undefined}
              type="text"
              value={values[id]}
              onChange={(e) =>
                setValues((v) => ({ ...v, [id]: e.target.value }))
              }
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              className={`w-full rounded-full border ${border(id)} bg-blush-soft px-4 py-2 text-sm font-light text-ink placeholder:text-ink-faint`}
            />
            {id === "email" && listening && (
              // Slow 2s opacity pulse: nowhere near 3 flashes per second.
              <span className="absolute top-1/2 right-4 -translate-y-1/2 animate-pulse text-[9px] text-blush-deep">
                ● Lytter…
              </span>
            )}
          </div>
        ))}

        {/* The one obvious, inviting button wipes the whole form. */}
        <FakeButton
          onClick={reset}
          className="mt-6 rounded-full bg-blush py-4 text-center text-sm font-medium tracking-[0.35em] text-paper"
        >
          NULLSTILL
        </FakeButton>

        <div className="flex items-end justify-between">
          <span className="text-[8px] text-ink-faint">*ikke sikker</span>
          <FakeButton onClick={submit} className="text-[9px] text-ink-faint">
            send
          </FakeButton>
        </div>

        {/* WCAG 3.3.1: an unhelpful error, below the fold of your attention. */}
        <p className="h-4 text-center text-[10px] text-[#ea8cad]">
          {failed && "Noe gikk galt. (feil 0x1F4A9)"}
        </p>
      </div>
    </main>
  );
}
