import type { TransportId } from "@/steps/transport-options";

/** Every screen in the flow, in order. Add new steps here; the dev panel picks them up. */
export const STEPS = [
  { id: "loading", label: "Loading screen" },
  { id: "intro", label: "Landing page" },
  { id: "payment", label: "Payment details" },
  { id: "terms", label: "Terms & conditions" },
  { id: "register", label: "Registration (gravID)" },
  { id: "verify", label: "Pregnancy verification" },
  { id: "checkout", label: "Checkout" },
  { id: "transport", label: "Mode of transport" },
  { id: "end", label: "End screen" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

/** The gravID step's form values. */
export type GravForm = { weight: string; age: string; email: string };

/** Data collected along the way, shared between steps. */
export type FlowData = {
  name?: string;
  /** Issued on the gravID step; must be typed back in at checkout. */
  gravId?: string;
  /** The gravID answers, kept so revisiting the step doesn't wipe them. */
  gravForm?: GravForm;
  transport?: TransportId;
};

export type StepProps = {
  /** Go to the next step in `STEPS` order. */
  next: () => void;
  /** Throw everything away and start over from the loading screen. */
  restart: () => void;
  data: FlowData;
  setData: (patch: Partial<FlowData>) => void;
};
