"use client";

import { type ReactNode, useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";

// SAFETY: this is a parody of a phishing-style card form, so real people might
// be tempted to type real details. Therefore:
// - every value lives in component state only and is dropped on unmount
//   (never passed to setData, stored, logged or sent anywhere);
// - no `name`/`id` attributes, no `cc-*`/`name`/`password` autocomplete
//   tokens, autocomplete is off, and password managers are told to ignore the
//   fields, so browsers don't offer to fill in saved cards or passwords;
// - labels are drawn with CSS `content`, so autofill heuristics that read the
//   label text (e.g. "Kortnummer") have nothing to match on;
// - the PIN is masked with -webkit-text-security, not type="password";
// - no Luhn or other real-card validation: any 16 digits pass.

const INCOME_RANGES = [
  "Under 300 000 kr",
  "300 000 – 600 000 kr",
  "600 000 – 1 000 000 kr",
  "Over 1 000 000 kr",
  "Over 1 000 000 kr, og vi har hytte",
] as const;

const AWAY_DURATIONS = [
  "1–2 døgn",
  "3–5 døgn",
  "En uke eller mer",
  "Vet ikke, hele husstanden blir med",
] as const;

/** Extra attributes that tell browsers and password managers to keep out. */
const NO_AUTOFILL = {
  autoComplete: "off",
  autoCorrect: "off",
  spellCheck: false,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

const digitsOnly = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

function formatCardNumber(value: string) {
  return digitsOnly(value, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = digitsOnly(value, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

const INPUT =
  "w-full rounded-full border border-blush-deep bg-paper px-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:bg-blush-soft";

export function PaymentStep({ next }: StepProps) {
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");
  const [pin, setPin] = useState("");
  const [income, setIncome] = useState("");
  const [maidenName, setMaidenName] = useState("");
  const [pet, setPet] = useState("");
  const [away, setAway] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [missing, setMissing] = useState<readonly string[]>([]);

  function submit() {
    const problems: string[] = [];
    if (digitsOnly(card, 16).length < 16) problems.push("kortnummer");
    if (digitsOnly(expiry, 4).length < 4) problems.push("utløpsdato");
    if (digitsOnly(cvc, 3).length < 3) problems.push("CVC");
    if (!holder.trim()) problems.push("navn på kortet");
    if (digitsOnly(pin, 4).length < 4) problems.push("PIN-kode");

    if (problems.length > 0) {
      setMissing(problems);
      return;
    }
    next();
  }

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-1 flex-col items-center px-4 pt-20 pb-10 text-ink"
    >
      <div className="flex w-[min(400px,100%)] flex-col gap-6">
        {/* A very legitimate-looking address. */}
        <div className="mx-auto flex max-w-full items-center gap-2 truncate rounded-full border border-blush-soft px-4 py-1 text-[12px] text-ink">
          <span>🔒</span>
          <span className="truncate">
            https://fodenod-betaling.secure-login.xyz/kasse/verifiser?ref=0&amp;sikker=ja
          </span>
        </div>

        <header className="text-center">
          <h1 className="text-3xl font-extralight tracking-tight text-blush-deep">
            Betalingsinformasjon
          </h1>
        </header>

        <form
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-6"
        >
          <Card title="🔒 Kortopplysninger">
            <Field label="Kortnummer">
              <input
                {...NO_AUTOFILL}
                type="text"
                inputMode="numeric"
                value={card}
                onChange={(e) => setCard(formatCardNumber(e.target.value))}
                placeholder="0000 0000 0000 0000"
                className={`${INPUT} tabular-nums tracking-wider`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Utløpsdato">
                <input
                  {...NO_AUTOFILL}
                  type="text"
                  inputMode="numeric"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="–– / ––"
                  className={`${INPUT} tabular-nums`}
                />
              </Field>
              <Field label="CVC">
                <input
                  {...NO_AUTOFILL}
                  type="text"
                  inputMode="numeric"
                  value={cvc}
                  onChange={(e) => setCvc(digitsOnly(e.target.value, 3))}
                  placeholder="3 siffer"
                  className={`${INPUT} tabular-nums`}
                />
              </Field>
            </div>
            <Field label="Navn på kortet">
              <input
                {...NO_AUTOFILL}
                type="text"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="PIN-kode (for verifisering)">
              {/* Masked with CSS, not type="password", so password managers stay out. */}
              <input
                {...NO_AUTOFILL}
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(digitsOnly(e.target.value, 4))}
                placeholder="4 siffer"
                className={`${INPUT} tabular-nums tracking-[0.5em] placeholder:tracking-normal [-webkit-text-security:disc]`}
              />
            </Field>
          </Card>

          <Card title="🔒 Sikkerhetsspørsmål (standard prosedyre)">
            <Field label="Ca. årsinntekt i husholdningen">
              <select
                {...NO_AUTOFILL}
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className={`${INPUT} appearance-none`}
              >
                <option value="">Velg</option>
                {INCOME_RANGES.map((range) => (
                  <option key={range}>{range}</option>
                ))}
              </select>
            </Field>
            <Field label="Morens pikenavn">
              <input
                {...NO_AUTOFILL}
                type="text"
                value={maidenName}
                onChange={(e) => setMaidenName(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Navn på ditt første kjæledyr">
              <input
                {...NO_AUTOFILL}
                type="text"
                value={pet}
                onChange={(e) => setPet(e.target.value)}
                className={INPUT}
              />
            </Field>
          </Card>

          <Card title="🔒 Mens du er på sykehuset">
            <Field label="Hvor lenge blir boligen stående tom?">
              <select
                {...NO_AUTOFILL}
                value={away}
                onChange={(e) => setAway(e.target.value)}
                className={`${INPUT} appearance-none`}
              >
                <option value="">Velg</option>
                {AWAY_DURATIONS.map((duration) => (
                  <option key={duration}>{duration}</option>
                ))}
              </select>
            </Field>
          </Card>

          <div className="flex flex-col gap-2 px-4 text-xs">
            <Consent checked={saveCard} onChange={setSaveCard}>
              Lagre kortet for fremtidige fødsler
            </Consent>
          </div>

          {missing.length > 0 && (
            <p className="px-4 text-xs text-[#e888a6]">Mangler: {missing.join(", ")}.</p>
          )}

          <FakeButton
            onClick={submit}
            className="rounded-full bg-blush py-3 text-center text-base font-medium text-paper"
          >
            🔒 Fortsett sikkert
          </FakeButton>
        </form>

        <p className="text-center text-[13px] text-ink">
          Dette er en parodi. Ikke bruk ekte kortinformasjon. Ingenting lagres eller sendes.
        </p>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-blush-soft bg-paper p-5">
      <h2 className="text-sm font-light text-blush-deep">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The label text comes from CSS `content`, not the DOM, so autofill
 * heuristics can't recognise "Kortnummer" and offer a saved card.
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span
        data-label={label}
        className="px-4 text-[13px] before:content-[attr(data-label)]"
      />
      {children}
    </label>
  );
}

function Consent({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        autoComplete="off"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-blush-deep"
      />
      <span>{children}</span>
    </label>
  );
}
