"use client";

import { Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface CoachNavButtonProps {
  variant?: "sidebar" | "bottom-tab";
}

export function CoachNavButton({ variant = "sidebar" }: CoachNavButtonProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith("/dashboard/athletes");

  if (variant === "bottom-tab") {
    return (
      <Link
        href="/dashboard/athletes"
        className={cn(
          "flex flex-col items-center gap-1 text-xs transition-colors",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Users2 size={20} />
        <span>Athletes</span>
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/athletes"
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Users2 size={16} />
      <span>Athletes</span>
    </Link>
  );
}
