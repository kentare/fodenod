"use client";

import { useState } from "react";
import { STEPS, type StepId } from "@/app/steps";
import { SNOW_RESET_EVENT } from "@/components/snow";

/** Development-only step switcher. Renders nothing in production builds. */
export function DevPanel({
  current,
  onJump,
}: {
  current: StepId;
  onJump: (step: StepId) => void;
}) {
  const [open, setOpen] = useState(true);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div
      data-dev-panel
      className="fixed bottom-4 right-4 z-[1000] w-48 rounded border border-white/20 bg-black/85 font-mono text-[12px] text-white shadow-lg backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-bold"
      >
        <span>DEV · steps</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ol className="border-t border-white/20 p-1">
          {STEPS.map((step, i) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onJump(step.id)}
                className={`w-full rounded px-2 py-1 text-left hover:bg-white/15 ${
                  step.id === current ? "bg-white/25 font-bold" : ""
                }`}
              >
                {i + 1}. {step.label}
              </button>
            </li>
          ))}
        </ol>
      )}
      {open && (
        <div className="border-t border-white/20 p-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(SNOW_RESET_EVENT))}
            className="w-full rounded px-2 py-1 text-left hover:bg-white/15"
          >
            Reset snow
          </button>
        </div>
      )}
    </div>
  );
}
