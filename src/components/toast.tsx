"use client";

import { useEffect, useState } from "react";

const VISIBLE_MS = 3000;

/**
 * A small toast near the top of the screen (the bottom is where the snow
 * piles up). Show a message by bumping `id`; it fades out after ~3s.
 */
export function Toast({ message, id }: { message: string; id: number }) {
  const [shownId, setShownId] = useState<number | null>(null);

  useEffect(() => {
    if (id === 0) return;
    const show = setTimeout(() => setShownId(id), 0);
    const hide = setTimeout(() => setShownId(null), VISIBLE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [id]);

  const visible = shownId !== null && shownId === id;
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed top-16 left-1/2 z-[955] -translate-x-1/2 rounded-full border border-blush-deep bg-paper px-5 py-2 text-sm text-blush-deep transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
