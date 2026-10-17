import type { CSSProperties } from "react";
import {
  deckById,
  cardMark,
  identities,
  type Suit,
} from "../../../../shared/rentak";
export function Mascot({ suit }: { suit: Suit }) {
  const color = identities[suit].color;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="rt-mascot">
      <path d="M18 90 Q18 54 50 54 Q82 54 82 90" fill={color} />
      <path
        d="M34 67 L50 80 L66 67"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
      />
      <rect
        x="27"
        y="16"
        width="46"
        height="48"
        rx={suit === "C" ? 10 : 22}
        fill="#f8d8b7"
      />
      <path
        d={
          suit === "A" || suit === "S"
            ? "M24 45 Q16 4 50 7 Q84 4 77 56 L68 39 L64 23 Q42 40 24 32Z"
            : "M24 30 Q24 4 53 8 Q79 8 76 34 L62 24 L32 31Z"
        }
        fill="#1a2542"
      />
      <circle cx="40" cy="42" r="3" fill="#19233d" />
      <circle cx="60" cy="42" r="3" fill="#19233d" />
      <path
        d="M42 53 Q50 59 58 53"
        stroke="#a44442"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {suit === "I" && (
        <g stroke="#2865cc" strokeWidth="3" fill="none">
          <circle cx="39" cy="42" r="8" />
          <circle cx="61" cy="42" r="8" />
          <path d="M47 42h6" />
        </g>
      )}
      {suit === "R" && (
        <path d="M21 28 H79 L73 18 Q50 -2 27 18Z" fill={color} />
      )}
      <text x="50" y="96" textAnchor="middle" fontSize="17" fill="#fff">
        {identities[suit].symbol}
      </text>
    </svg>
  );
}
export function cardLabel(id: string, en = false) {
  const c = deckById[id];
  if (!c) return "";
  return c.kind === "prisma"
    ? "Prisma"
    : `${en ? identities[c.suit].en : identities[c.suit].name} ${c.kind === "number" ? c.rank : c.kind}`;
}
export function CardFace({
  id,
  back = false,
  en = false,
}: {
  id?: string;
  back?: boolean;
  en?: boolean;
}) {
  const c = id ? deckById[id] : null;
  if (back || !c)
    return (
      <div className="rt-card rt-card-back">
        <div className="rt-back-symbols">
          {Object.entries(identities).map(([key, value]) => (
            <span key={key} style={{ color: value.color }}>
              {value.symbol}
            </span>
          ))}
        </div>
        <b>REΝTAK</b>
        <small>CARIASEC</small>
      </div>
    );
  const identity = c.kind === "prisma" ? null : identities[c.suit],
    mark = cardMark(c);
  return (
    <div
      className={`rt-card ${c.kind === "prisma" ? "rt-prisma" : ""}`}
      style={
        {
          "--card-color": identity?.color ?? "#5869b8",
          "--card-ink":
            c.kind !== "prisma" && ["R", "E"].includes(c.suit)
              ? "#172239"
              : "#fff",
        } as CSSProperties
      }
    >
      <span className="rt-corner">
        {mark}
        <small>{identity?.symbol ?? "✦"}</small>
      </span>
      <span className="rt-card-mark">{mark}</span>
      <span className="rt-card-label">
        {c.kind === "number"
          ? en
            ? identity?.en
            : identity?.name
          : c.kind.toUpperCase()}
      </span>
      <span className="rt-corner rt-corner-bottom">{mark}</span>
      {c.kind !== "prisma" && <Mascot suit={c.suit} />}
    </div>
  );
}
