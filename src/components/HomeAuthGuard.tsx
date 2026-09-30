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
          .select("role, approval_status")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (!isMounted) return;
        if (error) {
          setGuardState({ status: "error", message: "ไม่สามารถโหลดข้อมูลสิทธิ์ของบัญชีได้ กรุณาลองใหม่อีกครั้ง" });
          return;
        }
        if (!profile) {
          setGuardState({ status: "unauthorized" });
          return;
        }

        if (profile.approval_status === "pending") {
          setGuardState({ status: "redirecting" });
          router.replace("/pending-approval");
          return;
        }
        if (profile.approval_status === "rejected") {
          setGuardState({ status: "redirecting" });
          router.replace("/access-rejected");
          return;
        }
        if (profile.approval_status !== "approved") {
          setGuardState({ status: "unauthorized" });
          return;
        }
        if (!isUserRole(profile.role)) {
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

  if (guardState.status === "loading" || guardState.status === "redirecting") return null;
  if (guardState.status === "error") return <p role="alert">{guardState.message}</p>;
  if (guardState.status === "unauthorized") {
    return <p role="alert">บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้านี้</p>;
  }
  return children;
}
