"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { computeITT, computeLATE } from "@/lib/stats";
import { getOrCreateUser } from "@/lib/auth";

export async function calculateResults(studyId: string) {
  const user = await getOrCreateUser();

  const study = await db.study.findFirst({
    where: { id: studyId, userId: user.id },
    include: { customers: true },
  });
  if (!study) throw new Error("Study not found");

  const stats = computeITT({
    customers: study.customers,
    outcomeWindowDays: study.outcomeWindowDays,
    launchedAt: study.launchedAt,
  });

  const lateStats = computeLATE({
    customers: study.customers,
    engagementType: "clicks",
    ittResult: stats,
  });

  const resultData = { studyId, ...stats, ...lateStats };

  await db.studyResult.upsert({
    where: { studyId },
    create: resultData,
    update: resultData,
  });

  await db.study.update({
    where: { id: studyId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  revalidatePath(`/studies/${studyId}`);
  revalidatePath("/dashboard");
}
