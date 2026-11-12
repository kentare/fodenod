"use client";

import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";

const HOW_IT_WORKS = [
  "Registrer deg og bekreft graviditeten.",
  "Velg transportmiddel.",
  "Vi bringer deg trygt til fødeavdelingen.",
] as const;

/** A calm, professional landing page: what the app is for, then one way on. */
export function IntroStep({ next }: StepProps) {
  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-1 flex-col items-center justify-center px-6 py-16 text-ink"
    >
      <div className="flex w-[min(440px,100%)] flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-extralight tracking-tight text-blush-deep">
            Transport til fødeavdelingen
          </h1>
          <p className="text-sm leading-relaxed">
            Du er gravid og trenger å komme deg til sykehuset. fødenød bestiller
            transporten for deg, raskt og enkelt.
          </p>
        </div>

        <ol className="flex w-full flex-col gap-2 text-left text-sm">
          {HOW_IT_WORKS.map((text, i) => (
            <li
              key={text}
              className="flex items-center gap-3 rounded-2xl border border-blush-soft bg-paper px-4 py-3"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blush-soft text-xs text-blush-deep">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>

        <FakeButton
          onClick={next}
          className="rounded-full bg-blush px-10 py-3 text-sm font-medium text-paper"
        >
          Kom i gang
        </FakeButton>
      </div>
    </main>
  );
}
