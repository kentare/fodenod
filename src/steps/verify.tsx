"use client";

import { useEffect, useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";
import { rand, shuffle } from "@/lib/random";

/** 🫃 counts too: a callback to the "are you the pregnant one?" step. */
const PREGNANT = ["🤰", "🫃", "🫄"] as const;
const DECOYS = ["🍉", "🎈", "🏀", "🍺", "🥚", "🐋", "🌍"] as const;
const GRID_SIZE = 9;
/** On this attempt we give up and let anything through. */
const MERCY_ATTEMPT = 3;
const MERCY_DELAY_MS = 1600;
/** WCAG 2.2.1 fail: the error vanishes before you've finished reading it. */
const ERROR_VISIBLE_MS = 1800;

type Tile = {
  emoji: string;
  pregnant: boolean;
  rotate: number;
  blur: number;
  scale: number;
};

type Verdict = "wrong" | "mercy" | "speech" | null;

function makeTiles(): Tile[] {
  const pregnantCount = Math.floor(rand(2, 5)); // 2–4 bellies per round
  const bellies = Array.from({ length: pregnantCount }, () => ({
    emoji: PREGNANT[Math.floor(Math.random() * PREGNANT.length)],
    pregnant: true,
  }));
  const decoys = shuffle(DECOYS)
    .slice(0, GRID_SIZE - pregnantCount)
    .map((emoji) => ({ emoji, pregnant: false }));

  return shuffle([...bellies, ...decoys]).map((tile) => ({
    ...tile,
    rotate: rand(-40, 40),
    blur: rand(1, 2.4),
    scale: rand(0.75, 1.3),
  }));
}

/**
 * WCAG 1.1.1: the audio alternative reads the Norwegian instructions with a
 * Japanese voice (matching `lang="ja"`), at a pace nobody can follow.
 */
function speakInstructions() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }
  const utterance = new SpeechSynthesisUtterance(
    "Velg alle bilder med en gravid mage. Eller ikke. Vi hører ikke etter.",
  );
  utterance.lang = "ja-JP";
  utterance.rate = 2.4;
  utterance.pitch = 0.1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function VerifyStep({ next }: StepProps) {
  // Shuffled in the initializer: this step only ever mounts on the client.
  const [tiles, setTiles] = useState(makeTiles);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [verdict, setVerdict] = useState<Verdict>(null);

  // Third strike: roll eyes, then let them through anyway.
  useEffect(() => {
    if (verdict !== "mercy") return;
    const timer = setTimeout(next, MERCY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [verdict, next]);

  // Transient messages disappear on their own schedule, not the user's.
  useEffect(() => {
    if (verdict !== "wrong" && verdict !== "speech") return;
    const timer = setTimeout(() => setVerdict(null), ERROR_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [verdict, attempts]);

  const locked = verdict === "mercy";

  const toggle = (index: number) => {
    if (locked) return;
    setSelected((current) => {
      const updated = new Set(current);
      if (!updated.delete(index)) updated.add(index);
      return updated;
    });
  };

  const reshuffle = () => {
    setTiles(makeTiles());
    setSelected(new Set());
  };

  const confirm = () => {
    if (locked) return;
    const correct = tiles.every((tile, i) => tile.pregnant === selected.has(i));
    if (correct) {
      next();
      return;
    }
    const attempt = attempts + 1;
    setAttempts(attempt);
    if (attempt >= MERCY_ATTEMPT) {
      setVerdict("mercy");
      return;
    }
    reshuffle();
    setVerdict("wrong");
  };

  const audio = () => {
    if (locked) return;
    setVerdict(speakInstructions() ? null : "speech");
  };

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-6 text-ink">
      <div className="relative w-[326px] rounded-2xl border border-blush-soft bg-paper px-5 pt-6 pb-4">
        {/* WCAG 2.5.3 + 4.1.2: an unlabeled "close" icon that just gives you new pictures. */}
        <FakeButton
          onClick={reshuffle}
          className="absolute top-2 right-3 text-sm leading-none font-extralight text-ink-faint"
        >
          ×
        </FakeButton>

        <div className="pb-4">
          {/* WCAG 1.4.3: pale pink instructions, mid-sentence italics. */}
          <p className="text-[11px] leading-snug font-light">
            Velg alle bilder med en <i>gravid mage</i>. Klikk «Bekreft» når det
            ikke er flere igjen.
          </p>
          <p className="mt-1 text-[8px] text-ink-faint">
            Forsøk {Math.min(attempts + 1, MERCY_ATTEMPT)} av 2
          </p>
        </div>

        {/* WCAG 1.1.1 + 1.4.1: unlabeled pictures; selection is a faint tint. */}
        <div aria-hidden className="grid grid-cols-3 gap-1.5">
          {tiles.map((tile, i) => {
            const isSelected = selected.has(i);
            return (
              <div
                key={`${attempts}-${i}`}
                onClick={() => toggle(i)}
                className={`flex aspect-square items-center justify-center overflow-hidden rounded-xl border ${
                  isSelected
                    ? "border-blush bg-blush-soft opacity-[0.88]"
                    : "border-blush-soft bg-blush-soft"
                }`}
              >
                <span
                  className="select-none text-[44px] leading-none"
                  style={{
                    transform: `rotate(${tile.rotate}deg) scale(${tile.scale})`,
                    filter: `blur(${tile.blur}px) saturate(0.6)`,
                  }}
                >
                  {tile.emoji}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* The inviting primary pill throws away your selection. */}
            <FakeButton
              onClick={reshuffle}
              className="rounded-full bg-blush px-4 py-1.5 text-[11px] text-paper"
            >
              nye bilder
            </FakeButton>
            <FakeButton onClick={audio} className="text-[9px] text-ink-faint">
              lydversjon
            </FakeButton>
          </div>
          {/* WCAG 2.5.8: tiny target, tucked in the corner, looks like plain text. */}
          <FakeButton onClick={confirm} className="text-[10px] text-ink-faint">
            Bekreft
          </FakeButton>
        </div>

        <div className="mt-2 h-4 text-[10px]">
          {verdict === "wrong" && (
            <span className="text-[#ea8cad]">Feil. Prøv igjen.</span>
          )}
          {verdict === "mercy" && <span>Greit nok. 🙄</span>}
          {verdict === "speech" && (
            <span className="text-ink-faint">
              Lyd er ikke tilgjengelig. Prøv å lytte hardere.
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
