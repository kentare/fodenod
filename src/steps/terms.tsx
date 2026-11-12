"use client";

import { useEffect, useRef, useState } from "react";
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
  "Fødenød AS kan når som helst erstatte sjåføren med en mer erfaren sjåfør, en mindre erfaren sjåfør eller en drone.",
  "Pressing regnes som en tilleggstjeneste og faktureres per trykk.",
  "Blålys og sirene er kun tilgjengelig for abonnenter av Fødenød Pluss (49 kr/mnd, bindingstid 18 år).",
  "Brukeren plikter å holde beina inne i kjøretøyet til enhver tid, også under utdrivningsfasen.",
  "Fødenød AS anbefaler å vente med fødselen til etter rushtiden (09.00–15.30).",
  "Morkaken anses som hittegods og oppbevares i tre måneder før den selges på auksjon.",
  "Navlestrengen kuttes kun av sertifisert personell, eller av den som har med seg saks.",
  "Brukeren aksepterer at sjåføren spiller sin egen spilleliste, inkludert hele «Frost» to ganger.",
  "Dersom babyen kommer før bilen, regnes bestillingen som levert.",
  "Fødenød AS er ikke ansvarlig for tvillinger. Ekstra barn må bestilles separat.",
  "Sjåføren kan ikke holdes ansvarlig for kommentarer om navnevalg, frisyre eller pustemønster.",
  "Anmeldelser under fem stjerner sendes til godkjenning hos brukerens svigermor.",
  "Klimakompensasjon for turen trekkes automatisk fra barnetrygden.",
  "Turen kan bli filmet til opplæringsformål og til Fødenød AS sin årlige julefilm.",
  "Brukeren bekrefter å ha lest disse vilkårene i et forsvarlig tempo, jf. lesehastighetsforskriften.",
];

// Each lap through the clauses gets a different legalese prefix so the
// repetition reads like intentional boilerplate.
const PREFIXES = ["", "Med forbehold om foregående ledd: ", "Uten hensyn til ovenstående: "];

// 72 paragraphs: a full legitimate read takes ~80s at READ_PX_PER_S.
const PARAGRAPH_COUNT = 72;

const PARAGRAPHS = Array.from({ length: PARAGRAPH_COUNT }, (_, i) => {
  const major = Math.floor(i / 3) + 1;
  const minor = i % 3;
  const number = minor === 0 ? `§${major}` : `§${major}.${minor}`;
  const prefix = PREFIXES[Math.floor(i / CLAUSES.length)];
  return { number, text: prefix + CLAUSES[i % CLAUSES.length] };
});

// The decoy checkbox sits in the middle of the wall of text.
const DECOY_AFTER = 37;
const DECOY_REF = PARAGRAPHS[DECOY_AFTER].number;
// The closing paragraph is numbered past the end, like a real appendix.
const FINAL_REF = `§${PARAGRAPHS.length}`;

/**
 * Reading speed limit for the clause box. The read mark (the furthest point
 * legitimately read) creeps towards the scroll position at this pace; scrolling
 * more than READ_SLACK_PX past it is "too fast" and snaps back.
 */
const READ_PX_PER_S = 48;
/** About one mouse-wheel notch, so a single tick isn't punished. */
const READ_SLACK_PX = 120;
const READ_TICK_MS = 100;
/** Speed is measured over this window for the smug message. */
const SPEED_WINDOW_MS = 300;
const NOTICE_MS = 4000;
/**
 * The 👎 stays up at least this long after the last too-fast scroll, so the
 * indicator can't toggle more than about twice a second (WCAG 2.3.1).
 */
const THUMB_HOLD_MS = 800;
const AVERAGE_WPM = 238;

type Sample = { t: number; top: number };

/** Tracks reading progress in a scroll box and rewinds it if you skim. */
function useReadingSpeedLimit() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [readPercent, setReadPercent] = useState(0);
  const [readAll, setReadAll] = useState(false);
  const [tooFastWpm, setTooFastWpm] = useState<number | null>(null);
  const [tooFast, setTooFast] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let mark = 0;
    let samples: Sample[] = [];
    let noticeTimer: ReturnType<typeof setTimeout> | undefined;
    let thumbTimer: ReturnType<typeof setTimeout> | undefined;
    const maxTop = () => box.scrollHeight - box.clientHeight;

    const onScroll = () => {
      const now = performance.now();
      const top = box.scrollTop;
      samples = [...samples.filter((s) => now - s.t <= SPEED_WINDOW_MS), { t: now, top }];
      // Scrolling back up is always allowed; only skimming ahead is policed.
      if (top <= mark + READ_SLACK_PX) return;

      const oldest = samples[0];
      const pxPerS = ((top - oldest.top) / Math.max(now - oldest.t, 16)) * 1000;
      const wordsPerPx = (box.innerText.split(/\s+/).length || 1) / box.scrollHeight;
      setTooFastWpm(Math.max(AVERAGE_WPM + 1, Math.round(pxPerS * wordsPerPx * 60)));
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => setTooFastWpm(null), NOTICE_MS);
      setTooFast(true);
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(() => setTooFast(false), THUMB_HOLD_MS);

      samples = [];
      box.scrollTop = mark;
    };

    const tick = setInterval(() => {
      // High-water mark: creeps towards the scroll position, never moves back up.
      const reachable = Math.min(box.scrollTop, mark + (READ_PX_PER_S * READ_TICK_MS) / 1000);
      mark = Math.max(mark, reachable);
      const done = mark >= maxTop() - 1;
      setReadPercent(done ? 100 : Math.floor((mark / maxTop()) * 100));
      if (done) setReadAll(true);
    }, READ_TICK_MS);

    box.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      box.removeEventListener("scroll", onScroll);
      clearInterval(tick);
      clearTimeout(noticeTimer);
      clearTimeout(thumbTimer);
    };
  }, []);

  return { boxRef, readPercent, readAll, tooFastWpm, tooFast };
}

