import { NavLinks } from "@/components/nav-links";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex">
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border/40 flex-col px-3 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold px-3 mb-6">
          <Dumbbell size={20} className="text-primary" />
          <span>LiftLog</span>
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          <Suspense>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="px-3 pt-4 border-t border-border/40">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex flex-col flex-1 px-4 py-6 md:px-8 md:py-8 pb-20 md:pb-8 overflow-auto">{children}</main>
      <MobileNav />
    </div>
  );
}
