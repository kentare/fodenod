"use client";

import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";

// TODO: placeholder, replace with the real (terrible) step.
export function TransportStep({ next }: StepProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Velg transport</h1>
      <FakeButton onClick={next} className="bg-[#ddd] px-4 py-2 text-[#bbb]">
        neste
      </FakeButton>
    </main>
  );
}
