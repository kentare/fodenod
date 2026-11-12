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

/** Base border colour for every field. Invalid fields get an almost identical red (WCAG 1.4.1). */
const RED = "border-[#d63a3a]";
const RED_ER = "border-[#c42121]";

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

  const border = (field: string) => (invalid.has(field) ? RED_ER : RED);

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
      className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[#efe8d6] bg-[radial-gradient(#d9cfb4_1px,transparent_1px)] [background-size:9px_9px] p-6 font-[Georgia,serif]"
    >
      {failed && (
        <p className="mb-3 text-[11px] italic text-[#b08a8a]">
          Noe gikk galt. (feil 0x1F4A9)
        </p>
      )}

      <div className="w-[min(380px,92vw)] border border-[#7a6fae] bg-[#fdfcf7] shadow-[6px_6px_0_#7a6fae]">
        <header className="flex items-end justify-between bg-gradient-to-b from-[#5b4b9a] to-[#3a2d6e] px-4 py-3 text-[#e9e4ff]">
          <div className="text-3xl italic tracking-tight">
            grav
            <span className="ml-0.5 inline-block -rotate-6 rounded-sm border-2 border-[#e9e4ff] px-1 text-xl not-italic font-bold">
              ID
            </span>
          </div>
          <div className="text-[10px] text-[#a99fd6]">Sikker innlogging*</div>
        </header>

        <div className="flex flex-col gap-4 px-4 py-5 text-[#9b94a8]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fullt navn"
            autoComplete="off"
            spellCheck={false}
            className={`w-full border-2 ${border("name")} bg-[#fffdf8] px-2 py-1 text-sm text-[#555] placeholder:text-[#d8d2c2]`}
          />

          <div>
            <div className="mb-1 text-[9px] text-[#cfc8b6]">ddmmåå·iiikk</div>
            <div className="flex gap-[2px]">
              {orders.map((order, i) => (
                <select
                  key={i}
                  value={fnr[i]}
                  onChange={(e) => setDigit(i, e.target.value)}
                  className={`w-[30px] appearance-none border ${border(`fnr-${i}`)} bg-[#fffdf8] py-1 text-center text-xs text-[#555]`}
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

          <div className={`border ${border("phone")} px-2 py-2`}>
            <input
              type="range"
              min={0}
              max={PHONE_MAX}
              value={phone}
              onChange={(e) => setPhone(Number(e.target.value))}
              className="w-full accent-[#d63a3a]"
            />
            <div className="text-right font-mono text-[7px] text-[#d8d2c2]">
              {String(phone).padStart(8, "0")}
            </div>
          </div>

          <FakeButton
            onClick={reset}
            className="mt-2 rounded-full bg-gradient-to-b from-[#7be05a] to-[#2f9e1a] py-4 text-center text-2xl font-black tracking-[0.2em] text-white shadow-[0_4px_0_#1f6e10] [text-shadow:1px_1px_0_#1f6e10] hover:brightness-110"
          >
            NULLSTILL
          </FakeButton>

          <div className="flex items-end justify-between">
            <span className="text-[8px] text-[#d8d2c2]">*ikke sikker</span>
            <FakeButton onClick={submit} className="text-[9px] text-[#bdb6c9]">
              send
            </FakeButton>
          </div>
        </div>
      </div>
    </main>
  );
}
