"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { computeITT, computeAdjustedITT, computeLATE } from "@/lib/stats";
import { getOrCreateUser } from "@/lib/auth";

export async function calculateResults(studyId: string) {
  const user = await getOrCreateUser();

  const study = await db.study.findFirst({
    where: { id: studyId, userId: user.id },
    include: { customers: true },
  });
  if (!study) throw new Error("Study not found");

  const ittResult = computeITT({
    customers: study.customers,
    outcomeWindowDays: study.outcomeWindowDays,
    launchedAt: study.launchedAt,
  });

  const adjustedResult = computeAdjustedITT(study.customers);

  // Compute LATE for both engagement types (clicks = primary, opens = secondary)
  const lateClicks = computeLATE({
    customers: study.customers,
    engagementType: "clicks",
    ittResult,
  });
  const lateOpens = computeLATE({
    customers: study.customers,
    engagementType: "opens",
    ittResult,
  });

  const resultData = {
    studyId,
    ...ittResult,
    // Adjusted ITT (DiD) — null fields when no baseline data
    ittAdjustedEstimate: adjustedResult?.ittAdjustedEstimate ?? null,
    ittAdjustedSe: adjustedResult?.ittAdjustedSe ?? null,
    ittAdjustedCiLower: adjustedResult?.ittAdjustedCiLower ?? null,
    ittAdjustedCiUpper: adjustedResult?.ittAdjustedCiUpper ?? null,
    ittAdjustedSignificant: adjustedResult?.ittAdjustedSignificant ?? null,
    // LATE (clicks-based — primary)
    ...lateClicks,
    // LATE (opens-based — secondary)
    lateEstimateOpens: lateOpens.lateEstimate,
    lateSeOpens: lateOpens.lateSe,
    lateCiLowerOpens: lateOpens.lateCiLower,
    lateCiUpperOpens: lateOpens.lateCiUpper,
    firstStageFOpens: lateOpens.firstStageF,
    weakInstrumentOpens: lateOpens.weakInstrument,
  };

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
