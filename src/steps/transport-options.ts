export const TRANSPORTS = [
  { id: "ambulance", name: "Ambulanse", emoji: "🚑", price: 0, soldOut: true },
  { id: "taxi", name: "Taxi (sjåføren er på pause)", emoji: "🚕", price: 2899 },
  { id: "scooter", name: "Elsparkesykkel", emoji: "🛴", price: 49 },
  { id: "tandem", name: "Tandemsykkel (du tråkker)", emoji: "🚲", price: 199 },
  { id: "horse", name: "Hest", emoji: "🐎", price: 1200 },
  { id: "cart", name: "Handlevogn", emoji: "🛒", price: 15 },
  { id: "helicopter", name: "Helikopter", emoji: "🚁", price: 89999 },
] as const;

export type TransportId = (typeof TRANSPORTS)[number]["id"];

export function getTransport(id: TransportId | undefined) {
  return TRANSPORTS.find((t) => t.id === id) ?? TRANSPORTS[2];
}

export function formatNok(amount: number) {
  return `${amount.toLocaleString("nb-NO", { minimumFractionDigits: 2 })} kr`;
}
