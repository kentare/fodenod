"use client";

import { useEffect, useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";
import { rand } from "@/lib/random";
import { formatNok, TRANSPORTS } from "@/steps/transport-options";

/** Roughly 1.8s per slide, with a little wobble so it can't be timed. */
const MIN_SLIDE_MS = 1500;
const MAX_SLIDE_MS = 2100;
const REFUSAL_MS = 4000;

const REFUSALS = [
  "Ambulansen er dessverre utsolgt. Prøv igjen om 6–8 uker.",
  "Utsolgt. Har du vurdert å føde litt senere?",
  "Alle ambulanser er opptatt med å stå i kø ved Ikea.",
  "Utsolgt. Du er satt på venteliste (plass nr. 4 812).",
  "Feil 0x00AMB: Ambulanse ikke funnet. Kontakt systemansvarlig.",
] as const;

/**
 * A carousel that never stops moving. Only one option is visible at a time,
 * it auto-advances with no pause (WCAG 2.2.2), the icon-only arrows are tiny
 * and don't reset the timer, and the only free option is sold out. The real
 * action is a ghost link; the filled pink pill "sorts by popularity", which
 * just jumps back to the sold-out ambulance.
 */
export function TransportStep({ next, setData }: StepProps) {
  const [index, setIndex] = useState(0);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setIndex((i) => (i + 1) % TRANSPORTS.length);
      timer = setTimeout(tick, rand(MIN_SLIDE_MS, MAX_SLIDE_MS));
    };
    timer = setTimeout(tick, rand(MIN_SLIDE_MS, MAX_SLIDE_MS));
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!refusal) return;
    const timer = setTimeout(() => setRefusal(null), REFUSAL_MS);
    return () => clearTimeout(timer);
  }, [refusal]);

  const step = (delta: number) =>
    setIndex((i) => (i + delta + TRANSPORTS.length) % TRANSPORTS.length);

  const pick = () => {
    const option = TRANSPORTS[index];
    if (option.soldOut) {
      const tries = attempts + 1;
      setAttempts(tries);
      setRefusal(
        tries >= 3
          ? `Du har nå prøvd ${tries} ganger. Dette er notert i journalen din.`
          : REFUSALS[Math.floor(Math.random() * REFUSALS.length)],
      );
      return;
    }
    setData({ transport: option.id });
    next();
  };

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-16 text-ink"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <h1 className="text-3xl font-light tracking-tight text-blush-deep">
          Velg transport
        </h1>

        <div className="relative w-full overflow-hidden rounded-2xl border border-blush-deep bg-blush-soft">
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {TRANSPORTS.map((t) => (
              <div
                key={t.id}
                className="flex w-full shrink-0 flex-col items-center gap-1 px-8 py-10 text-center"
              >
                <span className="text-6xl">{t.emoji}</span>
                <span className="mt-3 text-base">{t.name}</span>
                <span className="text-[10px] text-ink-faint">{t.blurb}</span>
                <span className="text-xs">
                  {t.price === 0 ? "Gratis" : formatNok(t.price)}
                </span>
                {/* Sold out is a whisper, not a state. */}
                {t.soldOut && (
                  <span className="mt-1 rounded-full border border-ink-faint px-2 text-[9px] text-ink-faint">
                    utsolgt
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Icon-only arrows that don't reset the auto-advance. */}
          <FakeButton
            onClick={() => step(-1)}
            className="absolute bottom-2 left-3 text-[10px] leading-none text-ink-faint"
          >
            ‹
          </FakeButton>
          <FakeButton
            onClick={() => step(1)}
            className="absolute bottom-2 right-3 text-[10px] leading-none text-ink-faint"
          >
            ›
          </FakeButton>
        </div>

        {/* Colour is the only thing that marks the current slide. */}
        <div className="flex gap-1.5">
          {TRANSPORTS.map((t, i) => (
            <span
              key={t.id}
              className={`h-1 w-1 rounded-full ${
                i === index ? "bg-blush-deep" : "bg-blush"
              }`}
            />
          ))}
        </div>

        {/* The wrong action wears the primary pill. */}
        <FakeButton
          onClick={() => setIndex(0)}
          className="w-full rounded-full bg-blush py-3 text-center text-sm text-paper"
        >
          Sorter etter popularitet
        </FakeButton>
        <FakeButton onClick={pick} className="-mt-3 text-xs text-ink">
          velg denne
        </FakeButton>

        <p className="h-8 text-center text-xs text-blush-deep">{refusal}</p>

        <p className="text-center text-[9px] leading-snug text-ink-faint">
          Tilbudet gjelder alternativet som vises på klikktidspunktet. Bytte og
          retur er ikke mulig etter fødsel. Du har allerede betalt for
          helikopter. Ingen refusjon.
        </p>
      </div>
    </main>
  );
}
