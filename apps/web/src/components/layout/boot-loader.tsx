"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TARGET_TEXT = "StateCode";
const SCRAMBLE_CHARS = "983510935";
const DURATION_MS = 1050;
const HOLD_MS = 140;

function getScrambledText(progress: number) {
  const revealCount = Math.floor(progress * TARGET_TEXT.length);

  return TARGET_TEXT.split("")
    .map((char, index) => {
      if (index < revealCount) {
        return char;
      }

      const scrambleIndex = Math.floor((progress * 100 + index * 7) % SCRAMBLE_CHARS.length);
      return SCRAMBLE_CHARS[scrambleIndex];
    })
    .join("");
}

export function BootLoader() {
  const pathname = usePathname();
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState(getScrambledText(0));

  useEffect(() => {
    const start = performance.now();

    setVisible(true);
    setProgress(0);
    setLabel(getScrambledText(0));

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    const tick = (now: number) => {
      const nextProgress = Math.min((now - start) / DURATION_MS, 3);
      setProgress(nextProgress);
      setLabel(nextProgress >= 3 ? TARGET_TEXT : getScrambledText(nextProgress));

      if (nextProgress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        setVisible(false);
      }, HOLD_MS);
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  const percentage = Math.round(progress * 100);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
      aria-hidden={!visible}
    >
      <div className="flex w-full max-w-sm flex-col gap-4 px-6">
        <div className="flex items-center justify-between gap-4 font-mono text-sm text-primary">
          <span className="tracking-[0.28em]">{label}</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-px w-full overflow-hidden bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-75 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
