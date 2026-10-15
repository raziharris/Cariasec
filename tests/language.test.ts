import { test } from "node:test";
import assert from "node:assert/strict";
import { translate, serverMessage, logMessage } from "../frontend/src/i18n";
import { careerTitles, familyEnglish } from "../frontend/src/translations";
import { careerDescriptions } from "../frontend/src/careerDescriptions";
import { cards, categories, type View, type LogEntry } from "../shared/game";
import { validNickname } from "../shared/nickname";
import { nickname } from "../shared/schemas";

test("all 36 careers and all six educational families have English content", () => {
  assert.equal(cards.length, 36);
  for (const card of cards) {
    assert.ok(careerTitles[card.id]?.length);
    assert.ok(careerDescriptions[card.id]?.trim().length, `${card.id} needs English copy`);
  }
  for (const family of categories) {
    const en = familyEnglish[family.code];
    for (const field of [
      en.name,
      en.role,
      en.description,
      en.originalContent,
      en.careerContent,
    ])
      assert.ok(field.length);
  }
});
test("translation interpolates names without translating user content", () => {
  assert.equal(
    translate("en", "Giliran {name}", { name: "Mula" }),
    "Mula's turn",
  );
  assert.equal(
    translate("ms", "Giliran {name}", { name: "Mula" }),
    "Giliran Mula",
  );
  assert.equal(
    translate("en", "Tahniah, {name}!", { name: "$&" }),
    "Well done, $&!",
  );
  assert.equal(
    serverMessage("Nama ini sudah digunakan. Pilih nama lain.", "en"),
    "That name is taken. Choose another.",
  );
  assert.equal(
    serverMessage("Had 60 tindakan telah dicapai.", "en"),
    "The 60-action limit was reached.",
  );
  assert.equal(serverMessage("Mula telah kembali.", "en"), "Mula is back.");
});
test("activity translates transfers, misses, timeouts and collections while keeping player names", () => {
  const room = {
    players: [
      { id: "a", name: "Mula" },
      { id: "b", name: "Menang" },
    ],
  } as View;
  const entries: [LogEntry, string][] = [
    [
      {
        id: 1,
        kind: "transfer",
        actor: "a",
        target: "b",
        card: "R1",
        text: "Mula menerima Jurutera daripada Menang.",
      },
      "Mula received Engineer from Menang.",
    ],
    [
      {
        id: 2,
        kind: "draw",
        actor: "a",
        target: "b",
        card: "R1",
        text: "Menang tiada Jurutera. Mula mengambil satu kad.",
      },
      "Menang has no Engineer. Mula draws a card.",
    ],
    [
      {
        id: 3,
        kind: "draw",
        actor: "a",
        target: "b",
        card: "R1",
        text: "Menang tiada Jurutera. Mula meneruskan giliran seterusnya.",
      },
      "Menang has no Engineer. Mula passes the turn.",
    ],
    [
      {
        id: 4,
        kind: "draw",
        actor: "a",
        text: "Masa Mula tamat. Satu kad diambil. Giliran pemain seterusnya.",
      },
      "Mula's time is up. A card was drawn. Next player's turn.",
    ],
    [
      {
        id: 5,
        kind: "family",
        actor: "a",
        text: "Tahniah! Mula melengkapkan keluarga Realistik.",
      },
      "Mula completed the Realistic family!",
    ],
    [
      {
        id: 6,
        kind: "draw",
        actor: "a",
        text: "Mula melepaskan giliran kerana tiada rakan yang mempunyai kad.",
      },
      "Mula passes the turn: no other player has cards.",
    ],
  ];
  for (const [entry, expected] of entries) {
    assert.equal(logMessage(entry, room, "en"), expected);
    assert.equal(logMessage(entry, room, "ms"), entry.text);
  }
});
test("welcome validation agrees with server rules including whitespace and Unicode", () => {
  for (const name of [
    "Aina",
    "  Mula  ",
    "李明",
    "Aziz_2",
    "Ana-Maria",
    " ",
    "A",
    "a".repeat(21),
    "<script>",
    "🙂",
    "Aina!",
  ]) {
    assert.equal(validNickname(name), nickname.safeParse(name).success, name);
  }
});
