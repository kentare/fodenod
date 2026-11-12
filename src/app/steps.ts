/** Every screen in the flow, in order. Add new steps here; the dev panel picks them up. */
export const STEPS = [
  { id: "loading", label: "Loading screen" },
  { id: "home", label: "Home" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];
