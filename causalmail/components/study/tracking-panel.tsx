"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import type { Customer } from "@prisma/client";

type Props = {
  customers: Customer[];
  outcomeWindowDays: number;
  launchedAt: Date | null;
};

export function TrackingPanel({ customers, outcomeWindowDays, launchedAt }: Props) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const treatment = customers.filter((c) => c.group === "TREATMENT");
  const sent = treatment.filter((c) => c.emailSentAt).length;
  const opened = treatment.filter((c) => c.emailOpenedAt).length;
  const clicked = treatment.filter((c) => c.emailClickedAt).length;
  const bounced = treatment.filter((c) => c.emailBounced).length;

  const closeDate = launchedAt
    ? new Date(launchedAt.getTime() + outcomeWindowDays * 86_400_000)
    : null;
  const windowClosed = closeDate ? closeDate < new Date() : false;

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat label="Sent" value={sent} />
          <Stat label="Opened" value={opened} note="approx." />
          <Stat label="Clicked" value={clicked} />
          <Stat label="Bounced" value={bounced} />
        </div>

        <Alert>
          <AlertDescription className="text-xs text-muted-foreground">
            Open tracking is approximate. Apple Mail and some email clients may
            inflate these numbers. Click tracking is more reliable.
          </AlertDescription>
        </Alert>

        {closeDate && (
          <p className="text-sm text-muted-foreground text-center">
            {windowClosed ? (
              <>
                Outcome window closed{" "}
                <span className="font-medium">
                  {closeDate.toLocaleDateString()}
                </span>
                . You can now calculate results.
              </>
            ) : (
              <>
                Outcome window closes{" "}
                <span className="font-medium">
                  {closeDate.toLocaleDateString()}
                </span>
                .
              </>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">
        {label}
        {note ? ` (${note})` : ""}
      </span>
    </div>
  );
}
