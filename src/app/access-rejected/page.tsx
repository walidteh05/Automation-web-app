"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";

export default function AccessRejectedPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const { data, error: sessionError } = await getSupabaseClient().auth.getSession();
        if (!isMounted) return;
        if (sessionError) {
          setError("ไม่สามารถตรวจสอบสถานะการเข้าสู่ระบบได้ กรุณาลองอีกครั้ง");
        } else if (!data.session) {
          router.replace("/login");
        }
        setIsLoading(false);
      } catch {
        if (!isMounted) return;
        setError("ไม่สามารถตรวจสอบสถานะการเข้าสู่ระบบได้ กรุณาลองอีกครั้ง");
        setIsLoading(false);
      }
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSignOut() {
    setIsLoading(true);
    setError("");
    try {
      const { error: signOutError } = await getSupabaseClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/login");
    } catch {
      setError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <main className="login-page"><p role="status">กำลังตรวจสอบสถานะ...</p></main>;
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
            <h1>ไม่สามารถเข้าใช้งานระบบได้</h1>
            <p>บัญชีของคุณไม่ได้รับอนุมัติให้ใช้งานระบบ</p>
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <div className="approval-actions">
            <button className="auth-submit" type="button" onClick={() => router.replace("/login")}>
              กลับเข้าสู่ระบบ
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