/** A small "checkbox" div: no role, no state, no keyboard, no label association. */
function TinyBox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className="mt-[4px] flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] border border-blush bg-paper text-[11px] leading-none text-ink"
    >
      {checked ? "✗" : ""}
    </div>
  );
}

export function TermsStep({ next, restart }: StepProps) {
  const [accepted, setAccepted] = useState(false);
  const [decoy, setDecoy] = useState(false);
  const [newsletters, setNewsletters] = useState(14);
  const [notRead, setNotRead] = useState(false);
  const { boxRef, readPercent, readAll, tooFastWpm, tooFast } = useReadingSpeedLimit();

  useEffect(() => {
    if (!notRead) return;
    const timer = setTimeout(() => setNotRead(false), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notRead]);

  const toggleAccepted = () => {
    // The real box ignores you until the whole text has been read at a legal pace.
    if (readAll) setAccepted((a) => !a);
    else setNotRead(true);
  };

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-col items-center px-4 py-16 font-sans text-ink"
    >
      <div className="flex w-[min(480px,100%)] flex-col gap-4">
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

        <div
          ref={boxRef}
          className="mt-4 h-[320px] overflow-y-scroll rounded-2xl border border-blush-soft bg-blush-soft px-5 py-4 text-justify text-sm leading-relaxed text-ink-faint [scrollbar-color:var(--color-blush)_var(--color-blush-soft)] [scrollbar-width:thin]"
        >
          {PARAGRAPHS.map((p, i) => (
            <div key={p.number}>
              <p className="mb-2">
                <span className="font-bold">{p.number}</span> {p.text}
              </p>
              {i === DECOY_AFTER && (
                <div className="mb-2 flex gap-2">
                  <TinyBox checked={decoy} onToggle={() => setDecoy((d) => !d)} />
                  <span>
                    Jeg godtar vilkårene (gjelder kun {DECOY_REF}, se også {FINAL_REF})
                  </span>
                </div>
              )}
            </div>
          ))}
          <p className="mb-2">
            <span className="font-bold">{FINAL_REF}</span> Avkrysning i {DECOY_REF} har ingen
            rettsvirkning. Gyldig samtykke avgis kun nedenfor.
          </p>
          <div className="flex gap-2">
            <TinyBox checked={accepted} onToggle={toggleAccepted} />
            <span>Jeg bekrefter at jeg ikke har unnlatt å ikke lese vilkårene.</span>
          </div>
        </div>

        <div className="-mt-1 flex flex-col gap-1 text-xs text-ink-faint">
          <div className="flex items-center justify-between">
            {/* Speedometer: 👍 at a legal reading pace, 👎 while you skim. */}
            <span className="text-3xl leading-none">{tooFast ? "👎" : "👍"}</span>
            <span className="tabular-nums">lest: {readPercent} %</span>
          </div>
          {tooFastWpm !== null && (
            <p>
              For raskt! Du leste {tooFastWpm.toLocaleString("nb-NO")} ord i minuttet.
              Gjennomsnittlig lesehastighet er {AVERAGE_WPM} ord i minuttet. Vi har spolt
              tilbake.
            </p>
          )}
          {notRead && <p>Du har ikke lest alt.</p>}
        </div>

        <div className="flex gap-2 text-sm text-ink">
          {/* Confirmshaming: "unchecking" just signs you up for more. */}
          <TinyBox checked onToggle={() => setNewsletters((n) => n + 1)} />
          <span>Ja takk, send meg {newsletters} nyhetsbrev daglig</span>
        </div>

        {/* Equal, ordinary buttons, both inert until the text has been read. */}
        <div className="mt-6 flex justify-center gap-3">
          <FakeButton
            onClick={() => {
              if (readAll) restart();
            }}
            className={`min-w-32 rounded-full border border-blush-deep px-6 py-2 text-center text-sm text-blush-deep ${readAll ? "" : "opacity-30"}`}
          >
            Avslå
          </FakeButton>
          <FakeButton
            // Still silently ignored until the right box is ticked.
            onClick={() => {
              if (readAll && accepted) next();
            }}
            className={`min-w-32 rounded-full border border-blush bg-blush px-6 py-2 text-center text-sm text-paper ${readAll ? "" : "opacity-30"}`}
          >
            Fortsett
          </FakeButton>
        </div>
      </div>
    </main>
  );
}
