"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { randomizeCustomers, type CustomerInput } from "@/lib/randomize";

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

export type CreateStudyInput = {
  name: string;
  emailSubject: string;
  emailBody: string;
  treatmentPct: number;
  outcomeWindowDays: number;
  customers: CustomerInput[];
};

export async function createStudy(input: CreateStudyInput) {
  const user = await getOrCreateUser();
  const randomized = randomizeCustomers(input.customers, input.treatmentPct);

  const study = await db.study.create({
    data: {
      name: input.name,
      userId: user.id,
      status: "RANDOMIZED",
      treatmentPct: input.treatmentPct,
      outcomeWindowDays: input.outcomeWindowDays,
      emailSubject: input.emailSubject,
      emailBody: input.emailBody,
      customers: {
        create: randomized.map((c) => ({
          email: c.email,
          externalId: c.externalId ?? null,
          group: c.group,
        })),
      },
    },
  });

  revalidatePath("/dashboard");
  return { studyId: study.id };
}

export async function getStudy(id: string) {
  const user = await getOrCreateUser();

  const study = await db.study.findFirst({
    where: { id, userId: user.id },
    include: {
      customers: { orderBy: { group: "asc" } },
      results: true,
    },
  });

  if (!study) redirect("/dashboard");
  return study;
}

export async function getUserStudies() {
  const user = await getOrCreateUser();

  return db.study.findMany({
    where: { userId: user.id },
    include: {
      results: true,
      _count: { select: { customers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
