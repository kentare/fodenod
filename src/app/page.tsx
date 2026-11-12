"use client";

import { type ComponentType, useCallback, useState } from "react";
import { DevPanel } from "@/components/dev-panel";
import { LoadingStep } from "@/components/flash-loader";
import { Snow } from "@/components/snow";
import { StepIndicator } from "@/components/step-indicator";
import { CheckoutStep } from "@/steps/checkout";
import { EndStep } from "@/steps/end";
import { PaymentStep } from "@/steps/payment";
import { PregnantStep } from "@/steps/pregnant";
import { RegisterStep } from "@/steps/register";
import { TermsStep } from "@/steps/terms";
import { TransportStep } from "@/steps/transport";
import { VerifyStep } from "@/steps/verify";
import { type FlowData, STEPS, type StepId, type StepProps } from "./steps";

const SCREENS: Record<StepId, ComponentType<StepProps>> = {
  loading: LoadingStep,
  payment: PaymentStep,
  pregnant: PregnantStep,
  terms: TermsStep,
  register: RegisterStep,
  verify: VerifyStep,
  transport: TransportStep,
  checkout: CheckoutStep,
  end: EndStep,
};

export default function Home() {
  const [step, setStep] = useState<StepId>("loading");
  // Bumped on every jump/restart so re-entering a step remounts it fresh.
  const [runId, setRunId] = useState(0);
  const [data, setDataState] = useState<FlowData>({});

  const next = useCallback(() => {
    setStep((current) => {
      const i = STEPS.findIndex((s) => s.id === current);
      return STEPS[Math.min(i + 1, STEPS.length - 1)].id;
    });
  }, []);
  const jump = useCallback((to: StepId) => {
    setStep(to);
    setRunId((n) => n + 1);
  }, []);
  const restart = useCallback(() => {
    setDataState({});
    jump("loading");
  }, [jump]);
  const setData = useCallback(
    (patch: Partial<FlowData>) => setDataState((d) => ({ ...d, ...patch })),
    [],
  );

  const Screen = SCREENS[step];
  return (
    <>
      <Screen
        key={`${step}-${runId}`}
        next={next}
        restart={restart}
        data={data}
        setData={setData}
      />
      <StepIndicator current={step} />
      <Snow />
      <DevPanel current={step} onJump={jump} />
    </>
  );
}
