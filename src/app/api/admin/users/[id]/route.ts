import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/admin";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1].trim();
  if (!accessToken) return jsonError("à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸à¹ˆà¸­à¸™à¹ƒà¸Šà¹‰à¸‡à¸²à¸™", 401);

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !publishableKey) {
    return jsonError("à¸à¸²à¸£à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸² Supabase à¸à¸±à¹ˆà¸‡ server à¹„à¸¡à¹ˆà¸„à¸£à¸šà¸–à¹‰à¸§à¸™", 500);
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
    if (authError || !authData.user) return jsonError("Session à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡à¸«à¸£à¸·à¸­à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸à¹à¸¥à¹‰à¸§", 401);

    const { data: callerProfile, error: callerProfileError } = await sessionClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (callerProfileError) return jsonError("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ªà¸´à¸—à¸˜à¸´à¹Œà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹„à¸”à¹‰", 500);
    if (callerProfile?.role !== "admin") return jsonError("à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹ƒà¸Šà¹‰à¸‡à¸²à¸™ API à¸™à¸µà¹‰", 403);

    const { id: userId } = await context.params;
    if (!uuidPattern.test(userId)) return jsonError("User ID à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡", 400);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("à¸£à¸¹à¸›à¹à¸šà¸š request à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡", 400);
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return jsonError("à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡", 400);
    }

    const input = body as Record<string, unknown>;
    const allowedFields = ["email", "password", "display_name", "role"];
    if (Object.keys(input).some((field) => !allowedFields.includes(field))) {
      return jsonError("à¸¡à¸µ field à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¸£à¸­à¸‡à¸£à¸±à¸šà¹ƒà¸™ request", 400);
    }
    if (Object.keys(input).length === 0) return jsonError("à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹à¸à¹‰à¹„à¸‚", 400);

    let email: string | undefined;
    let password: string | undefined;
    let displayName: string | undefined;
    let role: "admin" | "technician" | undefined;

    if (Object.hasOwn(input, "email")) {
      if (typeof input.email !== "string" || !emailPattern.test(input.email.trim())) {
        return jsonError("à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¸­à¸µà¹€à¸¡à¸¥à¹ƒà¸«à¹‰à¸–à¸¹à¸à¸•à¹‰à¸­à¸‡", 400);
      }
      email = input.email.trim();
    }
    if (Object.hasOwn(input, "password")) {
      if (typeof input.password !== "string" || input.password.length < 8) {
        return jsonError("à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¸•à¹‰à¸­à¸‡à¸¡à¸µà¸­à¸¢à¹ˆà¸²à¸‡à¸™à¹‰à¸­à¸¢ 8 à¸•à¸±à¸§à¸­à¸±à¸à¸©à¸£", 400);
      }
      password = input.password;
    }
    if (Object.hasOwn(input, "display_name")) {
      if (typeof input.display_name !== "string" || !input.display_name.trim()) {
        return jsonError("à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰", 400);
      }
      displayName = input.display_name.trim();
    }
    if (Object.hasOwn(input, "role")) {
      if (input.role !== "admin" && input.role !== "technician") {
        return jsonError("Role à¸•à¹‰à¸­à¸‡à¹€à¸›à¹‡à¸™ admin à¸«à¸£à¸·à¸­ technician", 400);
      }
      role = input.role;
    }

    const adminClient = getSupabaseAdminClient();
    const [{ data: targetAuth, error: targetAuthError }, { data: targetProfile, error: targetProfileError }] = await Promise.all([
      adminClient.auth.admin.getUserById(userId),
      adminClient.from("profiles").select("id, display_name, role, approval_status").eq("id", userId).maybeSingle(),
    ]);
    if (targetAuthError || !targetAuth.user) return jsonError("à¹„à¸¡à¹ˆà¸žà¸šà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹à¸à¹‰à¹„à¸‚", 404);
    if (targetProfileError) return jsonError("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸­à¹ˆà¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ profile à¹„à¸”à¹‰", 500);
    if (!targetProfile) return jsonError("à¹„à¸¡à¹ˆà¸žà¸š profile à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰", 404);

    if (role === "technician" && targetProfile.role === "admin") {
      if (userId === authData.user.id) {
        return jsonError("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸¥à¸”à¸ªà¸´à¸—à¸˜à¸´à¹Œ Admin à¸‚à¸­à¸‡à¸šà¸±à¸à¸Šà¸µà¸—à¸µà¹ˆà¸à¸³à¸¥à¸±à¸‡à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹„à¸”à¹‰", 409);
      }
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) return jsonError("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸ˆà¸³à¸™à¸§à¸™ Admin à¹„à¸”à¹‰", 500);
      if (count !== null && count <= 1) return jsonError("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸¥à¸”à¸ªà¸´à¸—à¸˜à¸´à¹Œ Admin à¸„à¸™à¸ªà¸¸à¸”à¸—à¹‰à¸²à¸¢à¹„à¸”à¹‰", 409);
    }

    const profilePatch: { display_name?: string; role?: "admin" | "technician" } = {};
    if (displayName !== undefined) profilePatch.display_name = displayName;
    if (role !== undefined) profilePatch.role = role;

    let profileWasUpdated = false;
    if (Object.keys(profilePatch).length > 0) {
      const { error: profileUpdateError } = await adminClient
        .from("profiles")
        .update(profilePatch)
        .eq("id", userId);
      if (profileUpdateError) return jsonError("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ profile à¹„à¸”à¹‰", 500);
      profileWasUpdated = true;
    }

    const authAttributes: {
      email?: string;
      password?: string;
      user_metadata?: Record<string, unknown>;
    } = {};
    if (email !== undefined) authAttributes.email = email;
    if (password !== undefined) authAttributes.password = password;
    if (displayName !== undefined) {
      authAttributes.user_metadata = {
        ...(targetAuth.user.user_metadata ?? {}),
        display_name: displayName,
      };
    }

    let updatedAuthUser = targetAuth.user;
    if (Object.keys(authAttributes).length > 0) {
      const { data: updatedAuth, error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, authAttributes);
      if (authUpdateError || !updatedAuth.user) {
        if (profileWasUpdated) {
          const rollback: { display_name?: string; role?: "admin" | "technician" } = {};
          if (displayName !== undefined) rollback.display_name = targetProfile.display_name;
          if (role !== undefined) rollback.role = targetProfile.role;
          await adminClient.from("profiles").update(rollback).eq("id", userId);
        }
        if (authUpdateError && isDuplicateEmail(authUpdateError)) {
          return jsonError("à¸­à¸µà¹€à¸¡à¸¥à¸™à¸µà¹‰à¸¡à¸µà¸šà¸±à¸à¸Šà¸µà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸­à¸¢à¸¹à¹ˆà¹à¸¥à¹‰à¸§", 409);
        }
        return jsonError("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹à¸à¹‰à¹„à¸‚à¸šà¸±à¸à¸Šà¸µà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¹„à¸”à¹‰", 500);
      }
      updatedAuthUser = updatedAuth.user;
    }

    return Response.json({
      user: {
        id: userId,
        email: updatedAuthUser.email ?? targetAuth.user.email,
        display_name: displayName ?? targetProfile.display_name,
        role: role ?? targetProfile.role,
        approval_status: targetProfile.approval_status,
      },
    });
  } catch {
    return jsonError("à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¸ à¸²à¸¢à¹ƒà¸™à¸£à¸°à¸šà¸š", 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

    const { data: callerProfile, error: callerProfileError } = await sessionClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (callerProfileError) return jsonError("ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้ได้", 500);
    if (callerProfile?.role !== "admin") return jsonError("ไม่มีสิทธิ์ใช้งาน API นี้", 403);

    const { id: rawUserId } = await context.params;
    if (!uuidPattern.test(rawUserId)) return jsonError("User ID ไม่ถูกต้อง", 400);
    const userId = rawUserId.toLowerCase();
    if (userId === authData.user.id) return jsonError("ไม่สามารถลบบัญชีที่กำลังใช้งานได้", 409);

    const adminClient = getSupabaseAdminClient();
    const [{ data: targetAuth, error: targetAuthError }, { data: targetProfile, error: targetProfileError }] = await Promise.all([
      adminClient.auth.admin.getUserById(userId),
      adminClient.from("profiles").select("id, role").eq("id", userId).maybeSingle(),
    ]);
    if (targetAuthError || !targetAuth.user) return jsonError("ไม่พบผู้ใช้ที่ต้องการลบ", 404);
    if (targetProfileError) return jsonError("ไม่สามารถอ่านข้อมูล profile ได้", 500);
    if (!targetProfile) return jsonError("ไม่พบ profile ของผู้ใช้", 404);

    if (targetProfile.role === "admin") {
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) return jsonError("ไม่สามารถตรวจสอบจำนวน Admin ได้", 500);
      if (count !== null && count <= 1) return jsonError("ไม่สามารถลบ Admin คนสุดท้ายได้", 409);
    }

    const { count: maintenanceCount, error: maintenanceError } = await adminClient
      .from("maintenance_records")
      .select("id", { count: "exact", head: true })
      .eq("technician_id", userId);
    if (maintenanceError) return jsonError("ไม่สามารถตรวจสอบประวัติ Maintenance ได้", 500);
    if (maintenanceCount !== null && maintenanceCount > 0) {
      return jsonError("ไม่สามารถลบผู้ใช้ที่มีประวัติ Maintenance ได้", 409);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      const message = deleteError.message.toLowerCase();
      if (deleteError.code === "user_not_found" || message.includes("user not found")) {
        return jsonError("ไม่พบผู้ใช้ที่ต้องการลบ", 404);
      }
      if (deleteError.code === "23503" || message.includes("maintenance_records") || message.includes("maintenance_technician")) {
        return jsonError("ไม่สามารถลบผู้ใช้ที่มีประวัติ Maintenance ได้", 409);
      }
      return jsonError("ไม่สามารถลบบัญชีผู้ใช้ได้", 500);
    }

    return Response.json({ success: true });
  } catch {
    return jsonError("เกิดข้อผิดพลาดภายในระบบ", 500);
  }
}
