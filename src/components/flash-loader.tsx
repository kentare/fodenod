"use client";

import { useEffect, useState } from "react";
import type { StepProps } from "@/app/steps";
import { Logo } from "@/components/logo";
import { rand } from "@/lib/random";

const MIN_DURATION_MS = 5000;
const MAX_DURATION_MS = 10000;

/** Each quip stays up just a bit shorter than it takes to read it. */
const MIN_QUIP_MS = 1200;
const MAX_QUIP_MS = 2500;
const QUIP_FADE_MS = 200;

const QUIPS = [
  "Teller rier…",
  "Varmer opp vannet…",
  "Ringer svigermor…",
  "Leter etter bilnøklene…",
  "Bekrefter at du fortsatt er gravid…",
  "Laster inn morkake…",
  "Pumper dekk på elsparkesykkelen…",
  "Venter på at jordmora blir ferdig med lunsjen…",
  "Kalibrerer pusteøvelser…",
  "Oppdaterer vilkårene (igjen)…",
  "Komprimerer babyen…",
  "Installerer fødselsdriver 2.0…",
  "Måler åpning i centimeter (avrundet ned)…",
  "Pakker sykehusbagen for deg (glemmer tannbørsten)…",
  "Spør babyen om den kan vente litt…",
  "Synkroniserer veer med skyen…",
  "Forhandler parkeringsavgift med sykehuset…",
  "Varmer opp epiduralen…",
  "Defragmenterer navnelista…",
  "Sjekker om pappa har besvimt…",
  "Laster ned mer fostervann…",
  "Venter på ledig fødestue i Vardø…",
];

function randomQuip(current: number) {
  // Repeats are fine, just not twice in a row (it would look frozen).
  let next = current;
  while (next === current) next = Math.floor(Math.random() * QUIPS.length);
  return next;
}

/**
 * Picks the next displayed progress. It loosely follows real elapsed time,
 * but stalls, leaps ahead and occasionally slips backwards so the user
 * can never predict when it'll finish.
 */
function nextProgress(current: number, ideal: number) {
  const roll = Math.random();
  let next: number;
  if (roll < 0.25) {
    next = current; // stall
  } else if (roll < 0.35) {
    next = current - rand(1, 5); // slip backwards
  } else if (roll < 0.5) {
    next = Math.max(current, ideal) + rand(5, 20); // sudden leap
  } else {
    next = ideal + rand(-8, 8); // wobble around the truth
  }
  return Math.min(99, Math.max(0, Math.round(next)));
}

export function FlashLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = rand(MIN_DURATION_MS, MAX_DURATION_MS);
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= duration) {
        setProgress(100);
        timer = setTimeout(onComplete, 400);
        return;
      }
      setProgress((p) => nextProgress(p, (elapsed / duration) * 100));
      timer = setTimeout(tick, Math.min(rand(60, 700), duration - elapsed));
    };

    timer = setTimeout(tick, rand(200, 600));
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-paper font-sans"
    >
      <div className="h-6 w-6 animate-spin rounded-full border border-blush-soft border-t-blush-deep" />

      <div className="flex flex-col items-center gap-4">
        <Logo size={152} />
        <h1 className="text-5xl font-extralight tracking-tight text-blush-deep">
          fødenød
        </h1>
      </div>

      <div className="flex w-[min(480px,80vw)] flex-col items-end gap-2">
        {/* No width transition: every stall, leap and slip must be visible. */}
        <div className="h-6 w-full overflow-hidden rounded-full border border-blush-deep bg-blush-soft">
          <div className="h-full rounded-full bg-blush-deep" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs tabular-nums text-ink">{progress}%</span>
      </div>

      <LoadingQuip />
    </div>
  );
}

/** A one-liner that swaps itself out at random, just before you finish reading it. */
function LoadingQuip() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const swap = () => {
      setVisible(false);
      timer = setTimeout(() => {
        setIndex(randomQuip);
        setVisible(true);
        timer = setTimeout(swap, rand(MIN_QUIP_MS, MAX_QUIP_MS));
      }, QUIP_FADE_MS);
    };

    timer = setTimeout(swap, rand(MIN_QUIP_MS, MAX_QUIP_MS));
    return () => clearTimeout(timer);
  }, []);

  return (
    <p
      className="-mt-4 h-4 text-center text-xs text-ink transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {QUIPS[index]}
    </p>
  );
}

export function LoadingStep({ next }: StepProps) {
  return <FlashLoader onComplete={next} />;
}
