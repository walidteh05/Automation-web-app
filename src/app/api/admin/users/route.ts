import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isDuplicateEmail(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "email_exists"
    || error.code === "user_already_exists"
    || message.includes("already been registered")
    || message.includes("already exists");
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1].trim();
  if (!accessToken) return jsonError("กรุณาเข้าสู่ระบบก่อนใช้งาน", 401);

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !publishableKey) {
    return jsonError("การตั้งค่า Supabase ฝั่ง server ไม่ครบถ้วน", 500);
  }

  try {
    const sessionClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });

    const { data: authData, error: authError } = await sessionClient.auth.getUser(accessToken);
    if (authError || !authData.user) return jsonError("Session ไม่ถูกต้องหรือหมดอายุแล้ว", 401);

    const { data: callerProfile, error: profileLookupError } = await sessionClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profileLookupError) return jsonError("ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้ได้", 500);
    if (callerProfile?.role !== "admin") return jsonError("ไม่มีสิทธิ์ใช้งาน API นี้", 403);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("รูปแบบ request ไม่ถูกต้อง", 400);
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return jsonError("ข้อมูลผู้ใช้ไม่ถูกต้อง", 400);
    }

    const input = body as Record<string, unknown>;
    const email = typeof input.email === "string" ? input.email.trim() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const displayName = typeof input.display_name === "string" ? input.display_name.trim() : "";
    const role = input.role;

    if (!emailPattern.test(email)) return jsonError("กรุณาระบุอีเมลให้ถูกต้อง", 400);
    if (password.length < 8) return jsonError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", 400);
    if (!displayName) return jsonError("กรุณาระบุชื่อผู้ใช้", 400);
    if (role !== "admin" && role !== "technician") return jsonError("Role ต้องเป็น admin หรือ technician", 400);

    const adminClient = getSupabaseAdminClient();
    const { data: createdAuthUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, role },
    });

    if (createUserError) {
      if (isDuplicateEmail(createUserError)) return jsonError("อีเมลนี้มีบัญชีผู้ใช้แล้ว", 409);
      return jsonError("ไม่สามารถสร้างบัญชีผู้ใช้ได้", 500);
    }
    if (!createdAuthUser.user) return jsonError("ไม่สามารถสร้างบัญชีผู้ใช้ได้", 500);

    const { error: createProfileError } = await adminClient.from("profiles").insert({
      id: createdAuthUser.user.id,
      display_name: displayName,
      role,
      approval_status: "approved",
    });

    if (createProfileError) {
      try {
        await adminClient.auth.admin.deleteUser(createdAuthUser.user.id);
      } catch {
        // Do not log user data, credentials, tokens, or keys.
      }
      return jsonError("สร้างข้อมูลโปรไฟล์ไม่สำเร็จ ระบบพยายามย้อนกลับการสร้างบัญชีแล้ว", 500);
    }

    return Response.json({
      user: {
        id: createdAuthUser.user.id,
        email: createdAuthUser.user.email ?? email,
        display_name: displayName,
        role,
        approval_status: "approved",
      },
    }, { status: 201 });
  } catch {
    return jsonError("เกิดข้อผิดพลาดภายในระบบ", 500);
  }
}
