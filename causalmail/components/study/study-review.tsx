"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createStudy } from "@/actions/studies";
import type { CustomerInput } from "@/lib/randomize";
import { toast } from "sonner";

type Props = {
  customers: CustomerInput[];
  emailSubject: string;
  emailBody: string;
  studyName: string;
  treatmentPct: number;
  outcomeWindowDays: number;
};

export function StudyReview({
  customers,
  emailSubject,
  emailBody,
  studyName,
  treatmentPct,
  outcomeWindowDays,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const treatmentCount = Math.round(customers.length * treatmentPct);
  const controlCount = customers.length - treatmentCount;

  async function handleRandomize() {
    setLoading(true);
    try {
      const { studyId } = await createStudy({
        name: studyName,
        emailSubject,
        emailBody,
        treatmentPct,
        outcomeWindowDays,
        customers,
      });
      router.push(`/studies/${studyId}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-6 grid gap-3 text-sm">
          <Row label="Study name" value={studyName} />
          <Row label="Customer list" value={`${customers.length} customers`} />
          <Row label="Email subject" value={emailSubject} />
          <Row
            label="Split"
            value={`${Math.round(treatmentPct * 100)}% treatment (${treatmentCount}) / ${Math.round((1 - treatmentPct) * 100)}% control (${controlCount})`}
          />
          <Row label="Outcome window" value={`${outcomeWindowDays} days`} />
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Clicking below will permanently assign each customer to treatment or
        control. This cannot be undone.
      </p>

      <Button size="lg" onClick={handleRandomize} disabled={loading}>
        {loading ? "Randomizing…" : "Randomize and Create Study"}
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
