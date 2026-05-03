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
        where: { studyId, email },
        data: { [field]: revenue },
      })
    )
  );

  const updatedCount = results.reduce((sum, r) => sum + r.count, 0);
  revalidatePath(`/studies/${studyId}`);
  return { updatedCount };
}
