import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { identities, suits, type Suit } from "../../../../shared/rentak";

const profiles: Record<
  Suit,
  { category: string; color: string; ms: string; en: string; art: string }
> = {
  R: {
    category: "Realistik",
    color: "#EDBA60",
    ms: "Bina. Baiki. Jadikan nyata.",
    en: "Build. Fix. Make it real.",
    art: "R1",
  },
  I: {
    category: "Investigatif",
    color: "#94D69A",
    ms: "Tanya. Kaji. Temui jawapan.",
    en: "Ask. Explore. Find answers.",
    art: "I3",
  },
  A: {
    category: "Artistik",
    color: "#FFA27B",
    ms: "Imaginasi jadi ciptaan.",
    en: "Turn imagination into creation.",
    art: "A2",
  },
  S: {
    category: "Sosial",
    color: "#D8ACF2",
    ms: "Dengar. Bantu. Bawa perubahan.",
    en: "Listen. Help. Make a difference.",
    art: "S2",
  },
  E: {
    category: "Enterprising",
    color: "#93BEFF",
    ms: "Pimpin idea. Cetus peluang.",
    en: "Lead ideas. Create opportunities.",
    art: "E3",
  },
  C: {
    category: "Konvensional",
    color: "#C2D5CF",
    ms: "Susun langkah. Pastikan tepat.",
    en: "Plan each step. Get it right.",
    art: "C2",
  },
};

export function IdentityCards({
  en,
  onSelect,
}: {
  en: boolean;
  onSelect: (suit: Suit) => void;
}) {
  return (
    <div className="rt-profile-grid">
      {suits.map((suit, index) => {
        const profile = profiles[suit];
        return (
          <button
            key={suit}
            className="rt-profile"
            onClick={() => onSelect(suit)}
            style={{ "--profile-color": profile.color } as CSSProperties}
          >
            <span className="rt-profile-category">
              <span>{suit}</span>
              {profile.category}
              <small>0{index + 1}</small>
            </span>
            <span className="rt-profile-portrait">
              <img
                src={`${import.meta.env.BASE_URL}cards/${profile.art}.webp`}
                alt=""
                draggable={false}
              />
            </span>
            <span className="rt-profile-copy">
              <strong>
                {en ? identities[suit].en : identities[suit].name}
              </strong>
              <span>{en ? profile.en : profile.ms}</span>
            </span>
            <span className="rt-profile-link">
              {en ? "Explore careers" : "Kenali kerjaya"}
              <ArrowUpRight size={17} aria-hidden="true" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
