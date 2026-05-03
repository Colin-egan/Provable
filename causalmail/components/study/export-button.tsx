"use client";

import { Button } from "@/components/ui/button";
import type { Customer } from "@prisma/client";

type Props = {
  studyName: string;
  customers: Customer[];
};

export function ExportButton({ studyName, customers }: Props) {
  function handleExport() {
    const headers = ["email", "group", "external_id", "revenue", "email_sent_at", "email_opened_at", "email_clicked_at", "email_bounced"];
    const rows = customers.map((c) => [
      c.email,
      c.group ?? "",
      c.externalId ?? "",
      c.revenue !== null ? String(c.revenue) : "",
      c.emailSentAt?.toISOString() ?? "",
      c.emailOpenedAt?.toISOString() ?? "",
      c.emailClickedAt?.toISOString() ?? "",
      String(c.emailBounced),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${studyName.replace(/\s+/g, "-").toLowerCase()}-data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      Export data
    </Button>
  );
}
