"use client";

import { useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";
import { shuffle } from "@/lib/random";

const FNR_LENGTH = 11;
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const PHONE_MAX = 99_999_999;
/** Anything below this has fewer than 8 digits (even though we pad it to look fine). */
const PHONE_MIN_VALID = 10_000_000;

/**
 * Base border colour for every field. Invalid fields get a pink with the
 * faintest hint of red, so colour is the only (barely visible) signal (WCAG 1.4.1).
 */
const OK = "border-blush";
const BAD = "border-[#f397b8]";

/** Each digit picker gets its own order, so muscle memory never helps. */
function shuffledDigitOrders() {
  return Array.from({ length: FNR_LENGTH }, () => shuffle(DIGITS));
}

function emptyFnr() {
  return Array<string>(FNR_LENGTH).fill("");
}

export function RegisterStep({ next, setData }: StepProps) {
  // Lazy initializer: the step is never server-rendered, and this keeps the
  // shuffle out of the render body itself.
  const [orders, setOrders] = useState(shuffledDigitOrders);
  const [name, setName] = useState("");
  const [fnr, setFnr] = useState(emptyFnr);
  const [phone, setPhone] = useState(0);
  // Only recomputed on "send", so fixed fields stay "wrong" until the next try.
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState(false);

  const border = (field: string) => (invalid.has(field) ? BAD : OK);

  function setDigit(index: number, digit: string) {
    setFnr((current) => current.map((d, i) => (i === index ? digit : d)));
  }

  function reset() {
    setOrders(shuffledDigitOrders());
    setName("");
    setFnr(emptyFnr());
    setPhone(0);
    setInvalid(new Set());
    setFailed(false);
  }

  function submit() {
    const bad = new Set<string>();
    if (!name.trim()) bad.add("name");
    fnr.forEach((digit, i) => {
      if (digit === "") bad.add(`fnr-${i}`);
    });
    if (phone < PHONE_MIN_VALID) bad.add("phone");

    if (bad.size === 0) {
      setData({ name: name.trim() });
      next();
      return;
    }
    setInvalid(bad);
    setFailed(true);
  }

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-1 flex-col items-center justify-center bg-paper p-6 text-ink"
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

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Fullt navn"
          autoComplete="off"
          spellCheck={false}
          className={`w-full rounded-full border ${border("name")} bg-blush-soft px-4 py-2 text-sm font-light text-ink placeholder:text-ink-faint`}
        />

        <div>
          <div className="mb-1 pl-1 text-[9px] text-ink-faint">ddmmåå·iiikk</div>
          <div className="flex justify-between">
            {orders.map((order, i) => (
              <select
                key={i}
                value={fnr[i]}
                onChange={(e) => setDigit(i, e.target.value)}
                className={`w-[27px] appearance-none rounded-lg border ${border(`fnr-${i}`)} bg-blush-soft py-1.5 text-center text-xs text-ink`}
              >
                <option value="">–</option>
                {order.map((digit) => (
                  <option key={digit} value={digit}>
                    {digit}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <div className={`rounded-full border ${border("phone")} px-4 pt-2 pb-1`}>
          <input
            type="range"
            min={0}
            max={PHONE_MAX}
            value={phone}
            onChange={(e) => setPhone(Number(e.target.value))}
            className="h-px w-full appearance-none bg-blush [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blush-deep [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blush-deep"
          />
          <div className="text-right text-[7px] tabular-nums text-ink-faint">
            {String(phone).padStart(8, "0")}
          </div>
        </div>

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
