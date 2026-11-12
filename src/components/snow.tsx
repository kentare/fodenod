"use client";

import { useEffect, useRef } from "react";
import { rand } from "@/lib/random";

/** Width of one height-map column, in CSS px. */
const COL_W = 4;
const FLAKE_COUNT = 160;
/** The pile never grows past this share of the viewport, so the top stays usable. */
const MAX_FILL = 0.7;
/**
 * Snowfall rate when the screen is empty, as a share of the viewport height per
 * second. It tapers off as the pile grows (see `fillRate`): about 9% covered
 * after one minute, ~17% after two, ~30% after five.
 */
const BASE_RATE = 0.0018;
/** Share of each landing that settles evenly everywhere instead of at the landing spot. */
const POWDER_SHARE = 0.5;
/** Neighbouring columns may differ by this much (px) before the steeper one slumps. */
const MAX_STEP = 5;
/** How quickly the surface smooths out, per frame at 60fps. */
const SMOOTHING = 0.05;
const WIPE_RADIUS = 100;
/** Px of snow removed at the cursor centre per px of cursor travel. */
const WIPE_STRENGTH = 1.5;
const MAX_SPRAY = 90;

/** Dispatch this on `window` to clear all snow (used by the dev panel). */
export const SNOW_RESET_EVENT = "fodenod:snow-reset";

type Flake = {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  sway: number;
  swaySpeed: number;
  alpha: number;
  deep: boolean;
  /** Snow area (px²) this flake carries; grows while airborne, dropped on landing. */
  load: number;
};

type Spray = { x: number; y: number; vx: number; vy: number; r: number; life: number; age: number };

/** Palette tokens from globals.css, with the same hex values as a fallback. */
function readPalette() {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  return {
    blush: token("--color-blush", "#f4a6c6"),
    blushSoft: token("--color-blush-soft", "#fbdce9"),
    blushDeep: token("--color-blush-deep", "#e27aa6"),
  };
}

/** A soft, pre-blurred dot that flakes are stamped from. */
function makeSprite(color: string) {
  const size = 32;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const g = sprite.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return sprite;
}

/** Growth rate (share of viewport height per second) for a given average fill. */
function fillRate(fill: number) {
  const room = Math.max(0, 1 - fill / MAX_FILL);
  return BASE_RATE * room * room;
}

/**
 * Constant snowfall over the whole app. The snow piles up from the bottom,
 * swallows every click that lands on it, and has to be wiped away by
 * dragging the mouse over it. The dev panel (`[data-dev-panel]`) is exempt.
 *
 * Two layers: falling flakes are painted behind the page content (so forms
 * and text cover them), while the pile is painted on top of everything.
 */
