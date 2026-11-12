"use client";

import { type MouseEvent, useEffect, useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";
import { rand } from "@/lib/random";

/** "Nei" gives up running after this many dodges, so it can always be caught. */
const MAX_DODGES = 5;
const DODGE_X = 220;
const DODGE_Y = 140;
/** Keep at least this far from the viewport edge. */
const EDGE = 8;
/** A dodge only counts if it lands at least this far from the cursor. */
const MIN_ESCAPE = 90;
const HANDOVER_WAIT_S = 7;

type Offset = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Picks a new on-screen offset for the "nei" button, away from the cursor. */
function escapeOffset(el: HTMLElement, current: Offset, cursor: Offset): Offset {
  const rect = el.getBoundingClientRect();
  // Where the button sits with no offset applied.
  const homeX = rect.left - current.x;
  const homeY = rect.top - current.y;
  let best = current;
  for (let i = 0; i < 10; i++) {
    const x = clamp(
      rand(-DODGE_X, DODGE_X),
      EDGE - homeX,
      window.innerWidth - rect.width - EDGE - homeX,
    );
    const y = clamp(
      rand(-DODGE_Y, DODGE_Y),
      EDGE - homeY,
      window.innerHeight - rect.height - EDGE - homeY,
    );
    best = { x, y };
    const centerX = homeX + x + rect.width / 2;
    const centerY = homeY + y + rect.height / 2;
    if (Math.hypot(centerX - cursor.x, centerY - cursor.y) >= MIN_ESCAPE) break;
  }
  return best;
}

export function PregnantStep({ next }: StepProps) {
  const [blocked, setBlocked] = useState(false);
  const [dodges, setDodges] = useState(0);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });

  const dodge = (e: MouseEvent<HTMLDivElement>) => {
    if (dodges >= MAX_DODGES) return;
    setOffset(
      escapeOffset(e.currentTarget, offset, { x: e.clientX, y: e.clientY }),
    );
    setDodges((d) => d + 1);
  };

  const backToQuestion = () => {
    // Fresh start: "nei" gets all its dodges back.
    setBlocked(false);
    setDodges(0);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <main
      aria-hidden
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-paper p-8 font-sans"
    >
      <h1 className="text-5xl font-extralight tracking-tight text-blush-deep">
        Er du den gravide?
      </h1>
      <p className="-mt-3 text-[10px] text-ink-faint">
        Vi må dessverre spørre. Av juridiske årsaker.
      </p>

      <FakeButton
        onClick={() => setBlocked(true)}
        className="mt-10 animate-bounce rounded-full bg-blush px-20 py-6 text-center text-4xl font-light tracking-widest text-paper"
      >
        JA
        <span className="block text-[10px] font-normal tracking-normal text-blush-soft">
          (anbefalt)
        </span>
      </FakeButton>

      <FakeButton
        onMouseEnter={dodge}
        onClick={next}
        className="ml-64 text-[9px] text-ink-faint transition-transform duration-150 ease-out"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        nei
      </FakeButton>

      <p className="absolute bottom-3 left-3 max-w-xs text-[8px] leading-tight text-ink-faint">
        Ved å trykke JA bekrefter du at du ikke er den gravide. Ved å trykke nei
        bekrefter du ingenting.
      </p>

      {blocked && <HandoverOverlay onDone={backToQuestion} />}
    </main>
  );
}

function HandoverOverlay({ onDone }: { onDone: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(HANDOVER_WAIT_S);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const confirmHandover = () => {
    // Inverted confirm: OK is the wrong answer.
    const stillPregnant = window.confirm(
      "Bekreft at du IKKE er gravid.\n\nOK = Jeg er gravid\nAvbryt = Jeg er ikke gravid",
    );
    if (stillPregnant) setSecondsLeft(HANDOVER_WAIT_S);
    else onDone();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-paper p-8 text-center">
      <div className="text-6xl">🤰➡️📱➡️🧍</div>
      <h2 className="text-4xl font-extralight tracking-tight text-blush-deep">
        Du kan ikke bestille selv.
      </h2>
      <p className="max-w-sm text-sm text-ink">
        Finn en person som ikke er gravid og gi telefonen til dem.
      </p>
      {secondsLeft > 0 ? (
        <p className="text-[10px] tabular-nums text-ink-faint">
          Venter på overlevering … {secondsLeft}
        </p>
      ) : (
        <FakeButton
          onClick={confirmHandover}
          className="text-[10px] text-ink-faint"
        >
          Jeg har funnet en ikke-gravid person
        </FakeButton>
      )}
    </div>
  );
}
