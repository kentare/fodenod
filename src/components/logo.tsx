import type { StepId } from "@/app/steps";

/*
 * Palette colours for the inline SVG. Tailwind only emits a `--color-*` var
 * on :root when something references it, so each one carries the same hex
 * as globals.css as a fallback.
 */
const PAPER = "var(--color-paper, #ffffff)";
const BLUSH = "var(--color-blush, #f4a6c6)";
const SOFT = "var(--color-blush-soft, #fbdce9)";
const DEEP = "var(--color-blush-deep, #e27aa6)";

/**
 * The fødenød mark: a pregnant ambulance. A side-view van whose underside
 * swells into a round belly between the wheels, with a medical cross, a
 * windscreen and a siren on the roof. Purely decorative.
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 50"
      width={size}
      height={(size * 50) / 64}
      className={className}
      fill="none"
      stroke={DEEP}
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Siren light + its glow lines */}
      <path d="M31 10.5V9a3 3 0 0 1 6 0v1.5" fill={DEEP} />
      <path d="M34 2.5v-0.01M28.5 4.5l1 1M39.5 4.5l-1 1" strokeWidth={1.75} />

      {/* Body: tall patient box, lower cab, round belly underneath */}
      <path
        d="M4 15a4.5 4.5 0 0 1 4.5-4.5H38a4 4 0 0 1 4 4V21h7.5a2 2 0 0 1 1.6.8l5.4 7.2
           a2 2 0 0 0 1 .7l1 .3a2.5 2.5 0 0 1 1.5 2.3V36a2.5 2.5 0 0 1-2.5 2.5H44
           C44 48.5 22 48.5 22 38.5H8.5A4.5 4.5 0 0 1 4 34Z"
        fill={BLUSH}
      />

      {/* Belly highlight and navel */}
      <path d="M27.5 42.5c2 1.6 4.6 2.4 7 2.4" stroke={SOFT} strokeWidth={1.75} />
      <path d="M33 40.5a1 1 0 1 0 1-1" strokeWidth={1.5} />

      {/* Cab window */}
      <path d="M45 24h4.2l4.3 5.8H45Z" fill={PAPER} strokeWidth={1.75} />

      {/* Medical cross */}
      <path d="M20.5 16.5h4v4h4v4h-4v4h-4v-4h-4v-4h4Z" fill={PAPER} strokeWidth={1.5} />

      {/* Wheels */}
      <circle cx="16" cy="39.5" r="5" fill={PAPER} />
      <circle cx="50" cy="39.5" r="5" fill={PAPER} />
      <circle cx="16" cy="39.5" r="1.2" fill={DEEP} stroke="none" />
      <circle cx="50" cy="39.5" r="1.2" fill={DEEP} stroke="none" />
    </svg>
  );
}

/** The mark with the "fødenød" wordmark beside it. */
export function LogoWordmark({
  size = 40,
  className = "",
  textClassName = "",
}: {
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div aria-hidden className={`flex items-center gap-2 ${className}`}>
      <Logo size={size} />
      <span className={`font-extralight tracking-tight text-blush-deep ${textClassName}`}>
        fødenød
      </span>
    </div>
  );
}

/** Small fixed top-left lockup on every step except the loader and the landing page. */
export function CornerLogo({ current }: { current: StepId }) {
  if (current === "loading" || current === "intro") return null;

  return (
    <LogoWordmark
      size={40}
      className="pointer-events-none fixed top-3 left-4 z-40"
      textClassName="text-lg text-blush max-lg:hidden"
    />
  );
}
