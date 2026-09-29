"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { getSupabaseClient, isUserRole, type UserRole } from "../lib/supabase/client";

type HomeAuthGuardProps = {
  children: ReactNode;
  allowedRoles?: readonly UserRole[];
};

type GuardState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "error"; message: string }
  | { status: "unauthorized" }
  | { status: "authorized" };

export default function HomeAuthGuard({ children, allowedRoles }: HomeAuthGuardProps) {
  const router = useRouter();
  const [guardState, setGuardState] = useState<GuardState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const { data, error: sessionError } = await getSupabaseClient().auth.getSession();
        if (!isMounted) return;
        if (sessionError) {
          setGuardState({ status: "error", message: "ไม่สามารถตรวจสอบสถานะการเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง" });
          return;
        }

        if (!data.session) {
          setGuardState({ status: "redirecting" });
          router.replace("/login");
          return;
        }

        const { data: profile, error } = await getSupabaseClient()
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (!isMounted) return;
        if (error) {
          setGuardState({ status: "error", message: "ไม่สามารถโหลดข้อมูลสิทธิ์ของบัญชีได้ กรุณาลองใหม่อีกครั้ง" });
          return;
        }
        if (!profile || !isUserRole(profile.role)) {
          setGuardState({ status: "unauthorized" });
          return;
        }

        setGuardState(
          !allowedRoles || allowedRoles.includes(profile.role)
            ? { status: "authorized" }
            : { status: "unauthorized" },
        );
      } catch {
        if (isMounted) {
          setGuardState({ status: "error", message: "เกิดข้อผิดพลาดระหว่างตรวจสอบสิทธิ์ กรุณาลองใหม่อีกครั้ง" });
        }
      }
    }

    checkSession();
    return () => {
      isMounted = false;
    };
  }, [allowedRoles, router]);

  if (guardState.status === "loading") {
    return <p role="status" aria-live="polite">กำลังตรวจสอบสิทธิ์...</p>;
  }
  if (guardState.status === "redirecting") {
    return <p role="status" aria-live="polite">กำลังนำคุณไปหน้าเข้าสู่ระบบ...</p>;
  }
  if (guardState.status === "error") return <p role="alert">{guardState.message}</p>;
  if (guardState.status === "unauthorized") {
    return <p role="alert">บัญชีนี้ไม่มี role ที่ได้รับอนุญาตให้เข้าถึงหน้านี้</p>;
  }
  return children;
}