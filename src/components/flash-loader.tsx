"use client";

import { useEffect, useState } from "react";
import type { StepProps } from "@/app/steps";
import { rand } from "@/lib/random";

const MIN_DURATION_MS = 5000;
const MAX_DURATION_MS = 10000;
const DOTS = 12;

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
    <div aria-hidden className="flash-stage fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#111] font-retro text-[#e8e8e8]">
      <div className="relative h-20 w-20">
        {Array.from({ length: DOTS }, (_, i) => (
          <span
            key={i}
            className="flash-dot absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-[#ff6a00]"
            style={{
              transform: `rotate(${(360 / DOTS) * i}deg)`,
              transformOrigin: "50% 40px",
              animationDelay: `${(-1.2 / DOTS) * (DOTS - i)}s`,
            }}
          />
        ))}
      </div>

      <h1 className="text-2xl tracking-widest text-[#ff6a00] drop-shadow-[2px_2px_0_#5a1e00]">
        fødenød
      </h1>

      <div className="flex w-[min(320px,80vw)] flex-col gap-2">
        <div className="h-4 border-2 border-[#e8e8e8] p-[2px]">
          <div
            className="h-full bg-gradient-to-r from-[#ff6a00] to-[#ffd000]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[7px] text-[#333]">
          <span className="flash-blink">LOADING</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}

export function LoadingStep({ next }: StepProps) {
  return <FlashLoader onComplete={next} />;
}
