import { STEPS, type StepId } from "@/app/steps";

/** Every step except the loader, which gets no indicator at all. */
const VISIBLE_STEPS = STEPS.filter((s) => s.id !== "loading");

/** How many steps it takes the ambulance to drive one track length. */
const STEPS_PER_TRACK = 3;

/**
 * A slim "home → hospital" journey strip pinned to the top of the page.
 *
 * The flow has 8 steps, but the track only has two points, and the ambulance
 * (reversing, since 🚑 faces left) overshoots: it reaches the hospital around
 * step 4, then keeps driving and leaves the screen. The counter claims there
 * are only 2 steps, so you end up on "Steg 5 av 2".
 *
 * WCAG zero: colour/position is the only signal (1.4.1), nothing is exposed
 * to assistive tech, and the "progress" is a lie.
 */
export function StepIndicator({ current }: { current: StepId }) {
  const index = VISIBLE_STEPS.findIndex((s) => s.id === current);
  if (index === -1) return null;

  const position = index + 1;
  const progress = index / STEPS_PER_TRACK;

  return (
    // Full width + overflow-hidden clips the ambulance once it overshoots,
    // so it never causes horizontal scrolling.
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex h-7 justify-center overflow-hidden"
    >
      {/* White backing only behind the strip itself, so full-width content at
          the very top (e.g. the end screen's ticker) stays visible either side. */}
      <div className="flex items-center gap-2 rounded-b-2xl bg-paper px-4 text-[10px] text-ink-faint">
        <span className="mr-2 whitespace-nowrap">Steg {position} av 2</span>
        <span>🏠</span>
        <div className="relative h-px w-[40vw] bg-blush">
          <span className="absolute top-1/2 left-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blush-deep" />
          <span className="absolute top-1/2 right-0 size-1.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-blush-deep" />
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm leading-none transition-[left] duration-1000 ease-in-out"
            style={{ left: `${progress * 100}%` }}
          >
            🚑
          </span>
        </div>
        <span>🏥</span>
      </div>
    </div>
  );
}
