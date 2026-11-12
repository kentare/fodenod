"use client";

import { useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";
import {
  formatNok,
  getTransport,
  PRICIEST,
  TRANSPORTS,
  type TransportId,
} from "@/steps/transport-options";

/**
 * A ride picker in the house style. Every row looks bookable and shows a
 * price, but only the scooter actually exists. "Unavailable" is a fade and a
 * whisper, not a state (WCAG 1.4.1), the sold-out ambulance comes preselected,
 * and the filled pink pill happily offers to book it anyway.
 */
export function TransportStep({ next, setData }: StepProps) {
  const [selected, setSelected] = useState<TransportId>("ambulance");
  const [refusal, setRefusal] = useState<string | null>(null);
  const choice = getTransport(selected);

  const select = (id: TransportId) => {
    setSelected(id);
    setRefusal(null);
  };

  const book = () => {
    if (!choice.available) {
      setRefusal(`${choice.name} er ikke tilgjengelig i ditt område.`);
      return;
    }
    setData({ transport: choice.id });
    next();
  };

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-ink"
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-light tracking-tight text-blush-deep">
            Velg transport
          </h1>
          <span className="text-[10px] text-ink-faint">Til: Sykehuset</span>
        </div>

        <div className="flex flex-col gap-2">
          {TRANSPORTS.map((t) => (
            <FakeButton
              key={t.id}
              onClick={() => select(t.id)}
              className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${
                t.id === selected
                  ? "border-blush-deep bg-blush-soft"
                  : "border-blush-soft bg-paper"
              } ${t.available ? "" : "opacity-50"}`}
            >
              <span className="text-4xl leading-none">{t.emoji}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm">{t.name}</span>
                {t.available ? (
                  <span className="text-[10px] text-ink-faint">{t.eta}</span>
                ) : (
                  <span className="text-[9px] text-ink-faint">
                    Ikke tilgjengelig
                  </span>
                )}
                <span className="text-[9px] text-ink-faint">{t.blurb}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums">
                {formatNok(t.price)}
              </span>
            </FakeButton>
          ))}
        </div>

        <FakeButton
          onClick={book}
          className="w-full rounded-full bg-blush py-4 text-center text-base text-paper"
        >
          Bestill {choice.name}
        </FakeButton>

        <p className="h-4 text-center text-[11px] text-ink-faint">{refusal}</p>

        <p className="text-center text-[9px] leading-snug text-ink-faint">
          Prisene er estimater og kan endres underveis. Du har allerede betalt
          for {PRICIEST.name.toLowerCase()}. Ingen refusjon.
        </p>
      </div>
    </main>
  );
}
