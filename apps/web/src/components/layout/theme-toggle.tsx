"use client";

import { Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("statecode-theme");
    const preferredTheme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    applyTheme(preferredTheme);
    setTheme(preferredTheme);
    setMounted(true);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(className)}
      onClick={() => {
        applyTheme(nextTheme);
        window.localStorage.setItem("statecode-theme", nextTheme);
        setTheme(nextTheme);
      }}
      aria-label={mounted ? `Switch to ${nextTheme} theme` : "Toggle theme"}
      title={mounted ? `Switch to ${nextTheme} theme` : "Toggle theme"}
    >
      {mounted && theme === "dark" ? <SunMedium /> : <Moon />}
    </Button>
  );
}
