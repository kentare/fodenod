import type { StepId } from "@/app/steps";

/** Keyboard shortcuts, as a floating card in the top-right corner. */
const SHORTCUTS = [{ keys: "@", action: "starter tale-til-tekst" }] as const;

export function ShortcutsBox({ current }: { current: StepId }) {
  if (current === "loading") return null;

  return (
    <div
      aria-hidden
      className="fixed top-16 right-4 z-40 rounded-2xl border border-blush-deep bg-paper px-4 py-3 text-xs text-ink"
    >
      <p className="mb-2 font-medium text-blush-deep">Snarveier</p>
      <ul className="flex flex-col gap-1">
        {SHORTCUTS.map(({ keys, action }) => (
          <li key={keys} className="flex items-center gap-2">
            <kbd className="rounded-md border border-blush bg-blush-soft px-1.5 font-sans">
              {keys}
            </kbd>
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
