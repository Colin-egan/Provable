"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";

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
  rows: { email: string; revenue: number }[]
) {
  const user = await getOrCreateUser();

  const study = await db.study.findFirst({
    where: { id: studyId, userId: user.id },
  });
  if (!study) throw new Error("Study not found");

  await Promise.all(
    rows.map(({ email, revenue }) =>
      db.customer.updateMany({
        where: { studyId, email },
        data: { revenue },
      })
    )
  );

  revalidatePath(`/studies/${studyId}`);
}
