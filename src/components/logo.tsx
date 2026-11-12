import type { StepId } from "@/app/steps";

/*
 * Palette colours for the inline SVG. Tailwind only emits a `--color-*` var
 * on :root when something references it, so each one carries the same hex
 * as globals.css as a fallback.
 */
const PAPER = "var(--color-paper, #ffffff)";
const BLUSH = "var(--color-blush, #f4a6c6)";
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
      viewBox="0 0 64 52"
      width={size}
      height={(size * 52) / 64}
      className={className}
      fill="none"
      stroke={DEEP}
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Siren light and its glow rays */}
      <path d="M28 9.5V8a3 3 0 0 1 6 0v1.5" fill={DEEP} />
      <path d="M31 1.5v1.6M25.4 3.6l1.1 1.1M36.6 3.6l-1.1 1.1" strokeWidth={1.75} />

      {/* Body: tall patient box, lower cab, and a round belly between the wheels */}
      <path
        d="M4 14a4.5 4.5 0 0 1 4.5-4.5H36a4 4 0 0 1 4 4V20h7.2a2 2 0 0 1 1.6.8l5.6 7.4 2 .6
           a2.5 2.5 0 0 1 1.8 2.4v2.3a2.5 2.5 0 0 1-2.5 2.5H48A15.5 12 0 0 1 17 36H8.5
           A4.5 4.5 0 0 1 4 31.5Z"
        fill={BLUSH}
      />

      {/* Navel */}
      <path d="M36 41.2c.9.4 1.4 1.4 1 2.3" strokeWidth={1.6} />

      {/* Cab window */}
      <path d="M43 23h4l4.3 5.8H43Z" fill={PAPER} strokeWidth={1.75} />

      {/* Medical cross */}
      <path d="M18 14.5h4v4h4v4h-4v4h-4v-4h-4v-4h4Z" fill={PAPER} strokeWidth={1.5} />

      {/* Wheels */}
      <circle cx="12" cy="39.5" r="4.6" fill={PAPER} />
      <circle cx="53" cy="39.5" r="4.6" fill={PAPER} />
      <circle cx="12" cy="39.5" r="1.1" fill={DEEP} stroke="none" />
      <circle cx="53" cy="39.5" r="1.1" fill={DEEP} stroke="none" />
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
