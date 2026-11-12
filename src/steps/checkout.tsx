"use client";

import { useEffect, useState } from "react";
import type { StepProps } from "@/app/steps";
import { FakeButton } from "@/components/fake-button";
import { formatNok, PRICIEST } from "@/steps/transport-options";

/** You pay for the priciest ride up front; you choose the actual one later. */
const PREPAID = PRICIEST;
const BOOKING_FEE = 149;
const FEE_FOR_FEE_RATE = 0.1;
const ENV_PERCENT = 7;
const ENV_MIN = 29;
const MIL_FEE = 499;
const TIP_MIN = 10;
const TIP_MAX = 50;
const TIP_DEFAULT = 25;
const OFFER_SECONDS = 59;
const MONTHS = 36;
const INTEREST = 1.299;

type AddonId = "priority" | "insurance" | "mil";

const ADDONS: {
  id: AddonId;
  label: string;
  price: number;
  /** Confirmshaming: OK means "yes, I'm a bad person". */
  shame: string;
}[] = [
  {
    id: "priority",
    label: "Prioritert fødsel",
    price: 4999,
    shame:
      "Vil du virkelig fjerne Prioritert fødsel?\n\nBabyen din havner bakerst i køen, bak en mann med vondt i lillefingeren.\n\nTrykk OK for å la babyen vente.",
  },
  {
    id: "insurance",
    label: "Babyforsikring (første 18 år)",
    price: 1299,
    shame:
      "Fjerne Babyforsikring?\n\nGreit. Vi håper bare babyen din aldri faller ned fra noe de neste 18 årene.\n\nTrykk OK hvis du tar sjansen med ditt eget barn.",
  },
  {
    id: "mil",
    label: "Svigermor-modus: hun blir med",
    price: 0,
    shame:
      "Fjerne Svigermor-modus?\n\nHun har allerede pakket. Hun står i gangen. Hun har kjøpt ny kåpe til anledningen.\n\nTrykk OK for å ringe og fortelle henne det selv.",
  },
];

/**
 * Forgiving comparison for a hand-copied gravID: case, spaces and dashes don't
 * matter, and O/0 and I/L/1 count as the same character.
 */
