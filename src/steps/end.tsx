"use client";

import { useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";
import { getTransport } from "@/steps/transport-options";

/** Characters picked to be as confusable as possible. */
const CONFUSABLE = "0OoQDl1Ii|5SsZ2B8";
const STARS = 5;

function randomOrderNumber() {
  const group = () =>
    Array.from(
      { length: 7 },
      () => CONFUSABLE[Math.floor(Math.random() * CONFUSABLE.length)],
    ).join("");
  return Array.from({ length: 6 }, group).join("-");
}

export function EndStep({ data, restart }: StepProps) {
  const transport = getTransport(data.transport);
  const [orderNumber] = useState(randomOrderNumber);
  const [hovered, setHovered] = useState<number | null>(null);
  const [rated, setRated] = useState(false);
  const [cancelTried, setCancelTried] = useState(false);
  const [trackTried, setTrackTried] = useState(false);

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-1 flex-col items-center px-4 pt-20 pb-10 text-ink"
    >
      {/* A <marquee> in spirit; JSX doesn't type the real element anymore.
          Slow, smooth drift only: nothing here flashes (WCAG 2.3.1 hard limit). */}
      <style>{`@keyframes end-ticker { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }`}</style>
      <div className="mb-16 w-full overflow-hidden border-b border-blush-soft py-1.5 text-[12px] whitespace-nowrap text-ink-faint">
        <div className="inline-block animate-[end-ticker_30s_linear_infinite]">
          Estimert ankomst: 3–40 virkedager · Takk for at du valgte fødenød · Vi
          gjør vårt beste (resultatene kan variere)
        </div>
      </div>

      <div className="flex w-[min(480px,92vw)] flex-col items-center gap-12 text-center">
        <section>
          <p className="text-xs">Hei {data.name ?? "{{fornavn}}"},</p>
          <h1 className="mt-3 text-3xl leading-tight font-extralight text-blush-deep">
            Gratulerer! Din {transport.name.toLowerCase()} {transport.emoji} er
            bestilt.
          </h1>
        </section>

        <section className="text-sm font-light">
          Estimert ankomst: 3–40 virkedager
          <p className="mt-1 text-[10px] text-ink-faint">
            (lørdag, søndag, helligdager og fullmåne regnes ikke som virkedager)
          </p>
        </section>

        <section>
          <p className="text-[12px]">Ordrenummer (oppgi ved alle henvendelser):</p>
          <p className="mt-1 text-[13px] tracking-tighter break-all text-ink-faint italic">
            {orderNumber}
          </p>
        </section>

        <section>
          <p className="text-xs">Hvordan var din opplevelse?</p>
          {/* Backwards: leftmost star is the worst, and highlighting fills
              from the right. Pink on pink, so colour is the only cue. */}
          <div className="mx-auto mt-2 w-fit">
            <div
              className="flex gap-1 text-3xl"
              onMouseLeave={() => setHovered(null)}
            >
              {Array.from({ length: STARS }, (_, i) => (
                <FakeButton
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onClick={() => setRated(true)}
                  className={
                    hovered !== null && i >= hovered
                      ? "text-blush"
                      : "text-blush-soft"
                  }
                >
                  ★
                </FakeButton>
              ))}
            </div>
            <div className="flex justify-between px-1 text-[9px] text-ink-faint">
              <span>dårligst</span>
              <span>best?</span>
            </div>
          </div>
          {rated && (
            <p className="mt-3 text-xs">
              Takk for din 1-stjernes vurdering! Vi beklager at du ikke var
              fornøyd. Vurderingen er videresendt til jordmoren din.
            </p>
          )}
        </section>

        <section>
          {/* The big inviting pill does nothing useful. */}
          <FakeButton
            onClick={() => setTrackTried(true)}
            className="mx-auto w-fit rounded-full bg-blush px-10 py-3 text-sm tracking-wide text-paper"
          >
            Spor sjåføren
          </FakeButton>
          {trackTried && (
            <p className="mt-3 text-[12px]">
              Sporing er tilgjengelig fra og med 2031. Prøv å se ut av vinduet.
            </p>
          )}
        </section>

        <div className="text-[12px] text-ink-faint">
          {cancelTried ? (
            "Avbestilling må skje senest 72 timer før fødselen."
          ) : (
            <FakeButton onClick={() => setCancelTried(true)} className="inline">
              Har du allerede født? Avbestill her
            </FakeButton>
          )}
        </div>
      </div>

      <FakeButton
        onClick={restart}
        className="mt-16 self-start text-[10px] text-ink-faint"
      >
        Start på nytt
      </FakeButton>
    </main>
  );
}
