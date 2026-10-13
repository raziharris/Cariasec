import type { Category } from "../../../shared/game";
export const colors: Record<Category, string> = {
  R: "#c38a36",
  I: "#649c79",
  A: "#df795d",
  S: "#9a82be",
  E: "#5a8fb4",
  C: "#a19377",
};
export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
