import assert from "node:assert/strict";
import test from "node:test";
import { calculate, defaults, fields, monthlyPayment } from "./calculator.ts";

const close = (actual: number | null, expected: number) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-8 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
};
test("all cached Excel results match", () => {
  const { results: r, errors } = calculate(defaults);
  assert.deepEqual(errors, {});
  assert.ok(r);
  const expected = { billableHours: 14976, capex: 41666.666666666664, powerKwh: 32256, electricity: 3870.72, staffing: 12500, overhead: 10500, totalCost: 68537.38666666666, breakeven: 4.576481481481481, targetPrice: 5.949425925925925, benchmarkPrice: 4.25, recommendedPrice: 5.949425925925925, markup: 0.3, paybackMonths: 24.104949995406137 };
  for (const [key, value] of Object.entries(expected)) close(r[key as keyof typeof expected], value);
  assert.equal(r.belowFloor, true);
});
test("PMT uses interest and remains stable for tiny rates", () => {
  close(monthlyPayment(1500000, 36, 12), 49821.464719276746);
  close(monthlyPayment(1500000, 36, 1e-12), 1500000 / 36);
});
test("benchmark above floor selects lower of benchmark and target", () => {
  const r = calculate({ ...defaults, B42: 6 }).results!;
  close(r.recommendedPrice, 5.1);
  assert.equal(r.belowFloor, false);
  close(calculate({ ...defaults, B42: 100 }).results!.recommendedPrice, r.targetPrice!);
});
test("zero utilization has no hourly prices and does not reduce power", () => {
  const r = calculate({ ...defaults, B7: 0 }).results!;
  assert.equal(r.breakeven, null);
  assert.equal(r.recommendedPrice, null);
  assert.equal(r.paybackMonths, null);
  close(r.electricity, 3870.72);
});
test("zero GPUs or hours, and zero cost, do not divide by zero", () => {
  for (const key of ["B5", "B6"]) assert.equal(calculate({ ...defaults, [key]: 0 }).results!.breakeven, null);
  const x = { ...defaults };
  for (const key of ["B11", "B19", "B25", "B29", "B30", "B31", "B32"]) x[key] = 0;
  const r = calculate(x).results!;
  assert.equal(r.recommendedPrice, 0);
  assert.equal(r.markup, null);
  assert.equal(r.paybackMonths, null);
});
test("every field rejects blank/nonfinite and out-of-range inputs", () => {
  for (const f of fields) {
    for (const invalid of [NaN, Infinity, -Infinity, f.min - 1]) assert.ok(calculate({ ...defaults, [f.key]: invalid }).errors[f.key]);
    if (f.max !== undefined) assert.ok(calculate({ ...defaults, [f.key]: f.max + 1 }).errors[f.key]);
    if (f.integer) assert.ok(calculate({ ...defaults, [f.key]: f.defaultValue + 0.5 }).errors[f.key]);
  }
});

test("energy dependencies scale energy and cost, but utilization and rate differ", () => {
  const base = calculate(defaults).results!;
  for (const key of ["B5", "B6", "B17", "B18"]) {
    const r = calculate({ ...defaults, [key]: defaults[key] / (key === "B18" ? 0.5 : 2) }).results!;
    const factor = key === "B18" ? 2 : 0.5;
    close(r.powerKwh, base.powerKwh * factor);
    close(r.electricity, base.electricity * factor);
  }
  const utilization = calculate({ ...defaults, B7: 32.5 }).results!;
  close(utilization.billableHours, base.billableHours / 2);
  close(utilization.powerKwh, base.powerKwh);
  const rate = calculate({ ...defaults, B19: 0.24 }).results!;
  close(rate.powerKwh, base.powerKwh);
  close(rate.electricity, base.electricity * 2);
});

test("section cost and pricing outputs track their inputs", () => {
  const base = calculate(defaults).results!;
  close(calculate({ ...defaults, B11: 750000 }).results!.capex, base.capex / 2);
  close(calculate({ ...defaults, B12: 72 }).results!.capex, base.capex / 2);
  close(calculate({ ...defaults, B13: 12 }).results!.capex, 49821.464719276746);
  for (const key of ["B24", "B25"]) {
    close(calculate({ ...defaults, [key]: defaults[key] * 2 }).results!.staffing, base.staffing * 2);
  }
  for (const key of ["B29", "B30", "B31", "B32"]) {
    close(calculate({ ...defaults, [key]: defaults[key] + 100 }).results!.overhead, base.overhead + 100);
  }
  close(calculate({ ...defaults, B40: 50 }).results!.targetPrice, base.breakeven! * 1.5);
  close(calculate({ ...defaults, B42: 10 }).results!.benchmarkPrice, 8.5);
  close(calculate({ ...defaults, B43: 100 }).results!.benchmarkPrice, 0);
});

test("invalid inputs discard outputs and valid defaults restore them", () => {
  for (const field of fields) {
    assert.equal(calculate({ ...defaults, [field.key]: NaN }).results, null);
  }
  assert.equal(calculate({ ...defaults, B17: Number.MAX_VALUE }).results, null);
  const r = calculate({ ...defaults }).results!;
  close(r.billableHours, 14976);
  close(r.powerKwh, 32256);
  close(r.targetPrice, 5.949425925925925);
});
