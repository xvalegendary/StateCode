"use client";

import Link from "next/link";
import { LayoutGrid, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/problems", label: "Problems" },
  { href: "/solve", label: "Solve" }
];

export function Navbar() {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="mx-auto max-w-[1320px]">
        <div
          className={cn(
            "mx-auto flex w-full flex-wrap items-center justify-between gap-3 rounded-full border bg-background/88 px-4 shadow-lg backdrop-blur-xl transition-all duration-300 ease-out",
            compact ? "max-w-[1120px] py-2" : "max-w-[1240px] py-3"
          )}
        >
          <Button variant="link" className="rounded-full px-3" asChild>
            <Link href="/">StateCode</Link>
          </Button>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className="rounded-full"
                  asChild
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" className="rounded-full" asChild>
              <Link href="/login">
                <LogIn className="size-4" />
                Log in
              </Link>
            </Button>
            <Button className="rounded-full" asChild>
              <Link href="/login?mode=signup">
                <UserPlus className="size-4" />
                Sign up
              </Link>
            </Button>
            <Button variant="outline" className="hidden rounded-full md:inline-flex" asChild>
              <Link href="/">
                <LayoutGrid className="size-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
