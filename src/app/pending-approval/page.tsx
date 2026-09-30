"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

type PageState = "loading" | "pending" | "refreshing" | "error";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [error, setError] = useState("");

  const fetchApprovalStatus = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) return "signed-out" as const;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("approval_status")
      .eq("id", sessionData.session.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error("ไม่พบข้อมูลโปรไฟล์ของบัญชีนี้");
    if (profile.approval_status !== "approved" && profile.approval_status !== "pending" && profile.approval_status !== "rejected") {
      throw new Error("ไม่สามารถตรวจสอบสถานะการอนุมัติได้");
    }
    return profile.approval_status;
  }, []);

  const applyApprovalStatus = useCallback((status: Awaited<ReturnType<typeof fetchApprovalStatus>>) => {
    if (status === "signed-out") {
      router.replace("/login");
    } else if (status === "approved") {
      router.replace("/");
    } else if (status === "rejected") {
      router.replace("/access-rejected");
    } else {
      setPageState("pending");
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;
    fetchApprovalStatus().then((status) => {
      if (isMounted) applyApprovalStatus(status);
    }).catch((checkError: unknown) => {
      if (!isMounted) return;
      setError(checkError instanceof Error ? checkError.message : "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
      setPageState("error");
    });
    return () => {
      isMounted = false;
    };
  }, [applyApprovalStatus, fetchApprovalStatus]);

  async function handleRefresh() {
    setPageState("refreshing");
    setError("");
    try {
      applyApprovalStatus(await fetchApprovalStatus());
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
      setPageState("error");
    }
  }

  async function handleSignOut() {
    setPageState("refreshing");
    setError("");
    try {
      const { error: signOutError } = await getSupabaseClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/login");
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      setPageState("error");
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <header className="login-header">
          <div className="login-topic-badge"><span aria-hidden="true">●</span> AUTOMATION MANAGEMENT SYSTEM</div>
          <div className="login-brand">Automation <strong>Management System</strong></div>
        </header>
        <div className="login-card" aria-live="polite">
          <div className="login-card-header">
            <h1>รอการอนุมัติ</h1>
            <p>บัญชีของคุณสมัครเรียบร้อยแล้ว ขณะนี้อยู่ระหว่างรอ Admin อนุมัติสิทธิ์การใช้งาน</p>
          </div>
          <p className="auth-message">สถานะ: {pageState === "pending" || pageState === "refreshing" ? "รออนุมัติ" : pageState === "loading" ? "กำลังตรวจสอบสถานะ..." : "ตรวจสอบสถานะไม่สำเร็จ"}</p>
          {error && <p className="login-error" role="alert">{error}</p>}
          <div className="approval-actions">
            <button
              className="auth-submit"
              type="button"
              disabled={pageState === "loading" || pageState === "refreshing"}
              onClick={() => void handleRefresh()}
            >
              ตรวจสอบสถานะอีกครั้ง
            </button>
            <button className="auth-submit approval-secondary" type="button" onClick={handleSignOut}>
              ออกจากระบบ
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
