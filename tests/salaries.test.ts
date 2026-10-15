import { test } from "node:test";
import assert from "node:assert/strict";
import { cards } from "../shared/game";
import salaries from "../shared/salaries.json";
import { salaryFor, salaryRange, salaryLevelsFor } from "../frontend/src/salary";
import salaryLevels from "../shared/salary-levels.json";
import { translate } from "../frontend/src/i18n";

test("every occupation has a sourced Malaysian monthly range", () => {
  const ids = cards.map((card) => card.id).sort();
  assert.deepEqual(Object.keys(salaries).sort(), ids);
  for (const id of ids) {
    const salary = salaryFor(id);
    assert.ok(Number.isInteger(salary.min) && salary.min >= 1700, id);
    assert.ok(Number.isInteger(salary.max) && salary.max > salary.min, id);
    assert.match(salary.source, /^https:\/\//, id);
    assert.ok(salary.match.length, id);
    assert.match(salaryRange(salary), /^RM[\d,]+–RM[\d,]+$/, id);
  }
});

test("salary labels are available in both languages", () => {
  assert.equal(
    translate("en", "Anggaran gaji bulanan"),
    "Estimated monthly salary",
  );
  assert.equal(
    translate("en", "Contoh elaun Ahli Parlimen"),
    "MP allowance example",
  );
  assert.equal(
    translate("ms", "Malaysia · sebulan"),
    "Malaysia · sebulan",
  );
});

test("career salary levels retain providers and distinguish missing data from sourced ranges", () => {
  assert.deepEqual(Object.keys(salaryLevels).sort(), cards.map(card => card.id).sort());
  for (const card of cards) {
    const levels = salaryLevelsFor(card.id);
    assert.equal(levels.checkedAt, "2026-10-15");
    for (const key of ["junior", "senior", "management"] as const) {
      const level = levels[key];
      if (!level) continue;
      assert.ok(Number.isInteger(level.min) && level.min >= 1700, `${card.id} ${key}`);
      assert.ok(Number.isInteger(level.max) && level.max > level.min, `${card.id} ${key}`);
      assert.equal(new URL(level.source).hostname, new URL(salaryFor(card.id).source).hostname);
      assert.ok(level.roleMs && level.roleEn);
      if (level.reportedMin) assert.ok(level.reportedMin < level.min);
      if (level.basis === "fiveYears") assert.equal(key, "senior");
    }
  }
  assert.equal(salaryLevelsFor("C4").senior, null, "Do not publish inconsistent annual/monthly librarian data");
  assert.equal(salaryLevelsFor("E2").notApplicable, true);
  assert.equal(salaryLevelsFor("E3").management?.basis, "advert");
  assert.equal(salaryRange(salaryLevelsFor("C2").junior!), "RM1,963–RM5,124");
  assert.equal(translate("en", "Pengurusan"), "Management");
  assert.equal(translate("en", "Data belum tersedia"), "Data not available");
});
