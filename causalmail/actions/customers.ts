"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function updateRevenue(customerId: string, revenue: number | null) {
  const user = await getOrCreateUser();

  const customer = await db.customer.findFirst({
    where: { id: customerId, study: { userId: user.id } },
  });
  if (!customer) throw new Error("Customer not found");

  await db.customer.update({
    where: { id: customerId },
    data: { revenue },
  });

  revalidatePath(`/studies/${customer.studyId}`);
}

export async function bulkImportRevenue(
  studyId: string,
  rows: { email: string; revenue: number }[],
  field: "revenue" | "baselineRevenue" = "revenue"
) {
  const user = await getOrCreateUser();

  const study = await db.study.findFirst({
    where: { id: studyId, userId: user.id },
  });
  if (!study) throw new Error("Study not found");

  const results = await Promise.all(
    rows.map(({ email, revenue }) =>
      db.customer.updateMany({
        where: { studyId, email: { equals: email, mode: "insensitive" } },
        data: { [field]: revenue },
      })
    )
  );

  const updatedCount = results.reduce((sum, r) => sum + r.count, 0);
  revalidatePath(`/studies/${studyId}`);
  return { updatedCount };
}

export type TestDataRow = {
  email: string;
  revenue?: number | null;
  baselineRevenue?: number | null;
  sent?: boolean;
  opened?: boolean;
  clicked?: boolean;
  bounced?: boolean;
};

export async function bulkImportTestData(studyId: string, rows: TestDataRow[]) {
  const user = await getOrCreateUser();

  const study = await db.study.findFirst({
    where: { id: studyId, userId: user.id },
  });
  if (!study) throw new Error("Study not found");

  const now = new Date();

  const results = await Promise.all(
    rows.map((row) => {
      const data: Record<string, unknown> = {};
      if (row.revenue !== undefined) data.revenue = row.revenue;
      if (row.baselineRevenue !== undefined) data.baselineRevenue = row.baselineRevenue;
      if (row.sent !== undefined) data.emailSentAt = row.sent ? now : null;
      if (row.opened !== undefined) data.emailOpenedAt = row.opened ? now : null;
      if (row.clicked !== undefined) data.emailClickedAt = row.clicked ? now : null;
      if (row.bounced !== undefined) data.emailBounced = row.bounced;
      return db.customer.updateMany({
        where: { studyId, email: { equals: row.email, mode: "insensitive" } },
        data,
      });
    })
  );

  const updatedCount = results.reduce((sum, r) => sum + r.count, 0);
  revalidatePath(`/studies/${studyId}`);
  return { updatedCount };
}
