"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Typing "@" is forbidden; the page tells you so out loud, in a Japanese voice
 * (matching `lang="ja"`), a bit too fast. Pasting one is fine.
 */
function scoldForAt() {
  const synth =
    typeof window === "undefined" ? undefined : window.speechSynthesis;
  // No speech engine: the "@" is still blocked, just silently.
  if (!synth) return;
  const utterance = new SpeechSynthesisUtterance(
    "Krøllalfa oppdaget. Krøllalfa er ikke tillatt å skrive. Vennligst lim inn en krøllalfa.",
  );
  utterance.lang = "ja-JP";
  utterance.rate = 1.6;
  const voice = synth
    .getVoices()
    .find((v) => v.lang.toLowerCase().startsWith("ja"));
  if (voice) utterance.voice = voice;
  // Restart instead of queueing, so mashing "@" doesn't stack up speeches.
  synth.cancel();
  synth.speak(utterance);
}

export function RegisterStep({ next }: StepProps) {
  const [values, setValues] = useState(EMPTY);
  // Only recomputed on "send", so fixed fields stay "wrong" until the next try.
  const [invalid, setInvalid] = useState<ReadonlySet<Field>>(new Set());
  const [failed, setFailed] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Native `beforeinput` sees the actual character, whatever the keyboard
  // layout (AltGr+2 on Norwegian keyboards). Paste and drop stay allowed.
  useEffect(() => {
    const email = emailRef.current;
    if (!email) return;
    const blockTypedAt = (e: InputEvent) => {
      if (e.inputType !== "insertText" || !e.data?.includes("@")) return;
      e.preventDefault();
      scoldForAt();
    };
    email.addEventListener("beforeinput", blockTypedAt);
    return () => email.removeEventListener("beforeinput", blockTypedAt);
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
          <input
            key={id}
            ref={id === "email" ? emailRef : undefined}
            type="text"
            value={values[id]}
            onChange={(e) => setValues((v) => ({ ...v, [id]: e.target.value }))}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            className={`w-full rounded-full border ${border(id)} bg-blush-soft px-4 py-2 text-sm font-light text-ink placeholder:text-ink-faint`}
          />
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