export function Snow() {
  const fallRef = useRef<HTMLCanvasElement>(null);
  const pileRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fallCanvas = fallRef.current;
    const pileCanvas = pileRef.current;
    const fall = fallCanvas?.getContext("2d");
    const ctx = pileCanvas?.getContext("2d");
    if (!fallCanvas || !pileCanvas || !fall || !ctx) return;

    const palette = readPalette();
    const sprites = { light: makeSprite(palette.blush), deep: makeSprite(palette.blushDeep) };

    let width = 0;
    let height = 0;
    let heights = new Float32Array(0);
    const flakes: Flake[] = [];
    const spray: Spray[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const prev = heights;
      const prevW = width;
      width = window.innerWidth;
      height = window.innerHeight;
      for (const canvas of [fallCanvas, pileCanvas]) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Resample the existing pile onto the new column grid.
      const cols = Math.ceil(width / COL_W) + 1;
      heights = new Float32Array(cols);
      if (prev.length > 0) {
        for (let i = 0; i < cols; i++) {
          const src = Math.min(prev.length - 1, Math.floor((i * prevW) / width));
          heights[i] = Math.min(prev[src], height * MAX_FILL);
        }
      }
    };

    const spawn = (flake: Partial<Flake> = {}): Flake => {
      const r = rand(1, 2.8);
      return {
        x: rand(0, width),
        y: rand(-40, -4),
        r,
        vy: 12 + r * rand(5, 9), // bigger flakes fall a bit faster
        phase: rand(0, Math.PI * 2),
        sway: rand(6, 22),
        swaySpeed: rand(0.4, 1.2),
        alpha: rand(0.55, 0.95),
        deep: Math.random() < 0.35,
        load: 0,
        ...flake,
      };
    };

    /**
     * Empties the pile and restarts the snowfall. With `spread`, flakes start
     * scattered over the screen (first load); otherwise they all start above
     * it and drift in, so a reset visibly clears the screen.
     */
    const reset = (spread = false) => {
      heights.fill(0);
      spray.length = 0;
      flakes.length = 0;
      for (let i = 0; i < FLAKE_COUNT; i++)
        flakes.push(spawn({ y: spread ? rand(-height * 0.1, height) : rand(-height, -4) }));
    };
    const onReset = () => reset();

    resize();
    reset(true);

    const colAt = (x: number) =>
      Math.max(0, Math.min(heights.length - 1, Math.floor(x / COL_W)));
    const cap = () => height * MAX_FILL;

    /** Drops `area` px² of snow as a soft bump centred on column `c`. */
    const deposit = (c: number, area: number) => {
      const powder = (area * POWDER_SHARE) / (heights.length * COL_W);
      const max = cap();
      for (let i = 0; i < heights.length; i++) heights[i] = Math.min(max, heights[i] + powder);

      // Gaussian bump (sigma 2.5 columns), normalised so its area matches.
      const local = (area * (1 - POWDER_SHARE)) / COL_W;
      const sigma = 2.5;
      const norm = local / (sigma * Math.sqrt(2 * Math.PI));
      for (let d = -7; d <= 7; d++) {
        const i = c + d;
        if (i < 0 || i >= heights.length) continue;
        heights[i] = Math.min(max, heights[i] + norm * Math.exp((-d * d) / (2 * sigma * sigma)));
      }
    };

    /** Lets steep steps avalanche, then lightly smooths the surface. */
    const settle = (dt: number) => {
      const n = heights.length;
      for (let pass = 0; pass < 2; pass++) {
        // Alternate sweep direction so snow doesn't drift to one side.
        const forward = pass === 0;
        for (let k = 0; k < n - 1; k++) {
          const i = forward ? k : n - 2 - k;
          const diff = heights[i] - heights[i + 1];
          const excess = Math.abs(diff) - MAX_STEP;
          if (excess <= 0) continue;
          const move = excess * 0.25 * Math.sign(diff);
          heights[i] -= move;
          heights[i + 1] += move;
        }
      }
      const k = Math.min(0.25, SMOOTHING * dt * 60);
      let prev = heights[0];
      for (let i = 1; i < n - 1; i++) {
        const cur = heights[i];
        heights[i] = cur + k * (prev + heights[i + 1] - 2 * cur);
        prev = cur;
      }
    };

    // --- Pointer handling: snow swallows clicks, dragging wipes it away. ---

    let wiping = false;
    let lastX = 0;
    let lastY = 0;
    // Set when a press starts on the snow, so its click is swallowed even if
    // the button is released over a freshly wiped spot.
    let pressedOnSnow = false;

    const surfaceAt = (x: number) => height - heights[colAt(x)];
    const isOnSnow = (e: MouseEvent) =>
      e.clientY > surfaceAt(e.clientX) &&
      !(e.target instanceof Element && e.target.closest("[data-dev-panel]"));
    const swallow = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onDown = (e: MouseEvent) => {
      if (e.type === "pointerdown") pressedOnSnow = false;
      if (!isOnSnow(e)) return;
      swallow(e);
      pressedOnSnow = true;
      if (e.button === 0) {
        wiping = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const onUp = (e: MouseEvent) => {
      if (e.type === "pointerup") wiping = false;
      if (pressedOnSnow || isOnSnow(e)) swallow(e);
    };
    const onClick = (e: MouseEvent) => {
      if (pressedOnSnow || isOnSnow(e)) swallow(e);
      pressedOnSnow = false;
    };
    const stopWiping = () => {
      wiping = false;
    };

    const onMove = (e: PointerEvent) => {
      if (!wiping) return;
      if ((e.buttons & 1) === 0) {
        wiping = false;
        return;
      }
      const travel = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      // Only wipe when the hand is actually in (or just above) the snow.
      if (e.clientY < surfaceAt(e.clientX) - WIPE_RADIUS) return;

      let removed = 0;
      const first = colAt(e.clientX - WIPE_RADIUS);
      const last = colAt(e.clientX + WIPE_RADIUS);
      for (let i = first; i <= last; i++) {
        const dx = (i * COL_W + COL_W / 2 - e.clientX) / WIPE_RADIUS;
        if (dx * dx >= 1) continue;
        const falloff = (1 - dx * dx) ** 2; // soft edge, full strength in the middle
        const take = Math.min(heights[i], travel * WIPE_STRENGTH * falloff);
        heights[i] -= take;
        removed += take;
      }

      // Brushed-off snow flies away as a few loose flakes.
      const puffs = Math.min(4, Math.floor(removed / 6));
      for (let p = 0; p < puffs && spray.length < MAX_SPRAY; p++) {
        spray.push({
          x: e.clientX + rand(-WIPE_RADIUS, WIPE_RADIUS) * 0.6,
          y: surfaceAt(e.clientX),
          vx: rand(-140, 140),
          vy: rand(-260, -120),
          r: rand(1.2, 2.6),
          life: rand(0.5, 0.9),
          age: 0,
        });
      }
    };

    const capture = { capture: true } as const;
    for (const type of ["pointerdown", "mousedown"] as const)
      window.addEventListener(type, onDown, capture);
    for (const type of ["pointerup", "mouseup"] as const)
      window.addEventListener(type, onUp, capture);
    window.addEventListener("click", onClick, capture);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointercancel", stopWiping);
    window.addEventListener("blur", stopWiping);
    window.addEventListener("resize", resize);
    window.addEventListener(SNOW_RESET_EVENT, onReset);

    // --- Animation loop ---

    let frame = 0;
    let last = performance.now();
    let time = 0;

    /** Starts a path along the pile's surface, curving through column midpoints. */
    const traceSurface = () => {
      ctx.beginPath();
      ctx.moveTo(0, height - heights[0]);
      for (let i = 0; i < heights.length - 1; i++) {
        const x = i * COL_W + COL_W / 2;
        ctx.quadraticCurveTo(
          x,
          height - heights[i],
          x + COL_W / 2,
          height - (heights[i] + heights[i + 1]) / 2,
        );
      }
    };

    const draw = () => {
      // Back layer: falling flakes, hidden by anything opaque on the page.
      fall.clearRect(0, 0, width, height);
      for (const f of flakes) {
        const size = f.r * 4.5;
        fall.globalAlpha = f.alpha;
        fall.drawImage(f.deep ? sprites.deep : sprites.light, f.x - size / 2, f.y - size / 2, size, size);
      }

      // Front layer: brushed-off spray and the pile, above everything.
      ctx.clearRect(0, 0, width, height);
      for (const s of spray) {
        const size = s.r * 4;
        ctx.globalAlpha = 0.9 * (1 - s.age / s.life); // fades out smoothly, never blinks
        ctx.drawImage(sprites.deep, s.x - size / 2, s.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      // The pile: an opaque fill, then a slightly deeper line along its top edge.
      traceSurface();
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = palette.blushSoft;
      ctx.fill();
      traceSurface();
      ctx.strokeStyle = palette.blushDeep;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const tick = (now: number) => {
      // Clamp so a backgrounded tab doesn't come back to a teleporting blizzard.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      let total = 0;
      for (let i = 0; i < heights.length; i++) total += heights[i];
      const fill = total / heights.length / height;
      // Each airborne flake carries an equal share of the snowfall, so the
      // overall rate is exact no matter how many flakes there are or how far they fall.
      const loadRate = (fillRate(fill) * height * width) / FLAKE_COUNT;

      const wind = Math.sin(time * 0.07) * 12;
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y += f.vy * dt;
        f.x += (wind + Math.cos(time * f.swaySpeed + f.phase) * f.sway) * dt;
        if (f.x < -10) f.x += width + 20;
        else if (f.x > width + 10) f.x -= width + 20;
        f.load += loadRate * dt;
        if (f.y + f.r * 0.5 >= surfaceAt(f.x)) {
          deposit(colAt(f.x), f.load);
          flakes[i] = spawn();
        }
      }

      for (let i = spray.length - 1; i >= 0; i--) {
        const s = spray[i];
        s.age += dt;
        s.vy += 600 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.age >= s.life) spray.splice(i, 1);
      }

      settle(dt);
      draw();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      for (const type of ["pointerdown", "mousedown"] as const)
        window.removeEventListener(type, onDown, capture);
      for (const type of ["pointerup", "mouseup"] as const)
        window.removeEventListener(type, onUp, capture);
      window.removeEventListener("click", onClick, capture);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointercancel", stopWiping);
      window.removeEventListener("blur", stopWiping);
      window.removeEventListener("resize", resize);
      window.removeEventListener(SNOW_RESET_EVENT, onReset);
    };
  }, []);

  return (
    <>
      {/* Negative z-index paints above the body background but below page content. */}
      <canvas
        ref={fallRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      />
      <canvas
        ref={pileRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[900] h-full w-full"
      />
    </>
  );
}
