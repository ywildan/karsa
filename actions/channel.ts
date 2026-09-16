"use server";

/**
 * Karsa — actions/channel.ts
 * ----------------------------------------------------------------------------
 * Server Action ganti channel (PRD §4.2). Cookie session-only, httpOnly.
 * Setelah cookie tertulis, redirect ke `homePathForUser(user, to)` supaya
 * PJ tidak pernah mendarat di `/dashboard` dan non-PJ tidak pernah mendarat
 * di path mobile — satu hop, bukan rantai 307.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CHANNEL_COOKIE, isChannel } from "@/lib/channel";
import { HOME_DEFAULT, homePathForUser } from "@/lib/roles";

export async function setChannelAction(formData: FormData): Promise<void> {
  const to = formData.get("channel");
  if (!isChannel(to)) {
    redirect(HOME_DEFAULT);
  }

  const jar = await cookies();
  jar.set(CHANNEL_COOKIE, to, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  const session = await auth();
  redirect(homePathForUser(session?.user, to));
}
