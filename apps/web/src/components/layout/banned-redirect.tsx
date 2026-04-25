"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  readAuthSession,
  syncStoredSession,
  updateStoredProfile
} from "@/features/auth/lib/session";
import { fetchCurrentUser } from "@/features/platform/lib/platform-api";

const BANNED_PATH = "/banned";

export function BannedRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const session = readAuthSession();

    if (!session) {
      return;
    }

    if (session.profile.isBanned) {
      if (pathname !== BANNED_PATH) {
        router.replace(BANNED_PATH);
      }
      return;
    }

    fetchCurrentUser(session.token)
      .then((record) => {
        if (cancelled) {
          return;
        }

        const next = syncStoredSession(record);
        if (next?.profile.isBanned && pathname !== BANNED_PATH) {
          router.replace(BANNED_PATH);
        }
      })
      .catch((error) => {
        if (cancelled || !(error instanceof Error)) {
          return;
        }

        if (error.message.toLowerCase().includes("banned")) {
          updateStoredProfile((current) => ({
            ...current,
            profile: {
              ...current.profile,
              isBanned: true
            }
          }));

          if (pathname !== BANNED_PATH) {
            router.replace(BANNED_PATH);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
