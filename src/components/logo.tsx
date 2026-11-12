"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** Where the small top-left mark sits (matches `top-3 left-4` and size 40). */
const CORNER = { left: 16, top: 12, width: 40 } as const;
const ASPECT = 52 / 64;

const FLIGHT_MS = 700;
/** Three gentle pulses (~3.6s), so the last one ends back at scale 1. */
const PULSE_MS = 1200;
const PULSES = 3;

/** The big mark's on-screen box while it's out: 50vw wide, centred. */
type Flight = { left: number; top: number; width: number };

/** Transform that shrinks the big centred mark back onto the corner mark. */
function cornerTransform({ left, top, width }: Flight) {
  const scale = CORNER.width / width;
  return `translate(${CORNER.left - left}px, ${CORNER.top - top}px) scale(${scale})`;
}

/** True while the user is typing somewhere, so "7" stays a character there. */
function isTyping() {
  const el = document.activeElement;
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || el.matches("input, textarea, select"))
  );
}

/**
 * A two-tone European "ba-bu" siren, synthesised with Web Audio.
 * Returns a function that fades it out and stops it.
 */
function startSiren(ctx: AudioContext) {
  const LOW = 450;
  const HIGH = 600;
  const HALF_PERIOD = 0.45;
  const VOLUME = 0.15;
  const FADE = 0.05;
  /** Tones are scheduled up front; the logo is never out this long. */
  const MAX_SECONDS = 30;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.connect(gain).connect(ctx.destination);

  const t0 = ctx.currentTime;
  for (let i = 0; i * HALF_PERIOD < MAX_SECONDS; i++) {
    osc.frequency.setValueAtTime(i % 2 === 0 ? LOW : HIGH, t0 + i * HALF_PERIOD);
  }
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(VOLUME, t0 + FADE);
  osc.start(t0);
  osc.stop(t0 + MAX_SECONDS);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };

  return () => {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + FADE);
    osc.stop(t + FADE + 0.01);
  };
}

/**
 * The small fixed top-left lockup (every step except the loader and the
 * landing page, which show the big mark instead), plus the "7" shortcut:
 * the mark floats to the middle of the screen at 50vw, pulses with a siren,
 * then floats back. On the loader and landing page it still flies out from
 * the same corner, fading in on the way.
 *
 * WCAG zero: an undiscoverable, single-key shortcut (2.1.4) that plays
 * audio and covers the page.
 */
export function CornerLogo({ current }: { current: StepId }) {
  const showCorner = current !== "loading" && current !== "intro";
  const [flight, setFlight] = useState<Flight | null>(null);

  const flyerRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<"idle" | "out" | "back">("idle");
  const flightRef = useRef<Flight | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const stopSirenRef = useRef<(() => void) | null>(null);
  /** Whether the corner mark was visible at launch (else fade the flyer in/out). */
  const fromCornerRef = useRef(showCorner);
  const showCornerRef = useRef(showCorner);
  useEffect(() => {
    showCornerRef.current = showCorner;
  }, [showCorner]);

  const land = useCallback(() => {
    stopSirenRef.current?.();
    stopSirenRef.current = null;
    phaseRef.current = "idle";
    flightRef.current = null;
    setFlight(null);
  }, []);

  const flyBack = useCallback(() => {
    const flyer = flyerRef.current;
    const box = flightRef.current;
    if (phaseRef.current !== "out" || !flyer || !box) return;
    phaseRef.current = "back";
    // Start from wherever it is now, in case 7 was pressed mid-flight.
    const { transform, opacity } = getComputedStyle(flyer);
    pulseRef.current?.getAnimations().forEach((a) => a.cancel());
    flyer.getAnimations().forEach((a) => a.cancel());
    const fade = !fromCornerRef.current;
    const back = flyer.animate(
      [
        { transform, opacity },
        { transform: cornerTransform(box), opacity: fade ? 0 : 1 },
      ],
      { duration: FLIGHT_MS, easing: "ease-in-out", fill: "forwards" },
    );
    back.onfinish = land;
  }, [land]);

  const launch = useCallback(() => {
    const width = window.innerWidth / 2;
    const box: Flight = {
      width,
      left: (window.innerWidth - width) / 2,
      top: (window.innerHeight - width * ASPECT) / 2,
    };
    phaseRef.current = "out";
    flightRef.current = box;
    fromCornerRef.current = showCornerRef.current;
    setFlight(box);

    try {
      const ctx = (audioRef.current ??= new AudioContext());
      void ctx.resume();
      stopSirenRef.current = startSiren(ctx);
    } catch {
      // No audio (unsupported or blocked): the logo still flies.
    }
  }, []);

  // Fly out once the big mark has mounted at its centred box.
  useLayoutEffect(() => {
    const flyer = flyerRef.current;
    if (!flight || !flyer) return;
    const fade = !fromCornerRef.current;
    const out = flyer.animate(
      [
        { transform: cornerTransform(flight), opacity: fade ? 0 : 1 },
        { transform: "none", opacity: 1 },
      ],
      { duration: FLIGHT_MS, easing: "ease-in-out", fill: "forwards" },
    );
    out.onfinish = () => {
      const pulse = pulseRef.current?.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }],
        { duration: PULSE_MS, iterations: PULSES, easing: "ease-in-out" },
      );
      if (pulse) pulse.onfinish = flyBack;
      else flyBack();
    };
  }, [flight, flyBack]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "7" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping()) return;
      if (phaseRef.current === "idle") launch();
      else flyBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [launch, flyBack]);

  // Silence and release the audio on unmount.
  useEffect(
    () => () => {
      stopSirenRef.current?.();
      void audioRef.current?.close();
      audioRef.current = null;
    },
    [],
  );

  const flying = flight !== null;
  return (
    <>
      {showCorner && (
        <div aria-hidden className="pointer-events-none fixed top-3 left-4 z-40 flex items-center gap-2">
          <Logo size={CORNER.width} className={flying ? "invisible" : undefined} />
          <span
            className={`text-lg font-extralight tracking-tight text-blush transition-opacity duration-300 max-lg:hidden ${
              flying ? "opacity-0" : "opacity-100"
            }`}
          >
            fødenød
          </span>
        </div>
      )}

      {flight && (
        <div
          ref={flyerRef}
          aria-hidden
          className="pointer-events-none fixed z-[960] origin-top-left"
          style={{ left: flight.left, top: flight.top, width: flight.width }}
        >
          <div ref={pulseRef}>
            <Logo size={flight.width} className="block" />
          </div>
        </div>
      )}
    </>
  );
}
