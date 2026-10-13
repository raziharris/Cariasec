import { test } from "node:test";
import assert from "node:assert/strict";
import { cards } from "../shared/game";
import salaries from "../shared/salaries.json";
import { salaryFor, salaryRange } from "../frontend/src/salary";
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
