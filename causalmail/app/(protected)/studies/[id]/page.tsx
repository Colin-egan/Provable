import { getStudy } from "@/actions/studies";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultsPanel } from "@/components/study/results-panel";
import { CustomerTable } from "@/components/study/customer-table";
import { CalculateResultsButton } from "@/components/study/calculate-results-button";
import { ExportButton } from "@/components/study/export-button";

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

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const study = await getStudy(id);

  const treatmentCount = study.customers.filter(
    (c) => c.group === "TREATMENT"
  ).length;
  const controlCount = study.customers.filter(
    (c) => c.group === "CONTROL"
  ).length;

  const windowCloseDate = study.launchedAt
    ? new Date(study.launchedAt.getTime() + study.outcomeWindowDays * 86_400_000)
    : null;
  const windowClosed = windowCloseDate ? windowCloseDate < new Date() : false;

  const isCompleted = study.status === "COMPLETED";
  const isRandomized = study.status === "RANDOMIZED";

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{study.name}</h1>
            <Badge variant={STATUS_VARIANT[study.status]}>
              {STATUS_LABEL[study.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {study.customers.length} customers ·{" "}
            {Math.round(study.treatmentPct * 100)}% treatment ·{" "}
            {study.outcomeWindowDays}-day outcome window · Created{" "}
            {new Date(study.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {isRandomized && (
            <CalculateResultsButton
              studyId={study.id}
              windowClosed={windowClosed}
            />
          )}
          {isCompleted && (
            <ExportButton
              studyName={study.name}
              customers={study.customers}
            />
          )}
        </div>
      </div>

      {/* Results (COMPLETED only) */}
      {isCompleted && study.results && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Results</h2>
          <ResultsPanel result={study.results} />
        </section>
      )}

      {/* Next-steps guidance (RANDOMIZED only) */}
      {isRandomized && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next steps</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex flex-col gap-2">
            <p>
              Your customers have been randomly assigned. Use the table below to
              see who should receive your email.
            </p>
            <p>
              Send your email to the{" "}
              <strong className="text-foreground">treatment group</strong> using
              your own email tool. After your {study.outcomeWindowDays}-day
              outcome window closes
              {windowCloseDate
                ? ` (${windowCloseDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })})`
                : ""}
              , enter each customer&apos;s revenue in the table and click{" "}
              <strong className="text-foreground">Calculate Results</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Customer table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Customers ({treatmentCount} treatment / {controlCount} control)
        </h2>
        <CustomerTable customers={study.customers} editable={!isCompleted} />
      </section>
    </div>
  );
}
