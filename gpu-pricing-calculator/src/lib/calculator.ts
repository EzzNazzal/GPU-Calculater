export interface Field {
  key: string;
  label: string;
  section: string;
  unit: string;
  defaultValue: number;
  min: number;
  max?: number;
  integer?: boolean;
}

export const fields: Field[] = [
  { key: "B5", label: "Number of GPUs (NVIDIA B300)", section: "Infrastructure", unit: "GPUs", defaultValue: 32, min: 0, integer: true },
  { key: "B6", label: "Hours available per GPU per month", section: "Infrastructure", unit: "hours", defaultValue: 720, min: 0, max: 744 },
  { key: "B7", label: "Expected utilization", section: "Infrastructure", unit: "%", defaultValue: 65, min: 0, max: 100 },
  { key: "B11", label: "Unpaid GPU cluster purchase cost", section: "Hardware & repayment", unit: "USD", defaultValue: 1500000, min: 0 },
  { key: "B12", label: "Repayment period", section: "Hardware & repayment", unit: "months", defaultValue: 36, min: 1, integer: true },
  { key: "B13", label: "Annual financing / interest rate", section: "Hardware & repayment", unit: "%", defaultValue: 0, min: 0, max: 100 },
  { key: "B17", label: "Power draw per GPU (including board/rack)", section: "Power & cooling", unit: "kW", defaultValue: 1, min: 0 },
  { key: "B18", label: "PUE (including cooling)", section: "Power & cooling", unit: "×", defaultValue: 1.4, min: 1 },
  { key: "B19", label: "Electricity cost", section: "Power & cooling", unit: "USD / kWh", defaultValue: 0.12, min: 0 },
  { key: "B24", label: "Operations / support staff", section: "Staffing", unit: "FTE", defaultValue: 5, min: 0 },
  { key: "B25", label: "Fully-loaded monthly salary per FTE", section: "Staffing", unit: "USD / month", defaultValue: 2500, min: 0 },
  { key: "B29", label: "Software / orchestration licensing", section: "Overhead", unit: "USD / month", defaultValue: 3000, min: 0 },
  { key: "B30", label: "Cybersecurity & monitoring", section: "Overhead", unit: "USD / month", defaultValue: 2000, min: 0 },
  { key: "B31", label: "Facility, rent & connectivity", section: "Overhead", unit: "USD / month", defaultValue: 4000, min: 0 },
  { key: "B32", label: "Hardware maintenance reserve", section: "Overhead", unit: "USD / month", defaultValue: 1500, min: 0 },
  { key: "B40", label: "Target markup over cost", section: "Pricing", unit: "%", defaultValue: 30, min: 0 },
  { key: "B42", label: "Competitor on-demand benchmark", section: "Pricing", unit: "USD / GPU-hour", defaultValue: 5, min: 0 },
  { key: "B43", label: "Discount vs. benchmark", section: "Pricing", unit: "%", defaultValue: 15, min: 0, max: 100 },
];

export const defaults: Record<string, number> = Object.fromEntries(fields.map(f => [f.key, f.defaultValue]));

/** End-of-period monthly payments, equivalent to Excel -PMT(rate/12, months, principal). */
export function monthlyPayment(principal: number, months: number, annualPercent: number): number {
  const r = annualPercent / 1200;
  return r === 0 ? principal / months : principal * r / -Math.expm1(-months * Math.log1p(r));
}

export function calculate(inputs: Record<string, number>) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = inputs[field.key];
    if (!Number.isFinite(value)) errors[field.key] = "Enter a valid number.";
    else if (value < field.min) errors[field.key] = `Must be at least ${field.min}.`;
    else if (field.max !== undefined && value > field.max) errors[field.key] = `Must be no more than ${field.max}.`;
    else if (field.integer && !Number.isInteger(value)) errors[field.key] = "Enter a whole number.";
  }
  if (Object.keys(errors).length) return { errors, results: null };
  const x = inputs;
  const billableHours = x.B5 * x.B6 * x.B7 / 100;
  const capex = monthlyPayment(x.B11, x.B12, x.B13);
  // The source workbook charges power for all available hours, not just billable hours.
  const powerKwh = x.B5 * x.B17 * x.B18 * x.B6;
  const electricity = powerKwh * x.B19;
  const staffing = x.B24 * x.B25;
  const overhead = x.B29 + x.B30 + x.B31 + x.B32;
  const totalCost = capex + electricity + staffing + overhead;
  const breakeven = billableHours > 0 ? totalCost / billableHours : null;
  const targetPrice = breakeven === null ? null : breakeven * (1 + x.B40 / 100);
  const benchmarkPrice = x.B42 * (1 - x.B43 / 100);
  const belowFloor = breakeven !== null && benchmarkPrice < breakeven;
  const recommendedPrice = targetPrice === null ? null : belowFloor ? targetPrice : Math.min(targetPrice, benchmarkPrice);
  const markup = recommendedPrice !== null && breakeven !== null && breakeven > 0 ? recommendedPrice / breakeven - 1 : null;
  const availableForRepayment = recommendedPrice === null ? 0 : billableHours * recommendedPrice - (electricity + staffing + overhead);
  const paybackMonths = availableForRepayment > 0 ? x.B11 / availableForRepayment : null;
  const results = { billableHours, capex, powerKwh, electricity, staffing, overhead, totalCost, breakeven, targetPrice, benchmarkPrice, recommendedPrice, belowFloor, markup, paybackMonths };
  if (Object.values(results).some(v => typeof v === "number" && !Number.isFinite(v))) {
    return { errors: { calculation: "These inputs are too large to calculate. Reduce the values." }, results: null };
  }
  return { errors, results };
}