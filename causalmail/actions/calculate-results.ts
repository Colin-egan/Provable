"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { computeITT } from "@/lib/stats";

async function getOrCreateUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  return db.user.upsert({
    where: { email: user.email },
    create: { email: user.email },
    update: {},
  });
}

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

  await db.studyResult.upsert({
    where: { studyId },
    create: { studyId, ...stats },
    update: stats,
  });

  await db.study.update({
    where: { id: studyId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  revalidatePath(`/studies/${studyId}`);
  revalidatePath("/dashboard");
}
