import { NavLinks } from "@/components/nav-links";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { CoachNavButton } from "@/components/coach-nav-button";
import { createClient } from "@/lib/supabase/server";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function checkIsCoach(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_athlete_relationships")
    .select("id")
    .eq("coach_id", userId)
    .eq("status", "accepted")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isCoach = user ? await checkIsCoach(user.id) : false;

  return (
    <div className="min-h-svh flex">
      <aside className="hidden md:flex w-56 lg:w-60 shrink-0 border-r border-border/40 flex-col px-3 py-4 pt-[env(safe-area-inset-top)]">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold px-3 mb-6">
          <Dumbbell size={20} className="text-primary" />
          <span>LiftLog</span>
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          <Suspense>
            <NavLinks />
          </Suspense>
          {isCoach && <CoachNavButton variant="sidebar" />}
        </nav>
        <div className="px-3 pt-4 border-t border-border/40">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex flex-col flex-1 px-4 py-6 md:px-8 md:py-8 pt-safe pb-nav-safe md:pb-8 md:pt-6 overflow-auto">{children}</main>
      <MobileNav isCoach={isCoach} />
    </div>
  );
}
