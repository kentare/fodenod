"use client";

import { useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";

const CLAUSES = [
  "Fødenød AS fraskriver seg ethvert ansvar for fødsler som skjer under lasting.",
  "Brukeren samtykker i at babyen kan bli brukt i markedsføring, inkludert, men ikke begrenset til, plakater, TV-reklame og julekort.",
  "Vannavgang regnes ikke som en nødsituasjon før den er bekreftet skriftlig, med kopi til Fødenød AS sin juridiske avdeling.",
  "Rier som varer kortere enn 45 sekunder anses som innbilte og gir ikke rett til transport.",
  "Fødenød AS forbeholder seg retten til å endre disse vilkårene når som helst, også under pågående fødsel, uten varsel.",
  "Navn på barnet skal godkjennes av Fødenød AS. Forslaget «Fødenød» gir 10 % rabatt på neste fødsel.",
  "Sjåføren har rett til å stoppe for å kjøpe pølse i inntil 15 minutter per tur.",
  "Fødsler i kjøretøyet faktureres som ekstra passasjer etter gjeldende takst.",
  "Brukeren bekrefter at hun ikke er en mann, med mindre annet er oppgitt i §4.",
  "Pusteteknikk, skriking og andre lyder over 85 dB kan medføre gebyr for støyforurensning.",
  "Ved klage skal brukeren fylle ut skjema F-112b i tre eksemplarer og sende det med fax.",
  "Fødenød AS er ikke ansvarlig for kø, glatte veier, rødt lys, elg, eller at sjåføren har gått seg vill.",
  "Tvister løses ved voldgift i Vardø. Reise dit dekkes ikke.",
  "Brukeren gir Fødenød AS evigvarende rett til å dele posisjonsdata med utvalgte partnere (alle).",
  "Avbestilling etter at babyen er født refunderes ikke.",
];

// Each lap through the clauses gets a different legalese prefix so the
// repetition reads like intentional boilerplate.
const PREFIXES = ["", "Med forbehold om foregående ledd: ", "Uten hensyn til ovenstående: "];

const PARAGRAPHS = Array.from({ length: CLAUSES.length * PREFIXES.length }, (_, i) => {
  const major = Math.floor(i / 3) + 1;
  const minor = i % 3;
  const number = minor === 0 ? `§${major}` : `§${major}.${minor}`;
  const prefix = PREFIXES[Math.floor(i / CLAUSES.length)];
  return { number, text: prefix + CLAUSES[i % CLAUSES.length] };
});

// The decoy checkbox sits in the middle of the wall of text.
const DECOY_AFTER = 22;

/** A 9px "checkbox" div: no role, no state, no keyboard, no label association. */
function TinyBox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className="mt-[1px] flex h-[9px] w-[9px] shrink-0 items-center justify-center rounded-[2px] border border-blush bg-paper text-[8px] leading-none text-ink"
    >
      {checked ? "✗" : ""}
    </div>
  );
}

export function TermsStep({ next, restart }: StepProps) {
  const [accepted, setAccepted] = useState(false);
  const [decoy, setDecoy] = useState(false);
  const [newsletters, setNewsletters] = useState(14);

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-col items-center bg-paper px-4 py-16 font-sans text-ink"
    >
      <div className="flex w-[min(380px,100%)] flex-col gap-4">
        <p className="text-center text-[8px] uppercase tracking-[0.3em] text-ink-faint">
          Fødenød AS · Standardvilkår for akutt befordring · rev. 47.3b
        </p>
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-4xl font-extralight tracking-tight text-blush-deep">
            Vilkår og betingelser
          </h1>
          <p className="text-[9px] text-ink-faint">
            Gjeldende fra i går. Estimert lesetid: 4 t 12 min.
          </p>
        </div>

        <div className="mt-4 h-[160px] overflow-y-scroll rounded-2xl border border-blush-soft bg-blush-soft px-3 py-2 text-justify text-[9px] leading-[1.15] text-ink-faint [scrollbar-color:var(--color-blush)_var(--color-blush-soft)] [scrollbar-width:thin]">
          {PARAGRAPHS.map((p, i) => (
            <div key={p.number}>
              <p>
                <span className="font-bold">{p.number}</span> {p.text}
              </p>
              {i === DECOY_AFTER && (
                <div className="my-1 flex gap-1">
                  <TinyBox checked={decoy} onToggle={() => setDecoy((d) => !d)} />
                  <span>Jeg godtar vilkårene (gjelder kun §8.1, se også §45)</span>
                </div>
              )}
            </div>
          ))}
          <p className="mt-1">
            <span className="font-bold">§45</span> Avkrysning i §8.1 har ingen rettsvirkning.
            Gyldig samtykke avgis kun nedenfor.
          </p>
          <div className="mt-2 flex gap-1">
            <TinyBox checked={accepted} onToggle={() => setAccepted((a) => !a)} />
            <span>Jeg bekrefter at jeg ikke har unnlatt å ikke lese vilkårene.</span>
          </div>
        </div>

        <div className="flex gap-1 text-[10px] text-ink">
          {/* Confirmshaming: "unchecking" just signs you up for more. */}
          <TinyBox checked onToggle={() => setNewsletters((n) => n + 1)} />
          <span>Ja takk, send meg {newsletters} nyhetsbrev daglig</span>
        </div>

        <FakeButton
          onClick={restart}
          className="mt-8 rounded-full bg-blush py-5 text-center text-2xl font-light tracking-[0.3em] text-paper"
        >
          AVSLÅ
          <span className="block text-[10px] tracking-normal text-blush-soft">
            anbefalt av 9 av 10 jordmødre
          </span>
        </FakeButton>

        <FakeButton
          // Silently ignored until the right box is ticked: no disabled look, no message.
          onClick={() => {
            if (accepted) next();
          }}
          className="self-start text-[10px] text-ink-faint"
        >
          Fortsett
        </FakeButton>
      </div>
    </main>
  );
}
