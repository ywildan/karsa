"use server";

import { signIn } from "@/auth";

export async function mobileGoogleSignInAction(): Promise<void> {
  await signIn("google", { redirectTo: "/api/mobile/v1/auth/complete" });
}
