"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { getSupabaseClient, isUserRole } from "../lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "register";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = getSupabaseClient();
      if (isRegister) {
        const displayName = String(formData.get("display_name") ?? "").trim();
        const role = "technician";
        const confirmPassword = String(formData.get("confirmPassword") ?? "");

        if (password !== confirmPassword) {
          throw new Error("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName, role } },
        });

        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("ไม่สามารถสร้างบัญชีได้");

        if (data.session) {
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            display_name: displayName,
            role,
          });
          if (profileError) throw profileError;
          router.push("/");
          router.refresh();
          return;
        }

        setMessage("สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ");
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || !data.user) throw new Error("ไม่พบ session ของผู้ใช้หลังเข้าสู่ระบบ");

      const { data: profile, error: profileLookupError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileLookupError) throw profileLookupError;

      let role: unknown = profile?.role;
      if (!profile) {
        const metadata = data.user.user_metadata ?? {};
        const displayName = typeof metadata.display_name === "string" ? metadata.display_name : email.split("@")[0];
        const { data: createdProfile, error: profileError } = await supabase
          .from("profiles")
          .insert({ id: data.user.id, display_name: displayName, role: "technician" })
          .select("role")
          .single();
        if (profileError) throw profileError;
        role = createdProfile.role;
      }

      if (!isUserRole(role)) throw new Error("ไม่พบ role ที่รองรับในข้อมูลโปรไฟล์");

      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className={`auth-form${isRegister ? " register-form" : " login-form"}`} onSubmit={handleSubmit}>
      {isRegister && error && <div className="register-error" role="alert"><span aria-hidden="true">!</span><p>{error}</p></div>}
      {!isRegister && error && <div className="login-error" role="alert"><span aria-hidden="true">!</span><p>{error}</p></div>}
      {isRegister && (
        <label className="auth-field">
          <span>ชื่อที่ใช้แสดง</span>
          <span className="register-input-wrap">
            <span className="register-field-icon" aria-hidden="true">●</span>
            <input name="display_name" type="text" placeholder="สมชาย สายโค้ด" autoComplete="name" required />
          </span>
        </label>
      )}

      <label className="auth-field">
        <span>อีเมล</span>
        <span className={isRegister ? "register-input-wrap" : "login-input-wrap"}>
          {isRegister && <span className="register-field-icon" aria-hidden="true">✉</span>}
          {!isRegister && <span className="login-field-icon" aria-hidden="true">✉</span>}
          <input name="email" type="email" placeholder={isRegister ? "user@example.com" : "student@university.ac.th"} autoComplete="email" required />
        </span>
      </label>

      <label className="auth-field">
        <span>รหัสผ่าน</span>
        <span className={`${isRegister ? "register-input-wrap" : "login-input-wrap password-input-wrap"}`}>
          {isRegister && <span className="register-field-icon register-lock-icon" aria-hidden="true">▣</span>}
          {!isRegister && <span className="login-field-icon login-lock-icon" aria-hidden="true">▣</span>}
          <input name="password" type={showPassword ? "text" : "password"} placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} required />
          {
            <button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
              {showPassword ? "ซ่อน" : "แสดง"}
            </button>
          }
        </span>
      </label>

      {isRegister && (
        <label className="auth-field">
          <span>ยืนยันรหัสผ่าน</span>
          <input name="confirmPassword" type="password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={8} autoComplete="new-password" required />
        </label>
      )}

      {!isRegister && (
        <div className="auth-options">
          <label className="remember-option"><input type="checkbox" name="remember" /> จดจำการเข้าสู่ระบบ</label>
        </div>
      )}

      <button className="auth-submit" type="submit" disabled={isLoading}>
        {isLoading ? "กำลังดำเนินการ..." : isRegister ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
        <span aria-hidden="true">→</span>
      </button>

      {message && <p className="auth-message" role="status">{message}</p>}

      <p className="auth-switch">
        {isRegister ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </Link>
      </p>
    </form>
  );
}