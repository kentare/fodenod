"use client";

import { useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";
import { getTransport } from "@/steps/transport-options";

/** Characters picked to be as confusable as possible. */
const CONFUSABLE = "0OoQDl1Ii|5SsZ2B8";
const STARS = 5;

function randomOrderNumber() {
  const group = () =>
    Array.from(
      { length: 7 },
      () => CONFUSABLE[Math.floor(Math.random() * CONFUSABLE.length)],
    ).join("");
  return Array.from({ length: 6 }, group).join("-");
}

export function EndStep({ data, restart }: StepProps) {
  const transport = getTransport(data.transport);
  const [orderNumber] = useState(randomOrderNumber);
  const [hovered, setHovered] = useState<number | null>(null);
  const [rated, setRated] = useState(false);
  const [cancelTried, setCancelTried] = useState(false);
  const [trackTried, setTrackTried] = useState(false);

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-col items-center bg-[#ffffcc] px-4 py-10 font-serif text-[#777755]"
    >
      {/* A <marquee> in spirit; JSX doesn't type the real element anymore. */}
      <style>{`@keyframes end-ticker { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }`}</style>
      <div className="mb-6 w-full overflow-hidden whitespace-nowrap bg-[#ffff99] py-1 text-xs text-[#bbbb66]">
        <div className="inline-block animate-[end-ticker_18s_linear_infinite]">
          Estimert ankomst: 3–40 virkedager *** Takk for at du valgte fødenød
          *** Vi gjør vårt beste (resultatene kan variere)
        </div>
      </div>

      <table className="w-[min(560px,92vw)] border-4 border-double border-[#cccc88] bg-[#fffff0]">
        <tbody>
          <tr>
            <td className="border-b border-[#eeeeaa] p-4 text-center">
              <p className="text-xs italic">
                Hei {data.name ?? "{{fornavn}}"},
              </p>
              <h1 className="mt-2 text-3xl text-[#c0c070]">
                Gratulerer! 🎉 Din {transport.name.toLowerCase()}{" "}
                {transport.emoji} er bestilt.
              </h1>
            </td>
          </tr>
          <tr>
            <td className="border-b border-[#eeeeaa] p-4 text-sm">
              <b>Estimert ankomst:</b> 3–40 virkedager
              <br />
              <span className="text-[9px]">
                (lørdag, søndag, helligdager og fullmåne regnes ikke som
                virkedager)
              </span>
            </td>
          </tr>
          <tr>
            <td className="border-b border-[#eeeeaa] p-4">
              <p className="text-[10px]">
                Ordrenummer (oppgi ved alle henvendelser):
              </p>
              <p className="break-all text-[11px] italic tracking-tighter text-[#d8d8a8]">
                {orderNumber}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border-b border-[#eeeeaa] p-4 text-center">
              <p className="text-xs">Hvordan var din opplevelse?</p>
              {/* Backwards: leftmost star is the worst, and highlighting fills
                  from the right. Yellow on yellow, so colour is the only cue. */}
              <div
                className="mt-1 flex justify-center gap-1 text-3xl"
                onMouseLeave={() => setHovered(null)}
              >
                {Array.from({ length: STARS }, (_, i) => (
                  <FakeButton
                    key={i}
                    onMouseEnter={() => setHovered(i)}
                    onClick={() => setRated(true)}
                    className={
                      hovered !== null && i >= hovered
                        ? "text-[#f5e66b]"
                        : "text-[#f0f0c0]"
                    }
                  >
                    ★
                  </FakeButton>
                ))}
              </div>
              <div className="flex justify-between px-24 text-[8px]">
                <span>dårligst</span>
                <span>best?</span>
              </div>
              {rated && (
                <p className="mt-2 text-xs text-[#aa8844]">
                  Takk for din 1-stjernes vurdering! Vi beklager at du ikke var
                  fornøyd. Vurderingen er videresendt til jordmoren din.
                </p>
              )}
            </td>
          </tr>
          <tr>
            <td className="p-4 text-center">
              <FakeButton
                onClick={() => setTrackTried(true)}
                className="mx-auto w-fit border-4 border-[#ddddaa] [border-style:outset] bg-[#eeeebb] px-8 py-3 text-lg text-[#999966]"
              >
                📍 Spor sjåføren
              </FakeButton>
              {trackTried && (
                <p className="mt-2 text-[10px]">
                  Sporing er tilgjengelig fra og med 2031. Prøv å se ut av
                  vinduet.
                </p>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-6 text-[10px]">
        {cancelTried ? (
          "Avbestilling må skje senest 72 timer før fødselen."
        ) : (
          <FakeButton
            onClick={() => setCancelTried(true)}
            className="inline text-[#9999ff] underline"
          >
            Har du allerede født? Avbestill her
          </FakeButton>
        )}
      </div>

      <FakeButton
        onClick={restart}
        className="mt-16 self-start text-[9px] text-[#ccccaa]"
      >
        Start på nytt
      </FakeButton>
    </main>
  );
}
