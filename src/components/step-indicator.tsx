import { STEPS, type StepId } from "@/app/steps";

/** Every step except the loader, which gets no indicator at all. */
const VISIBLE_STEPS = STEPS.filter((s) => s.id !== "loading");

/**
 * A slim, label-less progress strip pinned to the top of the page.
 *
 * WCAG zero: the current step is marked only by a slightly deeper pink
 * (1.4.1), done and upcoming steps look identical, and the whole thing is
 * hidden from assistive tech. The "Steg N av M" counter lies: M is always
 * N + 2, so the end never gets any closer.
 */
export function StepIndicator({ current }: { current: StepId }) {
  const index = VISIBLE_STEPS.findIndex((s) => s.id === current);
  if (index === -1) return null;

  const position = index + 1;
  const fakeTotal = position + 2;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex h-7 justify-center"
    >
      {/* White backing only behind the pills, so full-width content at the
          very top (e.g. the end screen's ticker) stays visible either side. */}
      <div className="flex items-center gap-3 rounded-b-2xl bg-paper px-4">
        <div className="flex items-center gap-1.5">
          {VISIBLE_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 w-4 rounded-full transition-colors duration-700 ${
                i === index ? "bg-blush-deep" : "bg-blush"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-ink-faint">
          Steg {position} av {fakeTotal}
        </span>
      </div>
    </div>
  );
}
