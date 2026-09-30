"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { getSupabaseClient, isUserRole } from "../lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "register";
};

function getAuthErrorMessage(error: unknown, isRegister: boolean) {
  if (!(error instanceof Error)) return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

  const message = error.message.toLowerCase();
  if (message.includes("รหัสผ่านและการยืนยัน")) return "รหัสผ่านไม่ตรงกัน";
  if (!isRegister && (message.includes("invalid login credentials") || message.includes("invalid_credentials"))) {
    return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  }
  if (!isRegister && message.includes("email not confirmed")) {
    return "บัญชียังไม่ได้รับการยืนยัน โปรดตรวจสอบข้อความยืนยันจากระบบ";
  }
  if (isRegister && (message.includes("already registered") || message.includes("user already exists"))) {
    return "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น";
  }

  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

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
            approval_status: "pending",
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
          .insert({ id: data.user.id, display_name: displayName, role: "technician", approval_status: "pending" })
          .select("role")
          .single();
        if (profileError) throw profileError;
        role = createdProfile.role;
      }

      if (!isUserRole(role)) throw new Error("ไม่พบ role ที่รองรับในข้อมูลโปรไฟล์");

      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError, isRegister));
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
          <span>ชื่อผู้ใช้</span>
          <span className="register-input-wrap">
            <span className="register-field-icon" aria-hidden="true">●</span>
            <input name="display_name" type="text" placeholder="กรอกชื่อผู้ใช้" autoComplete="name" required onInvalid={(event) => event.currentTarget.setCustomValidity("กรุณากรอกชื่อผู้ใช้")} onInput={(event) => event.currentTarget.setCustomValidity("")} />
          </span>
        </label>
      )}

      <label className="auth-field">
        <span>{isRegister ? "อีเมล" : "ชื่อผู้ใช้"}</span>
        <span className={isRegister ? "register-input-wrap" : "login-input-wrap"}>
          {isRegister && <span className="register-field-icon" aria-hidden="true">✉</span>}
          {!isRegister && <span className="login-field-icon" aria-hidden="true">✉</span>}
          <input name="email" type="email" placeholder={isRegister ? "user@company.com" : "กรอกชื่อผู้ใช้"} autoComplete="email" required onInvalid={(event) => event.currentTarget.setCustomValidity(isRegister ? event.currentTarget.validity.valueMissing ? "กรุณากรอกอีเมล" : "กรุณากรอกอีเมลให้ถูกต้อง" : "กรุณากรอกชื่อผู้ใช้")} onInput={(event) => event.currentTarget.setCustomValidity("")} />
        </span>
      </label>

      <label className="auth-field">
        <span>รหัสผ่าน</span>
        <span className={`${isRegister ? "register-input-wrap" : "login-input-wrap password-input-wrap"}`}>
          {isRegister && <span className="register-field-icon register-lock-icon" aria-hidden="true">▣</span>}
          {!isRegister && <span className="login-field-icon login-lock-icon" aria-hidden="true">▣</span>}
          <input name="password" type={showPassword ? "text" : "password"} placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} required onInvalid={(event) => event.currentTarget.setCustomValidity(event.currentTarget.validity.tooShort ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : "กรุณากรอกรหัสผ่าน")} onInput={(event) => event.currentTarget.setCustomValidity("")} />
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
          <input name="confirmPassword" type="password" placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={8} autoComplete="new-password" required onInvalid={(event) => event.currentTarget.setCustomValidity(event.currentTarget.validity.tooShort ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : "กรุณายืนยันรหัสผ่าน")} onInput={(event) => event.currentTarget.setCustomValidity("")} />
        </label>
      )}

      {!isRegister && (
        <div className="auth-options">
          <label className="remember-option"><input type="checkbox" name="remember" /> จดจำการเข้าสู่ระบบ</label>
        </div>
      )}

      <button className="auth-submit" type="submit" disabled={isLoading}>
        {isLoading ? isRegister ? "กำลังสมัครสมาชิก..." : "กำลังเข้าสู่ระบบ..." : isRegister ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
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
