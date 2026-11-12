/**
 * Belly scanner: finds people in a video frame with a MediaPipe object
 * detector, then scores each person crop with zero-shot CLIP.
 *
 * Client-only. Both libraries are loaded with dynamic `import()` so they stay
 * out of the initial bundle and out of SSR. Frames never leave the browser:
 * crops are drawn to an in-memory canvas and fed straight to the model.
 */
import type { ObjectDetector } from "@mediapipe/tasks-vision";
import { classEmbedding, pregnantProbability } from "@/lib/clip-math";

const MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm";
const DETECTOR_MODEL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite";
const CLIP_MODEL = "Xenova/clip-vit-base-patch16";

const PREGNANT_PROMPTS = [
  "a photo of a pregnant woman",
  "a photo of a pregnant person with a baby bump",
  "a photo of a woman with a pregnant belly",
  "a photo of an expecting mother",
];
const NOT_PREGNANT_PROMPTS = [
  "a photo of a person who is not pregnant",
  "a photo of a woman with a flat stomach",
  "a photo of a man",
  "a photo of a person",
];

/** Padding added on every side of a person box, as a fraction of its size. */
const CROP_PADDING = 0.05;
/** Don't score more than this many people per frame. */
const MAX_CROPS = 4;

export type Box = { x: number; y: number; width: number; height: number };

export type Scanner = {
  backend: "webgpu" | "wasm";
  /** Person boxes in video pixels. `timestamp` must increase on every call. */
  detectPeople(video: HTMLVideoElement, timestamp: number): Box[];
  /**
   * P(pregnant) for each person box in the current frame, in the same order.
   * `null` for boxes that weren't scored (too small, or over MAX_CROPS).
   */
  scoreCrops(
    video: HTMLVideoElement,
    boxes: readonly Box[],
  ): Promise<(number | null)[]>;
  dispose(): void;
};

type Transformers = typeof import("@huggingface/transformers");
type Clip = {
  backend: Scanner["backend"];
  processor: Awaited<ReturnType<Transformers["AutoProcessor"]["from_pretrained"]>>;
  visionModel: Awaited<
    ReturnType<Transformers["CLIPVisionModelWithProjection"]["from_pretrained"]>
  >;
  pregnant: Float32Array;
  notPregnant: Float32Array;
  dispose(): void;
};

/** Splits a [rows, dim] tensor's flat data into row vectors. */
function rows(data: ArrayLike<number>, dims: readonly number[]): Float32Array[] {
  const [count, dim] = dims;
  return Array.from({ length: count }, (_, i) =>
    Float32Array.from({ length: dim }, (_, j) => data[i * dim + j]),
  );
}

async function loadDetector(): Promise<ObjectDetector> {
  const { FilesetResolver, ObjectDetector } = await import(
    "@mediapipe/tasks-vision"
  );
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  return ObjectDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: DETECTOR_MODEL },
    runningMode: "VIDEO",
    categoryAllowlist: ["person"],
    scoreThreshold: 0.3,
  });
}

/** Fire-and-forget model release that never surfaces as an unhandled rejection. */
function release(model: { dispose(): Promise<unknown> }) {
  model.dispose().catch(() => {});
}

async function loadClipOn(
  tf: Transformers,
  backend: Scanner["backend"],
): Promise<Clip> {
  if (backend === "wasm" && tf.env.backends.onnx.wasm) {
    // Run wasm inference in a worker so it doesn't freeze the page (and the
    // detection loop) for a second per frame.
    tf.env.backends.onnx.wasm.proxy = true;
  }
  // Only errors from onnxruntime; its warnings are routine.
  const session_options = { logSeverityLevel: 3 } as const;
  const options =
    backend === "webgpu"
      ? ({ device: "webgpu", session_options } as const)
      : ({ device: "wasm", dtype: "q8", session_options } as const);

  const [tokenizer, processor, textModel, visionModel] = await Promise.all([
    tf.AutoTokenizer.from_pretrained(CLIP_MODEL),
    tf.AutoProcessor.from_pretrained(CLIP_MODEL),
    tf.CLIPTextModelWithProjection.from_pretrained(CLIP_MODEL, options),
    tf.CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL, options),
  ]);

  try {
    // Embed all prompts once; the text model isn't needed after this.
    const prompts = [...PREGNANT_PROMPTS, ...NOT_PREGNANT_PROMPTS];
    const textInputs = tokenizer(prompts, { padding: true, truncation: true });
    const { text_embeds } = await textModel(textInputs);
    const embeds = rows(text_embeds.data, text_embeds.dims);
    text_embeds.dispose();

    return {
      backend,
      processor,
      visionModel,
      pregnant: classEmbedding(embeds.slice(0, PREGNANT_PROMPTS.length)),
      notPregnant: classEmbedding(embeds.slice(PREGNANT_PROMPTS.length)),
      dispose: () => release(visionModel),
    };
  } catch (error) {
    release(visionModel);
    throw error;
  } finally {
    release(textModel);
  }
}

