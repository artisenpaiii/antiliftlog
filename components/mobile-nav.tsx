"use client";

import { NavLinks } from "@/components/nav-links";
import { Suspense } from "react";

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        <Suspense>
          <NavLinks variant="bottom-tab" />
        </Suspense>
      </div>
    </nav>
  );
}
