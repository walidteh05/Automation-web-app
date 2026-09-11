"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

export default function HomeAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const { data } = await getSupabaseClient().auth.getSession();
        if (!isMounted) return;

        if (data.session) {
          setIsAuthenticated(true);
        } else {
          router.replace("/login");
        }
      } catch {
        if (isMounted) router.replace("/login");
      }
    }

    checkSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isAuthenticated !== true) return null;
  return children;
}