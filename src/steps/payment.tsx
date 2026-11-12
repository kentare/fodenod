"use client";

import { type ReactNode, useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";
import { shuffle } from "@/lib/random";

// Safety: everything typed here lives in component state only. It is never
// passed to setData, stored, logged or sent anywhere, and there is no Luhn
// check: any 16 digits "work".

const CARD_LENGTH = 16;
const CVC_LENGTH = 3;
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const MASKS = ["✱", "✳", "❋", "✲", "✺", "✻"] as const;

/** Every month from January 1970 to December 2099. */
const FIRST_YEAR = 1970;
const LAST_YEAR = 2099;
const MONTH_COUNT = (LAST_YEAR - FIRST_YEAR + 1) * 12;

const SKIP_REPLIES = [
  "Betaling er obligatorisk.",
  "Fortsatt obligatorisk.",
  "Vi har flyttet litt på feltene, så de blir lettere å finne.",
  "Hopp over-knappen er kun dekorativ.",
  "Du har nå trykket på en knapp som ikke gjør noe. Gratulerer.",
] as const;

type Section = "number" | "expiry" | "cvc" | "holder";
const SECTIONS: readonly Section[] = ["number", "expiry", "cvc", "holder"];

function randomDigit() {
  return Math.floor(Math.random() * 10);
}

function randomCardNumber() {
  return Array.from({ length: CARD_LENGTH }, randomDigit);
}

/** Random month before today, so the slider never starts on a valid date. */
function randomPastMonth() {
  return Math.floor(Math.random() * (currentMonthIndex() - 1));
}

function currentMonthIndex() {
  const now = new Date();
  return (now.getFullYear() - FIRST_YEAR) * 12 + now.getMonth();
}

/** WCAG 3.3.2: two-digit years, so 03/75 could be 1975 or 2075. Good luck. */
function formatExpiry(monthIndex: number) {
  const month = (monthIndex % 12) + 1;
  const year = FIRST_YEAR + Math.floor(monthIndex / 12);
  return `${String(month).padStart(2, "0")}/${String(year % 100).padStart(2, "0")}`;
}

/** The mask is scrambled too: random symbols, random length, unrelated to what you typed. */
function scrambledMask(length: number) {
  if (length === 0) return "";
  const shown = 1 + Math.floor(Math.random() * 6);
  return Array.from({ length: shown }, () => MASKS[Math.floor(Math.random() * MASKS.length)]).join("");
}

export function PaymentStep({ next }: StepProps) {
  const [digits, setDigits] = useState(randomCardNumber);
  const [touched, setTouched] = useState<ReadonlySet<number>>(new Set());
  const [today] = useState(currentMonthIndex);
  const [expiry, setExpiry] = useState(randomPastMonth);
  const [cvc, setCvc] = useState("");
  const [mask, setMask] = useState("");
  const [keypad, setKeypad] = useState(() => shuffle(DIGITS));
  const [order, setOrder] = useState(SECTIONS);
  const [skips, setSkips] = useState(0);
  const [errors, setErrors] = useState<readonly string[]>([]);

  // WCAG 3.2.5 / common sense: ▲ goes down and ▼ goes up.
  function spin(index: number, delta: number) {
    setDigits((current) => current.map((d, i) => (i === index ? (d + delta + 10) % 10 : d)));
    setTouched((current) => new Set(current).add(index));
  }

  function pressKey(key: string) {
    const updated = (cvc + key).slice(0, CVC_LENGTH);
    setCvc(updated);
    setMask(scrambledMask(updated.length));
    // WCAG 2.5.8-ish: the target moves after every press.
    setKeypad(shuffle(DIGITS));
  }

  function clearCvc() {
    setCvc("");
    setMask("");
    setKeypad(shuffle(DIGITS));
  }

  function skip() {
    setSkips((n) => n + 1);
    setOrder((current) => shuffle(current));
  }

  function submit() {
    const problems: string[] = [];
    const unconfirmed = CARD_LENGTH - touched.size;
    if (unconfirmed > 0) {
      problems.push(
        `Kortnummer: ${unconfirmed} siffer er ikke bekreftet. Hvert siffer må endres manuelt minst én gang.`,
      );
    }
    if (expiry < today) problems.push(`Utløpsdato: kortet utløp ${formatExpiry(expiry)}.`);
    if (cvc.length < CVC_LENGTH) problems.push("CVC: for kort. Eller for lang. Vi ser det ikke.");

    if (problems.length === 0) {
      next();
      return;
    }
    setErrors(problems);
  }


  const sections: Record<Section, ReactNode> = {
    number: (
      <Field label="Kortnummer">
        <div className="flex justify-between">
          {[0, 1, 2, 3].map((group) => (
            <div key={group} className="flex">
              {digits.slice(group * 4, group * 4 + 4).map((digit, offset) => {
                const i = group * 4 + offset;
                return (
                  <div key={i} className="flex w-[17px] flex-col items-center">
                    {/* Icon-only, unlabeled, and reversed: ▲ goes down. */}
                    <FakeButton
                      onClick={() => spin(i, -1)}
                      className="w-full text-center text-[7px] leading-[12px] text-ink-faint"
                    >
                      ▲
                    </FakeButton>
                    {/* WCAG 1.4.1: a confirmed digit is a slightly lighter pink. That's it. */}
                    <div
                      className={`w-full text-center text-[15px] font-light leading-[20px] tabular-nums ${
                        touched.has(i) ? "text-blush-deep" : "text-ink"
                      }`}
                    >
                      {digit}
                    </div>
                    <FakeButton
                      onClick={() => spin(i, 1)}
                      className="w-full text-center text-[7px] leading-[12px] text-ink-faint"
                    >
                      ▼
                    </FakeButton>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Field>
    ),
    expiry: (
      <Field label="Utløpsdato">
        {/* Reversed on purpose: 2099 on the left, 1970 on the right. */}
        <input
          type="range"
          min={0}
          max={MONTH_COUNT - 1}
          value={MONTH_COUNT - 1 - expiry}
          onChange={(e) => setExpiry(MONTH_COUNT - 1 - Number(e.target.value))}
          className="h-[2px] w-full appearance-none rounded-full bg-blush-soft [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blush [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blush"
        />
        <div className="flex justify-between text-[8px] text-ink-faint">
          <span>{LAST_YEAR}</span>
          <span className="text-[12px] font-light tabular-nums text-ink">
            {formatExpiry(expiry)}
          </span>
          <span>{FIRST_YEAR}</span>
        </div>
      </Field>
    ),
    cvc: (
      <Field label="CVC">
        <div className="mb-2 h-[20px] text-center text-[13px] tracking-[0.3em] text-blush-deep">
          {mask}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {keypad.map((key) => (
            <FakeButton
              key={key}
              onClick={() => pressKey(key)}
              className="rounded-full border border-blush-soft py-[3px] text-center text-[11px] font-light tabular-nums text-ink"
            >
              {key}
            </FakeButton>
          ))}
          <FakeButton
            onClick={clearCvc}
            className="col-span-2 rounded-full py-[3px] text-center text-[9px] leading-[17px] text-ink-faint"
          >
            tøm alt
          </FakeButton>
        </div>
        <div className="mt-1 text-[8px] text-ink-faint">
          Maskert og stokket, for din sikkerhet.
        </div>
      </Field>
    ),
    holder: (
      <Field label="Kortholder">
        <div className="rounded-full border border-blush-soft px-3 py-1 text-[11px] text-ink-faint">
          Ukjent
        </div>
        <div className="mt-1 px-3 text-[8px] text-ink-faint">
          Fylles ut automatisk når vi finner ut hvem du er.
        </div>
      </Field>
    ),
  };

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-1 flex-col items-center bg-paper px-4 py-12 font-sans text-ink"
    >
      <div className="flex w-[min(340px,100%)] flex-col gap-6">
        <header className="text-center">
          <p className="text-[9px] uppercase tracking-[0.3em] text-ink-faint">Steg 1 av ?</p>
          <h1 className="mt-2 text-3xl font-extralight tracking-tight text-blush-deep">
            Betalingsinformasjon
          </h1>
          <p className="mt-2 text-[11px] font-light text-ink">
            Vi trenger bare kortet ditt før vi vet om du trenger oss.
          </p>
        </header>

        <CardPreview digits={digits} expiry={formatExpiry(expiry)} cvc={cvc} />

        {/* The wrong action is the big filled pink primary pill. */}
        <FakeButton
          onClick={skip}
          className="rounded-full bg-blush py-4 text-center text-lg font-light tracking-wide text-paper"
        >
          Hopp over
          <span className="block text-[9px] tracking-normal text-paper">
            {skips === 0
              ? "anbefalt for travle fødende"
              : SKIP_REPLIES[(skips - 1) % SKIP_REPLIES.length]}
          </span>
        </FakeButton>

        <div className="flex flex-col gap-6 rounded-2xl border border-blush-soft bg-paper p-5">
          {order.map((section) => (
            <div key={section}>{sections[section]}</div>
          ))}
        </div>

        <div className="flex items-start justify-between gap-4 px-1">
          {/* WCAG 3.3.1: errors in a red so faint it reads as more pink. */}
          <div className="flex flex-col gap-[2px] text-[8px] leading-tight text-[#efb3c0]">
            {errors.map((error) => (
              <span key={error}>{error}</span>
            ))}
          </div>
          {/* The real continue: a ghost button that looks like fine print. */}
          <FakeButton onClick={submit} className="shrink-0 text-[10px] text-ink-faint">
            fortsett
          </FakeButton>
        </div>

        <p className="text-center text-[8px] text-ink-faint">
          Ikke bruk ekte kortinformasjon. Vi trekker uansett ikke noe. Tror vi.
        </p>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[9px] uppercase tracking-[0.2em] text-ink-faint">{label}</div>
      {children}
    </div>
  );
}

/** A made-up house card. No real card-scheme branding, on purpose. */
function CardPreview({ digits, expiry, cvc }: { digits: number[]; expiry: string; cvc: string }) {
  const groups = [0, 1, 2, 3].map((g) => digits.slice(g * 4, g * 4 + 4).join(""));
  return (
    <div className="mx-auto aspect-[1.586] w-full rounded-2xl border border-blush-deep bg-blush-soft p-5">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-light text-blush-deep">fødenød</span>
        <span className="text-[8px] uppercase tracking-[0.3em] text-ink-faint">Prematur</span>
      </div>
      <div className="mt-4 h-6 w-8 rounded-md border border-blush-deep bg-blush" />
      <div className="mt-4 text-[18px] font-extralight tracking-[0.12em] tabular-nums text-ink">
        {groups.join(" ")}
      </div>
      <div className="mt-3 flex items-end justify-between text-ink">
        <div>
          <div className="text-[7px] uppercase tracking-[0.2em] text-ink-faint">Kortholder</div>
          <div className="text-[10px]">Ukjent</div>
        </div>
        <div>
          <div className="text-[7px] uppercase tracking-[0.2em] text-ink-faint">Gyldig til</div>
          <div className="text-[10px] tabular-nums">{expiry}</div>
        </div>
        <div className="text-right">
          {/* The CVC is masked in the form, then printed on the front of the card. */}
          <div className="text-[7px] uppercase tracking-[0.2em] text-ink-faint">
            CVC, for din sikkerhet
          </div>
          <div className="text-[10px] tabular-nums">{cvc || "···"}</div>
        </div>
      </div>
    </div>
  );
}
