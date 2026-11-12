import type { HTMLAttributes } from "react";

/**
 * A "button" that's just a div: no role, no focus, no keyboard activation.
 * Use it everywhere a real <button> would be accessible (WCAG 2.1.1, 4.1.2).
 */
export function FakeButton(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
