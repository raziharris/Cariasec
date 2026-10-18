// Original career illustrations are extracted from the user's CARIASEC PDF.
// One SVG asset is shared by React and Phaser so both render the same deck.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { makeDeck, identities, cardMark } from "../shared/rentak";
import careers from "../shared/cards.json";
import { cardArtworkKey } from "../shared/card-artwork";

const out = new URL("../public/rentak-cards/", import.meta.url);
mkdirSync(out, { recursive: true });
const categories = {
  R: "REALISTIK",
  I: "INVESTIGATIF",
  A: "ARTISTIK",
  S: "SOSIAL",
  E: "ENTERPRISING",
  C: "KONVENSIONAL",
};
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const text = (
  x: number,
  y: number,
  value: string,
  size: number,
  color = "#fff6df",
  extra = "",
) =>
  `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" font-weight="700" ${extra}>${escape(value)}</text>`;
const waves = (transform = "") =>
  `<g transform="${transform}" fill="none" stroke-width="5">${["#218d89", "#e2aa39", "#d85b33"].map((color, i) => `<path d="M-8 ${30 + i * 8} C30 ${30 + i * 8} 8 ${7 + i * 8} 43 ${7 + i * 8} S65 ${-14 + i * 8} 96 ${-14 + i * 8}" stroke="${color}"/>`).join("")}</g>`;