function normalizeGravId(id: string) {
  return id
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

function tipShame(percent: number) {
  if (percent >= 40) return "Sjåføren feller en tåre av glede.";
  if (percent >= 25) return "Helt OK, antar vi.";
  if (percent >= 15) return "Sjåføren har tre barn og en hest å fø.";
  return "Sjåføren gråter nå. Håper du er fornøyd.";
}

/**
 * A checkout full of dark patterns, shown before you've even picked a
 * transport. You pre-pay for the most expensive one (non-refundable), plus
 * junk fees, pre-checked add-ons guarded by confirmshaming, a tip with a 10%
 * floor, fake urgency that quietly resets, and a filled pink decoy pill above
 * a ghost "pay" link.
 */
export function CheckoutStep({ next, data }: StepProps) {
  const [addons, setAddons] = useState<Record<AddonId, boolean>>({
    priority: true,
    insurance: true,
    mil: true,
  });
  const [tip, setTip] = useState(TIP_DEFAULT);
  const [seconds, setSeconds] = useState(OFFER_SECONDS);
  const [upsellNote, setUpsellNote] = useState<string | null>(null);
  const [gravIdInput, setGravIdInput] = useState("");
  const [gravIdError, setGravIdError] = useState(false);

  // Fake urgency: counts down, then silently starts over.
  useEffect(() => {
    const timer = setInterval(
      () => setSeconds((s) => (s <= 0 ? OFFER_SECONDS : s - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  const toggle = (id: AddonId, shame: string) => {
    if (!addons[id]) {
      setAddons((a) => ({ ...a, [id]: true }));
      return;
    }
    if (window.confirm(shame)) setAddons((a) => ({ ...a, [id]: false }));
  };

  const addMore = () => {
    setAddons({ priority: true, insurance: true, mil: true });
    setTip((t) => Math.min(TIP_MAX, t + 5));
    setUpsellNote(
      "Alle tillegg er lagt til igjen, og vi har rundet opp driksen. Flere tillegg kommer snart!",
    );
  };

  /** Pays only with the gravID from the registration step (or any, if none was issued). */
  const pay = () => {
    const entered = normalizeGravId(gravIdInput);
    const ok =
      entered !== "" &&
      (data.gravId === undefined || entered === normalizeGravId(data.gravId));
    setGravIdError(!ok);
    if (ok) next();
  };

  const envFee = Math.max(
    ENV_MIN,
    Math.round((PREPAID.price * ENV_PERCENT) / 100),
  );
  const addonTotal = ADDONS.reduce(
    (sum, a) => sum + (addons[a.id] ? a.price : 0),
    0,
  );
  const tipAmount = Math.round((PREPAID.price + addonTotal) * tip) / 100;

  const lines: { label: string; amount: number }[] = [
    { label: "Transport: velges senere", amount: 0 },
    {
      label: `Forhåndsbelastning: dyreste transportmiddel (${PREPAID.name.toLowerCase()}, refunderes ikke)`,
      amount: PREPAID.price,
    },
    { label: "Bestillingsgebyr", amount: BOOKING_FEE },
    { label: "Gebyr for gebyr (10 %)", amount: BOOKING_FEE * FEE_FOR_FEE_RATE },
    {
      label: `Miljøavgift (${ENV_PERCENT} %, min. ${ENV_MIN} kr)`,
      amount: envFee,
    },
    ...ADDONS.filter((a) => addons[a.id]).map((a) => ({
      label: a.label,
      amount: a.price,
    })),
    ...(addons.mil
      ? [{ label: "Svigermor-håndteringsgebyr", amount: MIL_FEE }]
      : []),
    { label: `Driks (${tip} %)`, amount: tipAmount },
  ];
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const monthly = Math.round((total * INTEREST) / MONTHS);

  return (
    <main
      aria-hidden
      className="flex min-h-screen flex-col items-center px-6 py-16 text-ink"
    >
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-light tracking-tight text-blush-deep">
            Kasse
          </h1>
          <span className="rounded-full bg-blush-soft px-3 py-1 text-[11px] tabular-nums">
            Tilbudet utløper om 0:{String(seconds).padStart(2, "0")}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-[10px] uppercase tracking-widest text-ink-faint">
            Anbefalt for deg
          </h2>
          {ADDONS.map((a) => (
            <FakeButton
              key={a.id}
              onClick={() => toggle(a.id, a.shame)}
              className="flex items-center gap-3 rounded-2xl border border-blush-soft bg-paper px-4 py-3 text-sm"
            >
              {/* Ticked vs unticked differs only by a pale pink fill. */}
              <span
                className={`h-4 w-4 shrink-0 rounded-full border border-blush ${
                  addons[a.id] ? "bg-blush" : "bg-paper"
                }`}
              />
              <span className="flex-1">{a.label}</span>
              <span className="text-xs">
                {a.price === 0 ? "Gratis!" : `+${formatNok(a.price)}`}
              </span>
            </FakeButton>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[10px] uppercase tracking-widest text-ink-faint">
              Driks til sjåføren
            </h2>
            <span className="text-sm tabular-nums">{tip} %</span>
          </div>
          <input
            type="range"
            min={TIP_MIN}
            max={TIP_MAX}
            value={tip}
            onChange={(e) => setTip(Number(e.target.value))}
            className="h-1 w-full appearance-none rounded-full bg-blush-soft [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blush [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blush"
          />
          <span className="text-[10px] text-ink-faint">{tipShame(tip)}</span>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-blush-soft bg-paper p-5">
          <ul className="flex flex-col gap-1.5 text-xs">
            {lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-4">
                <span className="text-ink-faint">{l.label}</span>
                <span className="shrink-0 tabular-nums">
                  {l.amount === 0 ? "Gratis!" : formatNok(l.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-center border-t border-blush-soft pt-4">
            <span className="text-[10px] text-ink-faint">kun</span>
            <span className="text-4xl font-light tabular-nums text-blush-deep">
              {formatNok(monthly)}
              <span className="text-sm text-ink">/mnd*</span>
            </span>
            <span className="mt-1 flex gap-2 text-[10px] tabular-nums text-ink-faint">
              <span className="line-through">{formatNok(total * 1.6)}</span>
              <span>totalt {formatNok(total)}</span>
            </span>
          </div>
        </div>

        {/* Placeholder as the only label; the hint is fine print (WCAG 3.3.2). */}
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={gravIdInput}
            onChange={(e) => setGravIdInput(e.target.value)}
            placeholder="gravID"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-full border border-blush bg-blush-soft px-4 py-2 text-sm font-light tracking-widest text-ink placeholder:tracking-normal placeholder:text-ink-faint"
          />
          <span className="px-4 text-[9px] text-ink-faint">
            Påkrevd. Du fikk den tidligere. Vi kan ikke sende den på nytt.
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          {/* The wrong action is the primary pill. */}
          <FakeButton
            onClick={addMore}
            className="w-full rounded-full bg-blush py-4 text-center text-base text-paper"
          >
            Legg til flere tillegg
          </FakeButton>
          {upsellNote && (
            <span className="text-center text-[11px]">{upsellNote}</span>
          )}
          <FakeButton onClick={pay} className="text-[10px] text-ink">
            fullfør betaling
          </FakeButton>
          {/* WCAG 3.3.1: vague, faint, and red only in theory. */}
          <span className="h-3 text-center text-[10px] text-[#ea8cad]">
            {gravIdError && "Ugyldig gravID. Eller gyldig, men feil."}
          </span>
        </div>

        <p className="text-center text-[9px] leading-snug text-ink-faint">
          *Delbetaling over {MONTHS} måneder, effektiv rente 29,9 %. Førpris er
          en pris vi kunne ha tatt. Forhåndsbelastningen refunderes ikke,
          uansett hvilken transport du velger senere. Beløpet trekkes automatisk
          fra kortet du oppga tidligere, også hvis du lukker siden. Driks går
          til sjåføren eller til oss. Svigermor-modus kan ikke angres etter
          fødsel. Ved å fortsette godtar du vilkårene du godtok tidligere, og
          noen nye.
        </p>
      </div>
    </main>
  );
}
