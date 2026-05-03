"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { randomizeCustomers, type CustomerInput } from "@/lib/randomize";
import { getOrCreateUser } from "@/lib/auth";

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
          baselineRevenue: c.baselineRevenue ?? null,
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
      customers: { select: { email: true } },
      _count: { select: { customers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