const wrap = (body: string, color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><defs><linearGradient id="shade" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs><rect width="300" height="450" rx="23" fill="#fff2d8"/><rect x="7" y="7" width="286" height="436" rx="18" fill="#073e46"/><rect x="15" y="15" width="270" height="420" rx="13" fill="${color}"/><rect x="15" y="15" width="270" height="420" rx="13" fill="url(#shade)"/>${body}${waves()}${waves("translate(300 450) rotate(180)")}</svg>`;
const icons: Record<string, string> = {
  pintas: '<circle cx="150" cy="214" r="53"/><path d="m112 252 76-76"/>',
  pusing:
    '<path d="M102 215a48 48 0 0 1 83-33l13 16m-1-39v40h-40M198 225a48 48 0 0 1-83 33l-13-16m1 39v-40h40"/>',
  teduh:
    '<path d="M150 152 203 174v44c0 34-27 54-53 66-26-12-53-32-53-66v-44Z"/><path d="m126 216 17 17 33-37"/>',
};
const hints: Record<string, string> = {
  pintas: "LANGKAU GILIRAN",
  pusing: "TUKAR ARAH",
  beban: "AMBIL DUA",
  teduh: "SEKAT BEBAN",
  prisma: "PILIH WARNA",
};
const english: Record<string, string> = {
  pintas: "SKIP",
  pusing: "REVERSE",
  beban: "DRAW TWO",
  teduh: "SHIELD",
  prisma: "CHOOSE A SUIT",
};
for (const card of makeDeck()) {
  const key = cardArtworkKey(card.id);
  const identity = card.kind === "prisma" ? null : identities[card.suit];
  const color = identity?.color ?? "#154b57";
  const mark = cardMark(card);
  let body = text(
    150,
    48,
    card.kind === "prisma" ? "SEMUA PERSONALITI" : categories[card.suit],
    16,
    "#fff6df",
    'text-anchor="middle" letter-spacing="1"',
  );
  body += `<rect x="30" y="92" width="240" height="249" rx="16" fill="#092e35"/><rect x="38" y="100" width="224" height="233" rx="10" fill="#303332"/>`;
  if (card.kind === "number") {
    const career = careers.find((c) => c.id === `${card.suit}${card.rank}`)!;
    const image = readFileSync(
      new URL(`../public${career.artwork}`, import.meta.url),
    ).toString("base64");
    body += `<image href="data:image/webp;base64,${image}" x="40" y="102" width="220" height="231" preserveAspectRatio="xMidYMax meet"/>`;
    const words = career.title.toUpperCase().split(" ");
    const lines =
      career.title.length > 19
        ? [words.slice(0, -1).join(" "), words.at(-1)!]
        : [career.title.toUpperCase()];
    lines.forEach(
      (line, i) =>
        (body += text(
          150,
          369 + i * 21,
          line,
          18,
          "#fff6df",
          'text-anchor="middle"',
        )),
    );
  } else {
    if (card.kind === "prisma") {
      body += Object.values(identities)
        .map(
          (i, index) =>
            `<path d="M150 216 150 146 211 181Z" fill="${i.color}" stroke="#fff2d8" stroke-width="3" transform="rotate(${index * 60} 150 216)"/>`,
        )
        .join("");
    } else if (card.kind === "beban") {
      body +=
        '<g fill="none" stroke="#fff2d8" stroke-width="4"><rect x="102" y="151" width="75" height="108" rx="9" transform="rotate(-14 140 205)"/><rect x="134" y="172" width="75" height="108" rx="9" fill="#244449"/></g>' +
        text(171, 244, "+2", 45, "#fff2d8", 'text-anchor="middle"');
    } else
      body += `<g fill="none" stroke="#fff2d8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${icons[card.kind]}</g>`;
    body += text(
      150,
      315,
      hints[card.kind],
      16,
      "#fff2d8",
      'text-anchor="middle"',
    );
    body += text(
      150,
      371,
      card.kind.toUpperCase(),
      28,
      "#fff6df",
      'text-anchor="middle" letter-spacing="2"',
    );
    body += text(
      150,
      394,
      english[card.kind],
      13,
      "#fff6df",
      'text-anchor="middle" letter-spacing="1"',
    );
  }
  // Large cream index tab stays legible when cards overlap in a hand.
  body += `<rect x="22" y="61" width="68" height="83" rx="12" fill="#fff2d8" stroke="#073e46" stroke-width="3"/>`;
  body += icons[card.kind]
    ? `<g transform="translate(12 33) scale(.29)" fill="none" stroke="#123d44" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${icons[card.kind]}</g>`
    : text(
        56,
        111,
        mark,
        card.kind === "number" ? 48 : 37,
        "#123d44",
        'text-anchor="middle"',
      );
  body += text(
    56,
    133,
    card.kind === "prisma" ? "ALL" : card.suit,
    17,
    "#123d44",
    'text-anchor="middle"',
  );
  body += icons[card.kind]
    ? `<g transform="translate(220 374) scale(.16)" fill="none" stroke="#fff6df" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${icons[card.kind]}</g>`
    : text(245, 417, mark, 24, "#fff6df", 'text-anchor="middle"');
  body += text(
    150,
    418,
    "CARIASEC / RENTAK",
    10,
    "#fff6df",
    'text-anchor="middle" letter-spacing="1.5"',
  );
  writeFileSync(new URL(`${key}.svg`, out), wrap(body, color));
}
const back = `<rect x="31" y="37" width="238" height="376" rx="90" fill="none" stroke="#e9be68" stroke-width="1.5"/>${text(150, 177, "CARIASEC", 32, "#f9c657", 'text-anchor="middle" style="font-family:Georgia,serif"')}${text(150, 212, "RENTAK", 19, "#fff2d8", 'text-anchor="middle" letter-spacing="6"')}${text(150, 244, "TEROKA POTENSI ANDA", 11, "#fff2d8", 'text-anchor="middle"')}${text(150, 263, "EXPLORE YOUR POTENTIALS", 9, "#fff2d8", 'text-anchor="middle"')}${Object.entries(
  identities,
)
  .map(
    ([s, i], n) =>
      `<circle cx="${65 + (n % 3) * 85}" cy="${316 + Math.floor(n / 3) * 38}" r="15" fill="${i.color}"/>${text(65 + (n % 3) * 85, 322 + Math.floor(n / 3) * 38, s, 15, "#fff", 'text-anchor="middle"')}`,
  )
  .join("")}`;
writeFileSync(new URL("back.svg", out), wrap(back, "#073e46"));
console.log("Generated 62 shared card faces from original CARIASEC artwork.");