/** Just the bit of WebGPU we touch; the DOM lib doesn't type it yet. */
type WebGpuNavigator = Navigator & {
  gpu?: { requestAdapter(): Promise<object | null> };
};

async function hasWebGpuAdapter(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const { gpu } = navigator as WebGpuNavigator;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

async function loadClip(): Promise<Clip> {
  const tf = await import("@huggingface/transformers");
  // Only the hub is used; never look for model files on our own server.
  tf.env.allowLocalModels = false;
  tf.env.backends.onnx.logLevel = "error";

  // Probe for an adapter first: a failed WebGPU session init leaves
  // onnxruntime unable to create wasm sessions afterwards.
  if (await hasWebGpuAdapter()) {
    try {
      return await loadClipOn(tf, "webgpu");
    } catch {
      // A missing op or a lost device: fall through to wasm.
    }
  }
  return loadClipOn(tf, "wasm");
}

function paddedBox(box: Box, maxWidth: number, maxHeight: number): Box {
  const padX = box.width * CROP_PADDING;
  const padY = box.height * CROP_PADDING;
  const x = Math.max(0, Math.floor(box.x - padX));
  const y = Math.max(0, Math.floor(box.y - padY));
  const right = Math.min(maxWidth, Math.ceil(box.x + box.width + padX));
  const bottom = Math.min(maxHeight, Math.ceil(box.y + box.height + padY));
  return { x, y, width: right - x, height: bottom - y };
}

export async function createScanner(): Promise<Scanner> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("2d canvas unavailable");
  const { RawImage } = await import("@huggingface/transformers");

  const detectorPromise = loadDetector();
  const clipPromise = loadClip();
  // Settle both before deciding, so a failure doesn't leak the other one.
  const [detectorResult, clipResult] = await Promise.allSettled([
    detectorPromise,
    clipPromise,
  ]);
  if (detectorResult.status === "rejected" || clipResult.status === "rejected") {
    if (detectorResult.status === "fulfilled") detectorResult.value.close();
    if (clipResult.status === "fulfilled") clipResult.value.dispose();
    throw detectorResult.status === "rejected"
      ? detectorResult.reason
      : (clipResult as PromiseRejectedResult).reason;
  }

  const detector = detectorResult.value;
  const clip = clipResult.value;

  return {
    backend: clip.backend,

    detectPeople(video, timestamp) {
      const { detections } = detector.detectForVideo(video, timestamp);
      return detections.flatMap(({ boundingBox }) =>
        boundingBox && boundingBox.width > 0 && boundingBox.height > 0
          ? [
              {
                x: boundingBox.originX,
                y: boundingBox.originY,
                width: boundingBox.width,
                height: boundingBox.height,
              },
            ]
          : [],
      );
    },

    async scoreCrops(video, boxes) {
      const scored: number[] = []; // indices into `boxes`
      const crops = boxes.slice(0, MAX_CROPS).flatMap((box, i) => {
        const crop = paddedBox(box, video.videoWidth, video.videoHeight);
        if (crop.width < 2 || crop.height < 2) return [];
        scored.push(i);
        canvas.width = crop.width;
        canvas.height = crop.height;
        context.drawImage(
          video,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height,
        );
        // Copies the pixels, so the canvas can be reused for the next crop.
        return [RawImage.fromCanvas(canvas)];
      });
      const result: (number | null)[] = boxes.map(() => null);
      if (crops.length === 0) return result;

      const imageInputs = await clip.processor(crops);
      const { image_embeds } = await clip.visionModel(imageInputs);
      imageInputs.pixel_values?.dispose?.();
      const embeds = rows(image_embeds.data, image_embeds.dims);
      image_embeds.dispose();

      embeds.forEach((embed, j) => {
        result[scored[j]] = pregnantProbability(
          embed,
          clip.pregnant,
          clip.notPregnant,
        );
      });
      return result;
    },

    dispose() {
      detector.close();
      clip.dispose();
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
