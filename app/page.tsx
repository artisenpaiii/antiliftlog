import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { Suspense } from "react";

async function HomeContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center gap-8 max-w-md text-center">
      <div className="flex items-center gap-3">
        <Dumbbell size={32} className="text-primary" />
        <h1 className="text-3xl font-semibold tracking-tight">LiftLog</h1>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Create training programs, track your workouts, and monitor your
        progress.
      </p>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/sign-up">Get started</Link>
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center p-6">
      <Suspense>
        <HomeContent />
      </Suspense>
    </main>
  );
}
