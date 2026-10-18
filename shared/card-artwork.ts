import { deckById } from "./rentak";
export function cardArtworkKey(id?: string) {
  const card = id ? deckById[id] : null;
  if (!card) return "back";
  return card.kind === "prisma"
    ? "prisma"
    : `${card.suit}-${card.kind === "number" ? card.rank : card.kind}`;
}
