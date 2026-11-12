"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StepProps } from "@/app/steps";
import { isPregnant, smooth } from "@/lib/clip-math";
import {
  drawOverlay,
  type OverlayColors,
  percentLabel,
  scoreTracks,
  type Track,
  updateTracks,
} from "@/steps/verify/overlay";
import { quietLibraryLogs } from "@/steps/verify/quiet-console";
import type { Scanner } from "@/steps/verify/scanner";

/** Throttle for the verdict text: at most two changes per second (WCAG 2.3.1). */
const UI_TICK_MS = 500;
/** The "gravid" verdict must hold this long before we believe it. */
const PREGNANT_HOLD_MS = 3000;
/** Without a camera we just take your word for it, eventually. */
const NO_CAMERA_ADVANCE_MS = 8000;
/** After this long on the step, we give up and let anything through. */
const MERCY_AFTER_MS = 30000;
const MERCY_DELAY_MS = 1500;
/** A person counts as gone after the detector has seen nobody for this long. */
const PERSON_GRACE_MS = 1000;

type Status = "loading" | "nocamera" | "empty" | "pregnant" | "notpregnant";

const STATUS_TEXT: Record<Status, string> = {
  loading: "Et øyeblikk…",
  nocamera: "Fant ikke noe kamera. Vi antar at du er gravid.",
  empty: "Vis magen til kameraet",
  pregnant: "Du er gravid",
  notpregnant: "Du er ikke gravid",
};

