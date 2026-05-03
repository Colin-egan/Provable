import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getUserStudies } from "@/actions/studies";
import { interpretDashboardInsights } from "@/lib/interpret";
import { TrendChart } from "@/components/dashboard/trend-chart";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  RANDOMIZED: "Randomized",
  SENDING: "Sending",
  COLLECTING: "Collecting",
  COMPLETED: "Completed",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  RANDOMIZED: "secondary",
  SENDING: "default",
  COLLECTING: "default",
  COMPLETED: "secondary",
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function ittColor(estimate: number | null, significant: boolean | null) {
  if (estimate === null || !significant) return "";
  return estimate > 0
    ? "text-green-700 dark:text-green-400 font-semibold"
    : "text-red-700 dark:text-red-400 font-semibold";
}

export default async function DashboardPage() {
  const studies = await getUserStudies();

  const totalCustomers = studies.reduce((sum, s) => sum + s._count.customers, 0);
  const completed = studies.filter((s) => s.status === "COMPLETED" && s.results);
  const avgITT =
    completed.length > 0
      ? completed.reduce((sum, s) => sum + (s.results!.ittEstimate ?? 0), 0) /
        completed.length
      : null;

  const bestStudy =
    completed.length > 0
      ? completed.reduce((best, s) =>
          (s.results!.ittEstimate ?? -Infinity) >
          (best.results!.ittEstimate ?? -Infinity)
            ? s
            : best
        )
      : null;

  const insights = interpretDashboardInsights(
    studies.map((s) => ({
      name: s.name,
      createdAt: s.createdAt,
      results: s.results,
    }))
  );

  // Studies with full ITT data for the trend chart
  const chartStudies = completed
    .filter(
      (s) =>
        s.results?.ittEstimate !== null &&
        s.results?.ittCiLower !== null &&
        s.results?.ittCiUpper !== null
    )
    .map((s) => ({
      name: s.name,
      createdAt: s.createdAt,
      ittEstimate: s.results!.ittEstimate!,
      ittCiLower: s.results!.ittCiLower!,
      ittCiUpper: s.results!.ittCiUpper!,
    }));

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your causal email studies.
          </p>
        </div>
        <Link href="/studies/new" className={cn(buttonVariants())}>
          New study
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total studies</CardDescription>
            <CardTitle className="text-3xl">{studies.length}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Customers randomized</CardDescription>
            <CardTitle className="text-3xl">{totalCustomers.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average ITT effect</CardDescription>
            <CardTitle className="text-3xl">
              {avgITT !== null ? fmtCurrency(avgITT) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Best campaign</CardDescription>
            <CardTitle className="text-base truncate">
              {bestStudy?.name ?? "—"}
            </CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      </div>

      {/* Trend chart */}
      {chartStudies.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>ITT Trend</CardTitle>
            <CardDescription>
              Estimated causal effect per customer over time, with 95% confidence intervals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart studies={chartStudies} />
          </CardContent>
        </Card>
      )}

      {/* Study table */}
      <Card>
        <CardHeader>
          <CardTitle>Studies</CardTitle>
        </CardHeader>
        <CardContent>
          {studies.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm mb-4">
                No studies yet.
              </p>
              <Link href="/studies/new" className={cn(buttonVariants())}>
                Run your first study
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Open rate</TableHead>
                  <TableHead className="text-right">ITT estimate</TableHead>
                  <TableHead className="text-right">95% CI</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studies.map((study) => {
                  const r = study.results;
                  return (
                    <TableRow key={study.id}>
                      <TableCell>
                        <Link
                          href={`/studies/${study.id}`}
                          className="font-medium hover:underline"
                        >
                          {study.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[study.status]}>
                          {STATUS_LABEL[study.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {study._count.customers.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {r?.openRateTreatment !== null && r?.openRateTreatment !== undefined
                          ? fmtPct(r.openRateTreatment)
                          : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right",
                          ittColor(r?.ittEstimate ?? null, r?.ittSignificant ?? null)
                        )}
                      >
                        {r?.ittEstimate !== null && r?.ittEstimate !== undefined
                          ? fmtCurrency(r.ittEstimate)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {r?.ittCiLower !== null &&
                        r?.ittCiLower !== undefined &&
                        r?.ittCiUpper !== null &&
                        r?.ittCiUpper !== undefined
                          ? `${fmtCurrency(r.ittCiLower)} to ${fmtCurrency(r.ittCiUpper)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {new Date(study.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {insights.map((insight, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                💡 {insight}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
