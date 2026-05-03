"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendStudyEmail } from "@/lib/resend";
import { getOrCreateUser } from "@/lib/auth";

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function sendEmails(studyId: string): Promise<void> {
  const user = await getOrCreateUser();

  const study = await db.study.findFirst({
    where: { id: studyId, userId: user.id },
    include: { customers: true },
  });

  if (!study) throw new Error("Study not found");
  if (study.status !== "RANDOMIZED") throw new Error("Study is not in RANDOMIZED status");
  if (!study.emailSubject || !study.emailBody) throw new Error("Study is missing email content");

  await db.study.update({
    where: { id: studyId },
    data: { status: "SENDING", launchedAt: new Date() },
  });

  const treatment = study.customers.filter((c) => c.group === "TREATMENT");
  const batches = chunk(treatment, 50);

  for (let i = 0; i < batches.length; i++) {
    await Promise.all(
      batches[i].map(async (customer) => {
        try {
          await sendStudyEmail({
            to: customer.email,
            subject: study.emailSubject!,
            body: study.emailBody!,
            studyId: study.id,
            customerId: customer.id,
          });
          await db.customer.update({
            where: { id: customer.id },
            data: { emailSentAt: new Date() },
          });
        } catch (err) {
          console.error(`Failed to send email to ${customer.email}:`, err);
        }
      })
    );

    if (i < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  await db.study.update({
    where: { id: studyId },
    data: { status: "COLLECTING" },
  });

  revalidatePath(`/studies/${studyId}`);
  revalidatePath("/dashboard");
}
