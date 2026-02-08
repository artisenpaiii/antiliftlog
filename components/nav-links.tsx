"use client";

import { cn } from "@/lib/utils";
import { Dumbbell, Trophy, BarChart3, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard/programs", label: "Programs", icon: Dumbbell },
  { href: "/dashboard/competitions", label: "Competitions", icon: Trophy },
  { href: "/dashboard/stats", label: "Stats", icon: BarChart3 },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

interface NavLinksProps {
  variant?: "sidebar" | "bottom-tab";
}

export function NavLinks({ variant = "sidebar" }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <>
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);

        if (variant === "bottom-tab") {
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        );
      })}
    </>
  );
}
