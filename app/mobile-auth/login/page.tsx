import Image from "next/image";
import { redirect } from "next/navigation";

import { mobileGoogleSignInAction } from "@/actions/mobile-auth";
import { auth } from "@/auth";
import { Button } from "@/components/button";

export default async function MobileLoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/api/mobile/v1/auth/complete");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/icon.svg"
          alt="Logo Karsa"
          width={64}
          height={64}
          priority
          unoptimized
          className="mx-auto rounded-2xl"
        />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Masuk ke Karsa</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Lanjutkan dengan akun kampus. Setelah berhasil, kamu akan kembali ke aplikasi Karsa.
        </p>
        <form action={mobileGoogleSignInAction} className="mt-8">
          <Button type="submit" size="lg" className="w-full">
            Lanjutkan dengan Google
          </Button>
        </form>
        <p className="mt-5 text-xs text-muted-foreground">
          Hanya akun @students.untidar.ac.id yang dapat masuk.
        </p>
      </div>
    </main>
  );
}
