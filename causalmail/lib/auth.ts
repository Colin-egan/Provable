"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";

export async function getOrCreateUser() {
  const devEmail = process.env.DEV_USER_EMAIL;
  if (devEmail) {
    return db.user.upsert({
      where: { email: devEmail },
      create: { email: devEmail },
      update: {},
    });
  }

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

export async function getSessionEmail(): Promise<string | null> {
  const devEmail = process.env.DEV_USER_EMAIL;
  if (devEmail) return devEmail;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}
