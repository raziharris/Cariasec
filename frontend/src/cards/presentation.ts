import type { Category } from "../../../shared/game";
export const colors: Record<Category, string> = {
  R: "#c93243",
  I: "#177649",
  A: "#7443c1",
  S: "#176bc2",
  E: "#ae5800",
  C: "#087e88",
};
export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
