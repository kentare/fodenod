"use client";

import { useCallback, useState } from "react";
import { DevPanel } from "@/components/dev-panel";
import { FlashLoader } from "@/components/flash-loader";
import type { StepId } from "./steps";

export default function Home() {
  const [step, setStep] = useState<StepId>("loading");
  // Bumped on every jump so re-selecting a step restarts it (e.g. replays the loader).
  const [runId, setRunId] = useState(0);

  const goHome = useCallback(() => setStep("home"), []);
  const jump = useCallback((next: StepId) => {
    setStep(next);
    setRunId((n) => n + 1);
  }, []);

  return (
    <>
      {step === "loading" && <FlashLoader key={runId} onComplete={goHome} />}
      {step === "home" && (
        <main
          key={runId}
          className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <h1 className="text-4xl font-bold">fødenød</h1>
          <p>Loaded. The rest of the app goes here.</p>
        </main>
      )}
      <DevPanel current={step} onJump={jump} />
    </>
  );
}
