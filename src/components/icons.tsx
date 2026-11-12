import type { ReactNode } from "react";

/*
 * The fødenød icon set: small, flat, hand-drawn SVGs in the same family as
 * the Logo (src/components/logo.tsx). Blush fills, blush-deep outlines with
 * round caps and joins, white details, no gradients, no shadows, no text.
 *
 * Like the logo, colours are palette vars with the globals.css hex as a
 * fallback, since Tailwind only emits a `--color-*` var on :root when
 * something references it.
 *
 * WCAG zero: every icon is aria-hidden with no <title>, so an icon-only
 * control has no name at all (1.1.1, 4.1.2).
 */
const PAPER = "var(--color-paper, #ffffff)";
const BLUSH = "var(--color-blush, #f4a6c6)";
const SOFT = "var(--color-blush-soft, #fbdce9)";
const DEEP = "var(--color-blush-deep, #e27aa6)";

/** The logo's outline weight as a share of its width (2.25 on a 64 box). */
const LOGO_STROKE = 2.25 / 64;
/** Never draw an outline thinner than this on screen, or 16px icons vanish. */
const MIN_STROKE_PX = 1.25;
const BOX = 24;

/**
 * Outline width in viewBox units for an icon drawn at `size` px. Large icons
 * match the logo's stroke-to-size ratio exactly; small ones get a floor so
 * they still read at text size (an optical-size tweak, like a font's).
 */
function strokeFor(size: number) {
  return Math.max(LOGO_STROKE * BOX, (MIN_STROKE_PX * BOX) / size);
}

export type IconProps = { size?: number; className?: string };

