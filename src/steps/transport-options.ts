export const TRANSPORTS = [
  {
    id: "ambulance",
    name: "Ambulanse",
    emoji: "🚑",
    price: 0,
    soldOut: true,
    blurb: "Mest populær! Ingen ledige.",
  },
  {
    id: "taxi",
    name: "Taxi (sjåføren er på pause)",
    emoji: "🚕",
    price: 2899,
    soldOut: false,
    blurb: "Ankommer når pausen er over. Taksameteret går allerede.",
  },
  {
    id: "scooter",
    name: "Elsparkesykkel",
    emoji: "🛴",
    price: 49,
    soldOut: false,
    blurb: "Batteri: 4 %. Hjelm ikke inkludert.",
  },
  {
    id: "tandem",
    name: "Tandemsykkel (du tråkker)",
    emoji: "🚲",
    price: 199,
    soldOut: false,
    blurb: "Sjåføren sitter bak og gir råd.",
  },
  {
    id: "horse",
    name: "Hest",
    emoji: "🐎",
    price: 1200,
    soldOut: false,
    blurb: "Erfaren. Litt sjenert. Heter Bjarne.",
  },
  {
    id: "cart",
    name: "Handlevogn",
    emoji: "🛒",
    price: 15,
    soldOut: false,
    blurb: "Ett hjul går sin egen vei. Pant: 10 kr.",
  },
  {
    id: "helicopter",
    name: "Helikopter",
    emoji: "🚁",
    price: 89999,
    soldOut: false,
    blurb: "Lander på taket. Sykehuset har ikke helikopterplass.",
  },
] as const;

export type Transport = (typeof TRANSPORTS)[number];
export type TransportId = Transport["id"];

export function getTransport(id: TransportId | undefined): Transport {
  return TRANSPORTS.find((t) => t.id === id) ?? TRANSPORTS[2];
}

export function formatNok(amount: number) {
  return `${amount.toLocaleString("nb-NO", { minimumFractionDigits: 2 })} kr`;
}
