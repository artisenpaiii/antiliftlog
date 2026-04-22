"use client";

import { NavLinks } from "@/components/nav-links";
import { CoachNavButton } from "@/components/coach-nav-button";
import { Suspense } from "react";

interface MobileNavProps {
  isCoach?: boolean;
}

export function MobileNav({ isCoach }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        <Suspense>
          <NavLinks variant="bottom-tab" />
        </Suspense>
        {isCoach && <CoachNavButton variant="bottom-tab" />}
      </div>
    </nav>
  );
}