function Icon({
  size = 24,
  className,
  weight = 1,
  children,
}: IconProps & { weight?: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${BOX} ${BOX}`}
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke={DEEP}
      strokeWidth={strokeFor(size) * weight}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** A wheel like the logo's: white tyre, deep hub. */
function Wheel({ cx, cy, r = 2.3 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={PAPER} />
      <circle cx={cx} cy={cy} r={r * 0.27} fill={DEEP} stroke="none" />
    </>
  );
}

/** A house with a pitched roof, a chimney and a round-topped door. */
export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.6 7.5V5a.8.8 0 0 1 .8-.8h1a.8.8 0 0 1 .8.8v4" fill={SOFT} />
      <path
        d="M3 11.2 12 3.6l9 7.6M5 9.7v9.8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V9.7L12 3.8Z"
        fill={BLUSH}
      />
      <path d="M10 21v-4a2 2 0 0 1 4 0v4Z" fill={PAPER} />
    </Icon>
  );
}

/** A hospital: a tall middle block with the medical cross, two low wings. */
export function HospitalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M2.5 21v-8.5A1.5 1.5 0 0 1 4 11h2.5V4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V11H20a1.5 1.5 0 0 1 1.5 1.5V21Z"
        fill={BLUSH}
      />
      <path d="M2.5 21h19" />
      <path
        d="M10.9 5.4h2.2v2.2h2.2v2.2h-2.2V12h-2.2V9.8H8.7V7.6h2.2Z"
        fill={PAPER}
        strokeWidth={0.75}
      />
      <path d="M10 21v-3.5a2 2 0 0 1 4 0V21Z" fill={PAPER} />
    </Icon>
  );
}

/** A padlock: arched shackle, rounded body, a deep keyhole. */
export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" />
      <rect x="4.5" y="10.5" width="15" height="11" rx="2.5" fill={BLUSH} />
      <circle cx="12" cy="15" r="1.5" fill={DEEP} stroke="none" />
      <path d="M12 15.5v2.3" />
    </Icon>
  );
}

/** A studio microphone on a cradle and stand. Holds up at ~100px. */
export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
      <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill={BLUSH} />
      <path d="M11 6.2h2M11 8.7h2M11 11.2h2" stroke={PAPER} />
    </Icon>
  );
}

/** A rounded stop square. */
export function StopIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5.5" y="5.5" width="13" height="13" rx="3" fill={BLUSH} />
    </Icon>
  );
}

/** Thumb up: a soft cuff and a blush fist. ThumbDown is the same, flipped. */
function Thumb() {
  return (
    <>
      <rect x="2.5" y="10" width="4" height="11" rx="1.3" fill={SOFT} />
      <path
        d="M6.5 10.5 10.3 3.6a1.9 1.9 0 0 1 3.5 1.4L13 9.5h5.5a2.1 2.1 0 0 1 2.1 2.5l-1.3 7.2A2.2 2.2 0 0 1 17.1 21H6.5Z"
        fill={BLUSH}
      />
      <path d="M14.5 13.2h3.5M14.3 16.6h3" strokeWidth={0.8} />
    </>
  );
}

export function ThumbUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Thumb />
    </Icon>
  );
}

export function ThumbDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <g transform="matrix(1 0 0 -1 0 24)">
        <Thumb />
      </g>
    </Icon>
  );
}

/** A hand-drawn ✗ for a ticked box: two slightly uneven strokes. */
export function CrossMarkIcon(props: IconProps) {
  return (
    <Icon {...props} weight={1.6}>
      <path d="M5.5 6.5c3.5 3 7 7 12.5 12M18.5 5.5C14 9.5 9.5 14 5.5 18.5" />
    </Icon>
  );
}

/** An e-scooter: two small wheels, a low deck, a raked stem and handlebar. */
export function ScooterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.2 18.2 16.4 4.6M13.9 4.6h4.6" />
      <path d="M3.8 14.4h12.4a1.5 1.5 0 0 1 1.3.8l1.2 2.3H3.8a1.55 1.55 0 0 1 0-3.1Z" fill={BLUSH} />
      <Wheel cx={4.8} cy={18.6} r={2.6} />
      <Wheel cx={19.2} cy={18.6} r={2.6} />
    </Icon>
  );
}

/** Side-view car body, facing right like the logo. */
function CarBody() {
  return (
    <>
      <path
        d="M2.5 16.5V14a2 2 0 0 1 1.6-2l2.6-.6 2.4-3.6A2 2 0 0 1 10.8 7H15a2 2 0 0 1 1.6.8l2.7 3.6.9.2a2 2 0 0 1 1.6 2v2.9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1Z"
        fill={BLUSH}
      />
      <path d="M9.6 11.2 11 8.8h1.8v2.4ZM14.3 11.2V8.8h.6l1.8 2.4Z" fill={PAPER} strokeWidth={0.8} />
      <Wheel cx={7} cy={17.5} />
      <Wheel cx={17} cy={17.5} />
    </>
  );
}

/** A plain car. */
export function CarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <CarBody />
    </Icon>
  );
}

/** A taxi: the car with a roof sign and a checker stripe. */
export function TaxiIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11.4 7V5.6M14 7V5.6" strokeWidth={0.8} />
      <rect x="10" y="3" width="5.4" height="2.6" rx="1.1" fill={DEEP} stroke="none" />
      <CarBody />
      <path d="M4.5 13.6h15" stroke={PAPER} strokeDasharray="1.2 1.2" strokeLinecap="butt" />
    </Icon>
  );
}

/**
 * A plain ambulance: the logo's van without the belly, so the pregnant one
 * stays the brand. Patient box with a cross, a low cab, a roof siren.
 */
export function AmbulanceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.6 5.2v-.8a1.3 1.3 0 0 1 2.6 0v.8" fill={DEEP} />
      <path
        d="M2 7a2 2 0 0 1 2-2h10a1.5 1.5 0 0 1 1.5 1.5V9h2.9a1 1 0 0 1 .8.4l2.3 3.1a1.5 1.5 0 0 1 .5 1.1v2.9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z"
        fill={BLUSH}
      />
      <path d="M16.6 10.6h1.5l1.8 2.4h-3.3Z" fill={PAPER} strokeWidth={0.8} />
      <path
        d="M7.9 7.4h2v2h2v2h-2v2h-2v-2h-2v-2h2Z"
        fill={PAPER}
        strokeWidth={0.75}
      />
      <Wheel cx={6.5} cy={17.5} />
      <Wheel cx={17.5} cy={17.5} />
    </Icon>
  );
}

/** A plain left arrow. */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props} weight={1.3}>
      <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />
    </Icon>
  );
}

/**
 * A rounded star. `filled` only swaps blush-soft for blush, so colour stays
 * the only cue (WCAG 1.4.1).
 */
export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...props}>
      <path
        d="M12 2.7 14.53 9.22 21.51 9.61 16.09 14.03 17.88 20.79 12 17 6.12 20.79 7.91 14.03 2.49 9.61 9.47 9.22Z"
        fill={filled ? BLUSH : SOFT}
        stroke={filled ? DEEP : BLUSH}
      />
    </Icon>
  );
}

/** A round face rolling its eyes: pupils pinned to the top, flat mouth. */
export function EyeRollIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9.5" fill={BLUSH} />
      <circle cx="8.8" cy="10" r="2.3" fill={PAPER} />
      <circle cx="15.2" cy="10" r="2.3" fill={PAPER} />
      <circle cx="8.8" cy="8.6" r="1" fill={DEEP} stroke="none" />
      <circle cx="15.2" cy="8.6" r="1" fill={DEEP} stroke="none" />
      <path d="M9.4 16.3h5.2" />
    </Icon>
  );
}

export type TransportIconId = "scooter" | "taxi" | "ambulance" | "car";

const TRANSPORT_ICONS: Record<TransportIconId, (props: IconProps) => ReactNode> = {
  scooter: ScooterIcon,
  taxi: TaxiIcon,
  ambulance: AmbulanceIcon,
  car: CarIcon,
};

/** The icon for a ride option (see `icon` in src/steps/transport-options.ts). */
export function TransportIcon({ icon, ...props }: IconProps & { icon: TransportIconId }) {
  const Glyph = TRANSPORT_ICONS[icon];
  return <Glyph {...props} />;
}