export function VerifyStep({ next }: StepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [mercy, setMercy] = useState(false);

  // `next()` runs exactly once, whichever path gets there first.
  const advancedRef = useRef(false);
  const advance = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    next();
  }, [next]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    // Library status chatter goes to console.debug, not the dev overlay.
    const restoreConsole = quietLibraryLogs();
    let cancelled = false;
    let stream: MediaStream | null = null;
    let scanner: Scanner | null = null;
    let frame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    let cameraFailed = false;
    let busy = false;
    let score: number | null = null;
    // When the detector last started seeing nobody (null: someone's there).
    // Measured from detector results, not wall time, so a slow frame doesn't
    // count as an empty room.
    let emptySince: number | null = 0;
    let lastVideoTime = -1;
    let lastTimestamp = 0;
    let pregnantSince: number | null = null;

    // Person boxes over the preview. Colours come from palette classes on the
    // canvas (text = outline, border = tag, fill = tag text).
    let tracks: Track[] = [];
    let trackCount = 0;
    const style = getComputedStyle(canvas);
    const colors: OverlayColors = {
      stroke: style.color,
      tag: style.borderTopColor,
      tagText: style.fill,
    };
    const redraw = () => drawOverlay(canvas, video, tracks, colors, style.fontFamily);

    const failCamera = () => {
      if (cancelled || cameraFailed) return;
      cameraFailed = true;
      setStatus("nocamera");
      timers.push(setTimeout(advance, NO_CAMERA_ADVANCE_MS));
    };

    // Mercy rule: nobody waits forever, not even the not-pregnant.
    timers.push(
      setTimeout(() => {
        if (cancelled || advancedRef.current || cameraFailed) return;
        setMercy(true);
        timers.push(setTimeout(advance, MERCY_DELAY_MS));
      }, MERCY_AFTER_MS),
    );

    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (!scanner || video.readyState < 2 || !video.videoWidth) {
        return;
      }
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      // MediaPipe wants strictly increasing timestamps.
      const now = performance.now();
      lastTimestamp = Math.max(now, lastTimestamp + 1);
      let people;
      try {
        people = scanner.detectPeople(video, lastTimestamp);
      } catch {
        return; // a bad frame; try the next one
      }
      const update = updateTracks(tracks, people, now, () => ++trackCount);
      tracks = update.tracks;
      redraw();
      if (people.length === 0) {
        emptySince ??= now;
        return;
      }
      emptySince = null;

      // One inference at a time; skip frames while busy.
      if (busy) return;
      busy = true;
      scanner
        .scoreCrops(video, people)
        .then((scores) => {
          if (cancelled) return;
          tracks = scoreTracks(tracks, update.ids, scores);
          const scored = scores.filter((p): p is number => p !== null);
          // The frame's score is its most pregnant-looking person.
          if (scored.length > 0) score = smooth(score, Math.max(...scored));
        })
        .catch(() => {
          // A dropped frame; the next one gets another go.
        })
        .finally(() => {
          busy = false;
        });
    };

    // Turn the latest score into text, no more often than every UI_TICK_MS.
    const tick = setInterval(() => {
      if (cancelled || cameraFailed) return;
      const now = performance.now();
      let latest: Status;
      if (!scanner) {
        latest = "loading";
      } else if (emptySince !== null && now - emptySince > PERSON_GRACE_MS) {
        score = null;
        latest = "empty";
      } else if (score === null) {
        latest = "loading"; // someone's there; first score is on its way
      } else {
        latest = isPregnant(score) ? "pregnant" : "notpregnant";
      }
      setStatus(latest);

      // Tag text changes on this throttle only, so the percent never flickers.
      tracks = tracks.map((track) => ({
        ...track,
        label: track.score === null ? null : percentLabel(track.score),
      }));
      redraw();

      if (latest === "pregnant") {
        pregnantSince ??= now;
        if (now - pregnantSince >= PREGNANT_HOLD_MS) advance();
      } else {
        pregnantSince = null;
      }
    }, UI_TICK_MS);

    // The code chunk starts loading right away; the (large) model downloads
    // only start once there's a camera to point them at.
    const scannerModule = import("@/steps/verify/scanner");
    scannerModule.catch(() => {}); // handled in startScanner, if it runs

    // Settles once model loading has finished (or failed) for this mount.
    let scannerSettled: Promise<void> = Promise.resolve();

    const startScanner = async () => {
      try {
        const { createScanner } = await scannerModule;
        const loaded = await createScanner();
        if (cancelled) {
          loaded.dispose();
          return;
        }
        scanner = loaded;
      } catch {
        // Stays on "Et øyeblikk…"; the mercy rule gets them out.
      }
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        failCamera();
        return;
      }
      let media: MediaStream;
      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
      } catch {
        failCamera();
        return;
      }
      if (cancelled) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = media;
      video.srcObject = media;
      void video.play().catch(() => {});
      scannerSettled = startScanner();
    };

    void startCamera();
    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearInterval(tick);
      timers.forEach(clearTimeout);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      // Downloads can't be aborted: wait for loading to settle and any
      // in-flight inference to finish, then release the models. The console
      // filter stays until then, since late loads log too.
      const idle = (): Promise<void> =>
        busy
          ? new Promise((resolve) => setTimeout(resolve, 50)).then(idle)
          : Promise.resolve();
      void scannerSettled
        .then(idle)
        .then(() => {
          scanner?.dispose();
          scanner = null;
        })
        .catch(() => {})
        .finally(restoreConsole);
    };
  }, [advance]);

  const verdict = status === "pregnant" || status === "notpregnant";

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 text-ink">
      <h1 className="mb-6 text-3xl font-extralight tracking-tight text-blush-deep">
        Bekreft graviditet
      </h1>
      <div className="w-[362px] rounded-2xl border border-blush-soft bg-paper p-5">
        {/* WCAG 1.4.3: instructions in barely-there pink. */}
        <p className="mb-3 text-[12px] leading-snug text-ink-faint">
          Hold magen foran kameraet. Siden går videre av seg selv når vi er
          fornøyde.
        </p>
        <div className="relative w-[320px]">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="block aspect-[4/3] w-full -scale-x-100 rounded-xl bg-blush-soft object-cover"
          />
          {/* Not mirrored itself: box positions are mirrored in code so the
              tag text reads the right way round. */}
          <canvas
            ref={canvasRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full border-0 border-blush fill-paper text-blush-deep"
          />
        </div>
        <div className="mt-4 flex min-h-16 items-center justify-center text-center">
          {mercy ? (
            <span className="text-3xl font-extralight text-blush">
              Greit nok. 🙄
            </span>
          ) : verdict ? (
            <span className="text-4xl font-extralight tracking-tight text-blush">
              {STATUS_TEXT[status]}
            </span>
          ) : (
            <span className="text-[13px] font-light text-ink-faint">
              {STATUS_TEXT[status]}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
