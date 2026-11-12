/** Listed in the order the ride picker shows them: the only working one last. */
export const TRANSPORTS = [
  {
    id: "ambulance",
    name: "Ambulanse",
    emoji: "🚑",
    price: 18999,
    available: false,
    eta: "Ingen i nærheten",
    blurb: "Alle ambulanser står i kø ved Ikea.",
  },
  {
    id: "taxi",
    name: "Taxi",
    emoji: "🚕",
    price: 2899,
    available: false,
    eta: "Sjåføren er på pause",
    blurb: "Taksameteret går allerede.",
  },
  {
    id: "car",
    name: "Bil",
    emoji: "🚗",
    price: 1450,
    available: false,
    eta: "Nøklene er borte",
    blurb: "Partneren din leter fortsatt i sofaen.",
  },
  {
    id: "scooter",
    name: "Elsparkesykkel",
    emoji: "🛴",
    price: 49,
    available: true,
    eta: "3 min unna",
    blurb: "Batteri: 4 %. Hjelm ikke inkludert.",
  },
] as const;

export type Transport = (typeof TRANSPORTS)[number];
export type TransportId = Transport["id"];

const BY_ID = Object.fromEntries(TRANSPORTS.map((t) => [t.id, t])) as Record<
  TransportId,
  Transport
>;

/** Unknown or missing ids fall back to the scooter, the only thing that runs. */
export function getTransport(id: TransportId | undefined): Transport {
  return BY_ID[id ?? "scooter"] ?? BY_ID.scooter;
}

/** The priciest option, available or not. Checkout pre-charges it. */
export const PRICIEST: Transport = TRANSPORTS.reduce(
  (max: Transport, t) => (t.price > max.price ? t : max),
);

export function formatNok(amount: number) {
  return `${amount.toLocaleString("nb-NO", { minimumFractionDigits: 2 })} kr`;
}
