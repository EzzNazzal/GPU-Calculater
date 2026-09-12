import * as React from "react";
import { useState, useMemo } from "react";
import { fields, defaults, calculate, type Field } from "@/lib/calculator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RotateCcw, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionSummary } from "@/components/section-summary";

export default function CalculatorPage() {
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (typeof defaults !== "undefined") {
      Object.entries(defaults).forEach(([k, v]) => {
        initial[k] = String(v);
      });
    }
    return initial;
  });

  const handleReset = () => {
    if (typeof defaults !== "undefined") {
      const resetState: Record<string, string> = {};
      Object.entries(defaults).forEach(([k, v]) => {
        resetState[k] = String(v);
      });
      setInputs(resetState);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const parsedInputs = useMemo(() => {
    const parsed: Record<string, number> = {};
    Object.entries(inputs).forEach(([k, v]) => {
      parsed[k] = v.trim() === "" ? NaN : Number(v);
    });
    return parsed;
  }, [inputs]);

  const { errors, results } = useMemo(() => {
    if (typeof calculate === "function") {
      try {
        return calculate(parsedInputs);
      } catch (e) {
        return { errors: { _general: "Calculation error" }, results: null };
      }
    }
    return { errors: {}, results: null };
  }, [parsedInputs]);

  // Group fields by section
  const sections = useMemo(() => {
    if (typeof fields === "undefined") return [];
    const map = new Map<string, Field[]>();
    fields.forEach((f) => {
      if (!map.has(f.section)) map.set(f.section, []);
      map.get(f.section)!.push(f);
    });
    return Array.from(map.entries());
  }, []);

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatNumber = (val: number | null | undefined, maxDecimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: maxDecimals,
    }).format(val);
  };

  const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    return `${formatNumber(val * 100, 2)}%`;
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              ADH Center GPU Pricing Calculator
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Automated infrastructure cost and pricing analysis
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full md:w-auto"
            data-testid="button-reset"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Inputs Column */}
          <div className="xl:col-span-7 space-y-6">
            <p className="text-sm text-muted-foreground">
              Edit the assumptions below. Read-only calculated outputs in each section update automatically.
            </p>
            {sections.map(([sectionName, sectionFields]) => (
              <Card key={sectionName} className="overflow-hidden">
                <div className="bg-muted/50 px-6 py-4 border-b border-border">
                  <h2 className="text-lg font-semibold">{sectionName}</h2>
                </div>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {sectionFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label
                        htmlFor={field.key}
                        className={cn(
                          "flex justify-between items-baseline",
                          errors[field.key] && "text-destructive"
                        )}
                      >
                        <span>{field.label}</span>
                        {field.unit && (
                          <span className="text-xs text-muted-foreground font-normal ml-2">
                            {field.unit}
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          id={field.key}
                           aria-invalid={!!errors[field.key]}
                           aria-describedby={errors[field.key] ? `${field.key}-error` : undefined}
                          type="number"
                          value={inputs[field.key] ?? ""}
                          onChange={(e) =>
                            handleInputChange(field.key, e.target.value)
                          }
                          min={field.min}
                          max={field.max}
                          step={field.integer ? "1" : "any"}
                          className={cn(
                            "font-mono text-sm",
                            errors[field.key] &&
                              "border-destructive focus-visible:ring-destructive"
                          )}
                          data-testid={`input-${field.key}`}
                        />
                      </div>
                      {errors[field.key] && (
                        <p id={`${field.key}-error`} className="text-[0.8rem] font-medium text-destructive mt-1">
                          {errors[field.key]}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
                <SectionSummary section={sectionName} results={results} />
              </Card>
            ))}
          </div>

          {/* Results Column */}
          <div className="xl:col-span-5 space-y-6 sticky top-6">
            {hasErrors && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg border border-destructive/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="text-sm font-medium">
                  Please fix the invalid inputs to see calculated results.
                  {(errors._general || errors.calculation) && (
                    <span className="block mt-1 opacity-80">{errors._general || errors.calculation}</span>
                  )}
                </div>
              </div>
            )}

            {!results && !hasErrors && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <Info className="h-8 w-8 opacity-50" />
                  <p>Results will appear here when calculation is complete.</p>
                </CardContent>
              </Card>
            )}

            {results && (
              <>
                {results.belowFloor && (
                  <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-lg border border-amber-500/20 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium">
                      Warning: The discounted benchmark is below your breakeven cost. The recommended price uses cost plus your target markup instead.
                    </p>
                  </div>
                )}

                {!results.billableHours ? (
                  <Card className="border-destructive/50">
                    <CardHeader className="bg-destructive/5 border-b border-destructive/10 pb-4">
                      <CardTitle className="text-destructive">Pricing Undefined</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        With zero billable hours, pricing per hour cannot be determined (division by zero). Adjust utilization, hours per GPU, or GPU count to view pricing recommendations.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-primary/20 shadow-md">
                    <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
                      <CardTitle>Pricing Recommendation</CardTitle>
                      <CardDescription>
                        Target hourly rates based on costs and competition
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1 p-4 bg-muted/30 rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Breakeven Price
                          </p>
                          <p className="text-2xl font-mono font-semibold">
                            {formatCurrency(results.breakeven)}
                            <span className="text-sm text-muted-foreground font-sans font-normal ml-1">/hr</span>
                          </p>
                        </div>
                        <div className="space-y-1 p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-xs font-medium text-primary uppercase tracking-wider">
                            Recommended Price
                          </p>
                          <p className="text-2xl font-mono font-bold text-primary">
                            {formatCurrency(results.recommendedPrice)}
                            <span className="text-sm font-sans font-normal ml-1 opacity-80">/hr</span>
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Target Price (w/ Markup)</span>
                          <span className="font-mono font-medium">{formatCurrency(results.targetPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Discounted Benchmark</span>
                          <span className="font-mono font-medium">{formatCurrency(results.benchmarkPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground border-t border-dashed pt-3">
                          <span>Effective Markup vs Cost</span>
                          <span className="font-mono">{formatPercent(results.markup)}</span>
                        </div>
                      </div>
                      {!results.belowFloor && <p className="text-sm text-muted-foreground">OK: priced within competitor benchmark.</p>}
                      <p className="text-xs text-muted-foreground">Prices are USD per GPU-hour. Markup is measured over cost, not gross profit margin.</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Monthly Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y text-sm">
                      <div className="flex justify-between items-center p-4 hover:bg-muted/50 transition-colors">
                        <span className="text-muted-foreground">Monthly Hardware Repayment</span>
                        <span className="font-mono font-medium">{formatCurrency(results.capex)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Power & Cooling</span>
                          <span className="text-xs text-muted-foreground/70">{formatNumber(results.powerKwh)} kWh billed</span>
                        </div>
                        <span className="font-mono font-medium">{formatCurrency(results.electricity)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 hover:bg-muted/50 transition-colors">
                        <span className="text-muted-foreground">Staffing</span>
                        <span className="font-mono font-medium">{formatCurrency(results.staffing)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 hover:bg-muted/50 transition-colors">
                        <span className="text-muted-foreground">Overhead & Facility</span>
                        <span className="font-mono font-medium">{formatCurrency(results.overhead)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-muted/30 font-semibold border-t-2">
                        <span>Total Monthly Cost</span>
                        <span className="font-mono">{formatCurrency(results.totalCost)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Cluster Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Billable Hours / Mo</p>
                      <p className="text-xl font-mono">{formatNumber(results.billableHours, 0)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Est. Payback Period
                        <Info className="h-3 w-3 opacity-50" />
                      </p>
                      <p className="text-xl font-mono">
                        {results.paybackMonths !== null ? (
                          <>
                            {formatNumber(results.paybackMonths, 1)} <span className="text-sm font-sans font-normal text-muted-foreground">months</span>
                          </>
                        ) : (
                          "N/A"
                        )}
                      </p>
                    </div>
                  </CardContent>
                  <p className="px-6 pb-6 text-xs text-muted-foreground">Workbook payback estimate: revenue less non-hardware costs applied to the purchase balance; excludes financing interest. N/A means revenue does not cover those costs. Power costs include all available hours, regardless of utilization.</p>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
