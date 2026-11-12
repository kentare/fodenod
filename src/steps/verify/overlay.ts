/**
 * Person boxes drawn over the mirrored webcam preview, each with a tag that
 * shows that person's smoothed P(pregnant).
 *
 * Tracking and geometry are pure functions; `drawOverlay` is the only part
 * that touches a canvas.
 */
import { smooth } from "@/lib/clip-math";
import type { Box } from "@/steps/verify/scanner";

/** A track keeps its box on screen this long after its last detection, so a
 * missed frame doesn't make the box blink. */
export const TRACK_GRACE_MS = 600;
/** Minimum overlap for a detection to continue an existing track. */
const MATCH_IOU = 0.3;

export type Track = {
  id: number;
  box: Box;
  lastSeen: number;
  /** Smoothed P(pregnant) for this person; null until the first score. */
  score: number | null;
  /** The text in the tag. Updated on the UI throttle, not every frame. */
  label: string | null;
};

export function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * Matches this frame's detections to existing tracks (greedy, by overlap),
 * starts new tracks for the rest and drops tracks unseen for too long.
 * Returns the new track list and, per detection, the id of its track.
 */
export function updateTracks(
  tracks: readonly Track[],
  detections: readonly Box[],
  now: number,
  nextId: () => number,
): { tracks: Track[]; ids: number[] } {
  const pairs: { t: number; d: number; overlap: number }[] = [];
  tracks.forEach((track, t) =>
    detections.forEach((box, d) => {
      const overlap = iou(track.box, box);
      if (overlap >= MATCH_IOU) pairs.push({ t, d, overlap });
    }),
  );
  pairs.sort((a, b) => b.overlap - a.overlap);

  const trackFor = new Map<number, number>(); // detection -> track index
  const usedTracks = new Set<number>();
  for (const { t, d } of pairs) {
    if (usedTracks.has(t) || trackFor.has(d)) continue;
    usedTracks.add(t);
    trackFor.set(d, t);
  }

  const next: Track[] = [];
  const ids = detections.map((box, d) => {
    const t = trackFor.get(d);
    const track: Track =
      t === undefined
        ? { id: nextId(), box, lastSeen: now, score: null, label: null }
        : { ...tracks[t], box, lastSeen: now };
    next.push(track);
    return track.id;
  });
  tracks.forEach((track, t) => {
    if (!usedTracks.has(t) && now - track.lastSeen <= TRACK_GRACE_MS) {
      next.push(track);
    }
  });
  return { tracks: next, ids };
}

/** Folds fresh per-person scores into their tracks (same smoothing as the verdict). */
export function scoreTracks(
  tracks: readonly Track[],
  ids: readonly number[],
  scores: readonly (number | null)[],
): Track[] {
  const byId = new Map<number, number>();
  ids.forEach((id, i) => {
    const p = scores[i];
    if (p !== null && p !== undefined) byId.set(id, p);
  });
  return tracks.map((track) => {
    const p = byId.get(track.id);
    return p === undefined ? track : { ...track, score: smooth(track.score, p) };
  });
}

/** "Gravid: 87 %" (Norwegian puts a no-break space before the percent sign). */
export function percentLabel(score: number): string {
  return `Gravid: ${Math.round(score * 100)} %`;
}

/**
 * Maps a box in video pixels to CSS pixels of an element showing the video
 * with `object-fit: cover`, mirrored horizontally.
 */
export function toDisplayBox(
  box: Box,
  video: { width: number; height: number },
  display: { width: number; height: number },
  mirrored: boolean,
): Box {
  const scale = Math.max(
    display.width / video.width,
    display.height / video.height,
  );
  const offsetX = (display.width - video.width * scale) / 2;
  const offsetY = (display.height - video.height * scale) / 2;
  const width = box.width * scale;
  const height = box.height * scale;
  const x = box.x * scale + offsetX;
  return {
    x: mirrored ? display.width - x - width : x,
    y: box.y * scale + offsetY,
    width,
    height,
  };
}

export type OverlayColors = { stroke: string; tag: string; tagText: string };

/** Draws every track's box and tag. The canvas must not itself be mirrored. */
export function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  tracks: readonly Track[],
  colors: OverlayColors,
  font: string,
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  // Keep the backing store matched to the element's size and pixel ratio.
  const display = { width: canvas.clientWidth, height: canvas.clientHeight };
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(display.width * ratio);
  const height = Math.round(display.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, display.width, display.height);
  if (!video.videoWidth || !video.videoHeight) return;

  const source = { width: video.videoWidth, height: video.videoHeight };
  context.font = `11px ${font}`;
  context.textBaseline = "middle";

  for (const track of tracks) {
    const box = toDisplayBox(track.box, source, display, true);
    // Clamp to the preview so the outline stays visible at the edges.
    const x = Math.max(1, box.x);
    const y = Math.max(1, box.y);
    const w = Math.min(display.width - 1, box.x + box.width) - x;
    const h = Math.min(display.height - 1, box.y + box.height) - y;
    if (w <= 0 || h <= 0) continue;

    context.lineWidth = 2;
    context.strokeStyle = colors.stroke;
    context.beginPath();
    context.roundRect(x, y, w, h, 8);
    context.stroke();

    if (!track.label) continue;
    const padX = 6;
    const tagHeight = 18;
    const tagWidth = context.measureText(track.label).width + padX * 2;
    const tagX = Math.min(x, display.width - tagWidth);
    const tagY = Math.max(0, y - tagHeight / 2);
    context.fillStyle = colors.tag;
    context.beginPath();
    context.roundRect(tagX, tagY, tagWidth, tagHeight, tagHeight / 2);
    context.fill();
    context.fillStyle = colors.tagText;
    context.fillText(track.label, tagX + padX, tagY + tagHeight / 2 + 0.5);
  }
}
