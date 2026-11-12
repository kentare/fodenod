import { STEPS, type StepId } from "@/app/steps";
import { HomeIcon, HospitalIcon } from "@/components/icons";
import { Logo } from "@/components/logo";

/** Every step except the loader and the landing page, which get no indicator. */
const VISIBLE_STEPS = STEPS.filter((s) => s.id !== "loading" && s.id !== "intro");

/**
 * Where the ambulance parks on the last step, in track lengths from home.
 * The track is 40vw wide and centred (the end icons are the same size), so
 * it starts at 30vw and the screen edge is 1.75 track lengths from home.
 * 1.66 parks the 38px mark just inside the edge (right side ~1253px at 1280).
 */
const EDGE = 1.66;

/**
 * Ambulance position for a step, in track lengths: home on step 1, straight
 * to the hospital on step 2, then small even steps towards the screen edge.
 */
function progressFor(index: number) {
  if (index <= 0) return 0;
  const after = VISIBLE_STEPS.length - 2; // steps after the hospital
  return 1 + (after > 0 ? ((index - 1) / after) * (EDGE - 1) : 0);
}

/**
 * A "home → hospital" journey strip pinned to the top of the page.
 *
 * The track only has two points, and the ambulance (the logo mark, mirrored
 * so it drives in reverse) gets to the hospital already on step 2, then keeps
 * inching past it towards the edge of the screen on every later step.
 *
 * WCAG zero: colour/position is the only signal (1.4.1), nothing is exposed
 * to assistive tech, and the "progress" is a lie.
 */
export function StepIndicator({ current }: { current: StepId }) {
  const index = VISIBLE_STEPS.findIndex((s) => s.id === current);
  if (index === -1) return null;

  const progress = progressFor(index);

  return (
    // Full width + overflow-hidden clips the ambulance once it overshoots,
    // so it never causes horizontal scrolling.
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex h-14 justify-center overflow-hidden"
    >
      {/* White backing only behind the strip itself, so full-width content at
          the very top (e.g. the end screen's ticker) stays visible either side. */}
      <div className="flex items-center gap-4 rounded-b-3xl bg-paper px-8 text-[23px] text-ink-faint">
        <HomeIcon size={26} />
        <div className="relative h-0.5 w-[40vw] bg-blush">
          <span className="absolute top-1/2 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blush-deep" />
          <span className="absolute top-1/2 right-0 size-3 translate-x-1/2 -translate-y-1/2 rounded-full bg-blush-deep" />
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-1000 ease-in-out"
            style={{ left: `${progress * 100}%` }}
          >
            <Logo size={38} className="block -scale-x-100" />
          </span>
        </div>
        <HospitalIcon size={26} />
      </div>
    </div>
  );
}
