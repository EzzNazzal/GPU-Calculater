import type { calculate } from "@/lib/calculator";

type Results = NonNullable<ReturnType<typeof calculate>["results"]>;
type Metric = {
  key: keyof Pick<Results, "billableHours" | "capex" | "powerKwh" | "electricity" | "staffing" | "overhead" | "targetPrice" | "benchmarkPrice">;
  label: string;
  unit: string;
  currency?: boolean;
};

const metrics: Record<string, Metric[]> = {
  Infrastructure: [{ key: "billableHours", label: "Monthly billable GPU-hours", unit: "GPU-hours / month" }],
  "Hardware & repayment": [{ key: "capex", label: "Monthly hardware repayment", unit: "USD / month", currency: true }],
  "Power & cooling": [
    { key: "powerKwh", label: "Total monthly energy consumption", unit: "kWh / month" },
    { key: "electricity", label: "Monthly electricity & cooling cost", unit: "USD / month", currency: true },
  ],
  Staffing: [{ key: "staffing", label: "Monthly staffing cost", unit: "USD / month", currency: true }],
  Overhead: [{ key: "overhead", label: "Monthly overhead total", unit: "USD / month", currency: true }],
  Pricing: [
    { key: "targetPrice", label: "Target price (with markup)", unit: "USD / GPU-hour", currency: true },
    { key: "benchmarkPrice", label: "Discounted competitor benchmark", unit: "USD / GPU-hour", currency: true },
  ],
};

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const currencyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function SectionSummary({ section, results }: { section: string; results: Results | null }) {
  const items = metrics[section];
  if (!items) return null;

  return (
    <div className="border-t border-primary/15 bg-primary/5 px-6 py-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Calculated outputs · Read-only</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-live="polite" aria-atomic="true">
        {items.map(({ key, label, unit, currency }) => {
          const value = results?.[key];
          const defined = value !== null && value !== undefined && Number.isFinite(value);
          return (
            <div key={key} className="min-w-0">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-1" data-testid={`summary-${key}`}>
                <span className="block font-mono text-lg font-semibold break-words">
                  {defined ? (currency ? currencyFormat : numberFormat).format(value) : results ? "Undefined" : "Unavailable"}
                </span>
                <span className="text-xs text-muted-foreground">{unit}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      {!results && <p className="text-xs text-muted-foreground">Fix invalid inputs to see calculated outputs.</p>}
      {section === "Pricing" && results?.targetPrice === null && (
        <p className="text-xs text-muted-foreground">Target price is undefined with zero billable GPU-hours.</p>
      )}
      {section === "Power & cooling" && (
        <p className="text-xs text-muted-foreground">
          Energy uses GPU count × power draw × PUE × available hours per GPU. In this model, utilization affects billable hours, not energy consumption. The electricity rate affects cost only.
        </p>
      )}
    </div>
  );
}