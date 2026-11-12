/**
 * MediaPipe and onnxruntime print routine status lines through
 * `console.error` / `console.warn`, and the Next.js dev overlay reports every
 * `console.error` as an error. While the verify step is mounted, known benign
 * library lines are rerouted to `console.debug`. Everything else passes
 * through untouched.
 */

const BENIGN: readonly RegExp[] = [
  // MediaPipe / TFLite: "INFO: Created TensorFlow Lite XNNPACK delegate for CPU."
  /^INFO: /,
  // glog-style lines from MediaPipe's graph runner: "I1112 17:49:58.681 ...", "W1112 ..."
  /^[IW]\d{4} \d{2}:\d{2}:\d{2}/,
  // onnxruntime warnings, possibly prefixed with an ANSI colour code.
  /^(?:\x1b\[[\d;]*m)?\d{4}-\d{2}-\d{2} [\d:.]+ \[[IW]:onnxruntime:/,
  // transformers.js: 'dtype not specified for "text_model". Using the default dtype (fp32) …'
  /^dtype not specified for "/,
];

export function isBenignLibraryLog(args: readonly unknown[]): boolean {
  const [first] = args;
  return typeof first === "string" && BENIGN.some((re) => re.test(first));
}

type Level = "error" | "warn";
const LEVELS: readonly Level[] = ["error", "warn"];

let installs = 0;
let originals: Partial<Record<Level, Console[Level]>> = {};

/**
 * Installs the filter and returns a function that removes it. Nested installs
 * (e.g. React Strict Mode's double mount) are reference-counted.
 */
export function quietLibraryLogs(): () => void {
  if (installs++ === 0) {
    originals = {};
    for (const level of LEVELS) {
      const original = console[level];
      originals[level] = original;
      console[level] = (...args: unknown[]) => {
        if (isBenignLibraryLog(args)) console.debug(...args);
        else original.apply(console, args);
      };
    }
  }

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    if (--installs > 0) return;
    for (const level of LEVELS) {
      const original = originals[level];
      if (original) console[level] = original;
    }
    originals = {};
  };
}
