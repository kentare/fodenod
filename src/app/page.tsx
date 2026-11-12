"use client";

import { type ComponentType, useCallback, useEffect, useState } from "react";
import { DevPanel } from "@/components/dev-panel";
import { LoadingStep } from "@/components/flash-loader";
import { CornerLogo } from "@/components/logo";
import { ShortcutsBox } from "@/components/shortcuts-box";
import { Snow } from "@/components/snow";
import { StepIndicator } from "@/components/step-indicator";
import { Toast } from "@/components/toast";
import { CheckoutStep } from "@/steps/checkout";
import { EndStep } from "@/steps/end";
import { IntroStep } from "@/steps/intro";
import { PaymentStep } from "@/steps/payment";
import { RegisterStep } from "@/steps/register";
import { TermsStep } from "@/steps/terms";
import { TransportStep } from "@/steps/transport";
import { VerifyStep } from "@/steps/verify";
import { type FlowData, STEPS, type StepId, type StepProps } from "./steps";

const SCREENS: Record<StepId, ComponentType<StepProps>> = {
  loading: LoadingStep,
  intro: IntroStep,
  payment: PaymentStep,
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

  // Bumped to show the toast again.
  const [toastId, setToastId] = useState(0);

  // Shortcut "1": back to the landing page ("step 1"), keeping flow data.
  // Ignored while typing in a field, like the other shortcuts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "1" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      )
        return;
      jump("intro");
      setToastId((n) => n + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jump]);

  const Screen = SCREENS[step];
  return (
    <>
      <Screen
        key={`${step}-${runId}`}
        next={next}
        restart={restart}
        goTo={jump}
        data={data}
        setData={setData}
      />
      <CornerLogo current={step} />
      <StepIndicator current={step} />
      <ShortcutsBox current={step} />
      <Snow />
      <Toast id={toastId} message="Du navigerte tilbake til steg 1" />
      <DevPanel current={step} onJump={jump} />
    </>
  );
}
