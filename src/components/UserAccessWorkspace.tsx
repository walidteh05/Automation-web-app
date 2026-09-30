"use client";

import { useEffect, useMemo, useState } from "react";
import AuthControls from "./AuthControls";
import AutomationSidebar from "./AutomationSidebar";
import { getSupabaseClient, type UserRole } from "../lib/supabase/client";

type ApprovalStatus = "pending" | "approved" | "rejected";

type Profile = {
  id: string;
  display_name: string;
  role: UserRole;
  approval_status: string;
  created_at: string;
};

type EditUserValues = {
  email: string;
  password: string;
  display_name: string;
  role: UserRole | "";
};

const approvalLabels: Record<ApprovalStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ",
};

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function getApprovalStatus(value: string): ApprovalStatus | null {
  if (value === "pending" || value === "approved" || value === "rejected") return value;
  return null;
}

async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("id, display_name, role, approval_status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export default function UserAccessWorkspace() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newUser, setNewUser] = useState({ email: "", password: "", display_name: "", role: "" as UserRole | "" });
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editError, setEditError] = useState("");
  const [editValues, setEditValues] = useState<EditUserValues>({ email: "", password: "", display_name: "", role: "" });
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  function resetNewUser() {
    setNewUser({ email: "", password: "", display_name: "", role: "" });
    setCreateError("");
  }

  function closeCreateDialog() {
    if (isCreating) return;
    setIsCreateOpen(false);
    resetNewUser();
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) return;

    const email = newUser.email.trim();
    const displayName = newUser.display_name.trim();
    if (!email || !displayName || newUser.password.length < 8 || !newUser.role) {
      setCreateError("กรุณากรอกข้อมูลให้ครบถ้วน และรหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    setIsCreating(true);
    setCreateError("");
    setActionError("");
    setSuccess("");
    try {
      const { data: sessionData, error: sessionError } = await getSupabaseClient().auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        setCreateError("ไม่มีสิทธิ์ใช้งาน กรุณาเข้าสู่ระบบในฐานะ Admin อีกครั้ง");
        return;
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email, password: newUser.password, display_name: displayName, role: newUser.role }),
      });
      const result = await response.json().catch(() => null) as { error?: unknown } | null;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setCreateError("ไม่มีสิทธิ์เพิ่มผู้ใช้ กรุณาเข้าสู่ระบบในฐานะ Admin");
        } else if (response.status === 409) {
          setCreateError(typeof result?.error === "string" ? result.error : "อีเมลนี้มีบัญชีผู้ใช้อยู่แล้ว");
        } else if (response.status === 400) {
          setCreateError(typeof result?.error === "string" ? result.error : "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
        } else {
          setCreateError("ไม่สามารถเพิ่มผู้ใช้ได้ กรุณาลองอีกครั้ง");
        }
        return;
      }

      setIsCreateOpen(false);
      resetNewUser();
      setSuccess("เพิ่มผู้ใช้เรียบร้อยแล้ว");
      try {
        setProfiles(await fetchProfiles());
      } catch {
        setActionError("เพิ่มผู้ใช้สำเร็จแล้ว แต่โหลดรายชื่อใหม่ไม่สำเร็จ กรุณากดรีเฟรช");
      }
    } catch {
      setCreateError("ไม่สามารถเชื่อมต่อเพื่อเพิ่มผู้ใช้ได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsCreating(false);
    }
  }

  function openEditDialog(profile: Profile) {
    setEditValues({ email: "", password: "", display_name: profile.display_name, role: profile.role });
    setEditError("");
    setEditingProfile(profile);
  }

  function closeEditDialog() {
    if (isUpdatingUser) return;
    setEditingProfile(null);
    setEditValues({ email: "", password: "", display_name: "", role: "" });
    setEditError("");
  }

  async function updateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUpdatingUser || !editingProfile) return;

    const email = editValues.email.trim();
    const displayName = editValues.display_name.trim();
    if (!displayName || !editValues.role || (editValues.password.length > 0 && editValues.password.length < 8)) {
      setEditError("กรุณาตรวจสอบข้อมูล และรหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    const update: { email?: string; password?: string; display_name?: string; role?: UserRole } = {};
    if (email) update.email = email;
    if (editValues.password) update.password = editValues.password;
    if (displayName !== editingProfile.display_name) update.display_name = displayName;
    if (editValues.role !== editingProfile.role) update.role = editValues.role;
    if (Object.keys(update).length === 0) {
      setEditError("ไม่มีข้อมูลที่เปลี่ยนแปลง");
      return;
    }

    setIsUpdatingUser(true);
    setEditError("");
    setActionError("");
    setSuccess("");
    try {
      const { data: sessionData, error: sessionError } = await getSupabaseClient().auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        setEditError("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
        return;
      }

      const response = await fetch(`/api/admin/users/${encodeURIComponent(editingProfile.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(update),
      });
      const result = await response.json().catch(() => null) as { error?: unknown } | null;
      if (!response.ok) {
        if (response.status === 400) setEditError("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
        else if (response.status === 401) setEditError("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
        else if (response.status === 403) setEditError("ไม่มีสิทธิ์แก้ไขผู้ใช้นี้");
        else if (response.status === 404) setEditError("ไม่พบผู้ใช้ที่ต้องการแก้ไข");
        else if (response.status === 409) setEditError(typeof result?.error === "string" ? result.error : "ไม่สามารถแก้ไขข้อมูลนี้ได้");
        else setEditError("ไม่สามารถแก้ไขผู้ใช้ได้ กรุณาลองอีกครั้ง");
        return;
      }

      setEditingProfile(null);
      setEditValues({ email: "", password: "", display_name: "", role: "" });
      setSuccess("แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว");
      try {
        setProfiles(await fetchProfiles());
      } catch {
        setActionError("แก้ไขผู้ใช้สำเร็จแล้ว แต่โหลดรายชื่อใหม่ไม่สำเร็จ กรุณากดรีเฟรช");
      }
    } catch {
      setEditError("ไม่สามารถเชื่อมต่อเพื่อแก้ไขผู้ใช้ได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsUpdatingUser(false);
    }
  }

  async function confirmDeleteUser() {
    if (isDeletingUser || !deletingProfile) return;

    setIsDeletingUser(true);
    setDeleteError("");
    setActionError("");
    setSuccess("");
    try {
      const { data: sessionData, error: sessionError } = await getSupabaseClient().auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) {
        setDeleteError("กรุณาเข้าสู่ระบบใหม่");
        return;
      }

      const response = await fetch(`/api/admin/users/${encodeURIComponent(deletingProfile.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json().catch(() => null) as { error?: unknown } | null;
      if (!response.ok) {
        if (response.status === 401) setDeleteError("กรุณาเข้าสู่ระบบใหม่");
        else if (response.status === 403) setDeleteError("ไม่มีสิทธิ์ลบผู้ใช้นี้");
        else if (response.status === 404) setDeleteError("ไม่พบผู้ใช้ที่ต้องการลบ");
        else if (response.status === 409) setDeleteError(typeof result?.error === "string" ? result.error : "ไม่สามารถลบผู้ใช้นี้ได้");
        else setDeleteError("เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
      }

      setDeletingProfile(null);
      setSuccess("ลบผู้ใช้เรียบร้อยแล้ว");
      try {
        setProfiles(await fetchProfiles());
      } catch {
        setActionError("ลบผู้ใช้สำเร็จแล้ว แต่โหลดรายชื่อใหม่ไม่สำเร็จ กรุณากดรีเฟรช");
      }
    } catch {
      setDeleteError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsDeletingUser(false);
    }
  }

  function closeDeleteDialog() {
    if (isDeletingUser) return;
    setDeletingProfile(null);
    setDeleteError("");
  }

  async function approveProfile(profile: Profile) {
    if (profile.approval_status !== "pending" || approvingId !== null || isUpdatingUser || isDeletingUser) return;

    setApprovingId(profile.id);
    setActionError("");
    setSuccess("");
    let updateSucceeded = false;

    try {
      const { data, error: updateError } = await getSupabaseClient()
        .from("profiles")
        .update({ approval_status: "approved" })
        .eq("id", profile.id)
        .eq("approval_status", "pending")
        .select("id");
      if (updateError) throw updateError;
      if (!data?.length) throw new Error("สถานะของผู้ใช้นี้เปลี่ยนแปลงแล้ว กรุณารีเฟรชรายการ");
      updateSucceeded = true;

      const refreshedProfiles = await fetchProfiles();
      setProfiles(refreshedProfiles);
      setSuccess("อนุมัติแล้ว");
    } catch {
      setActionError(updateSucceeded
        ? "อนุมัติสิทธิ์แล้ว แต่โหลดรายชื่อใหม่ไม่สำเร็จ กรุณากดรีเฟรช"
        : "อนุมัติสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setApprovingId(null);
    }
  }

  function refreshProfiles() {
    setIsLoading(true);
    setError("");
    setActionError("");
    setSuccess("");
    fetchProfiles().then(setProfiles).catch(() => {
      setError("ไม่สามารถโหลดรายชื่อผู้ใช้ได้ กรุณาตรวจสอบสิทธิ์แล้วลองอีกครั้ง");
    }).finally(() => setIsLoading(false));
  }

  useEffect(() => {
    let isMounted = true;
    fetchProfiles().then((rows) => {
      if (isMounted) setProfiles(rows);
    }).catch(() => {
      if (isMounted) setError("ไม่สามารถโหลดรายชื่อผู้ใช้ได้ กรุณาตรวจสอบสิทธิ์แล้วลองอีกครั้ง");
    }).finally(() => {
      if (isMounted) setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return profiles;
    return profiles.filter((profile) => profile.display_name.toLocaleLowerCase().includes(normalizedSearch));
  }, [profiles, search]);

  return (
    <div className="ams-shell">
      <AutomationSidebar activeItem="user-access" />
      <div className="ams-workspace">
        <header className="ams-topbar">
          <div className="ams-breadcrumb"><span>จัดการระบบ</span><b>/</b><strong>User Access</strong></div>
          <div className="ams-topbar-meta"><span className="ams-readonly-tag">ผู้ดูแลระบบ</span><AuthControls /></div>
        </header>

        <main className="ams-main">
          <section className="ams-heading-row">
            <div>
              <p className="ams-eyebrow">การจัดการบัญชีผู้ใช้</p>
              <h1>User Access</h1>
              <p className="ams-subtitle">รายชื่อผู้ใช้และสถานะการอนุมัติ</p>
            </div>
            <div className="ams-machines-heading-actions">
              <button
                className="ams-add-machine-button"
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isCreateOpen}
                style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                onClick={() => { setCreateError(""); setIsCreateOpen(true); }}
                disabled={isCreating}
              >
                <span aria-hidden="true">+</span> เพิ่มผู้ใช้
              </button>
              <button className="ams-refresh-button" type="button" onClick={refreshProfiles} disabled={isLoading || approvingId !== null || isCreating}>
                <span aria-hidden="true">↻</span> {isLoading ? "กำลังโหลด..." : "รีเฟรช"}
              </button>
            </div>
          </section>

          {error && <p className="ams-inline-error" role="alert">{error}</p>}
          {actionError && <p className="ams-inline-error" role="alert">{actionError}</p>}
          {success && <p className="ams-inline-notice" role="status">{success}</p>}

          <section className="ams-machine-browser" aria-label="รายชื่อผู้ใช้">
            <div className="ams-machine-toolbar">
              <label className="ams-search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="ค้นหาจากชื่อผู้ใช้..."
                  aria-label="ค้นหาจากชื่อผู้ใช้"
                />
              </label>
              <span className="ams-machine-count"><strong>{filteredProfiles.length}</strong> บัญชี</span>
            </div>

            <div className="ams-table-scroll">
              <table className="ams-table ams-user-access-table">
                <thead>
                  <tr>
                    <th scope="col">ชื่อผู้ใช้</th>
                    <th scope="col">Role</th>
                    <th scope="col">สถานะการอนุมัติ</th>
                    <th scope="col">วันที่สมัคร</th>
                    <th scope="col">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td className="ams-table-message" colSpan={5}>กำลังโหลดรายชื่อผู้ใช้...</td></tr>
                  ) : error ? (
                    <tr><td className="ams-table-message is-error" colSpan={5}>ไม่สามารถแสดงข้อมูลได้</td></tr>
                  ) : filteredProfiles.length === 0 ? (
                    <tr><td className="ams-table-message" colSpan={5}>{search.trim() ? "ไม่พบชื่อผู้ใช้ที่ค้นหา" : "ยังไม่มีข้อมูลผู้ใช้"}</td></tr>
                  ) : (
                    filteredProfiles.map((profile) => {
                      const status = getApprovalStatus(profile.approval_status);
                      return (
                        <tr key={profile.id}>
                          <td><strong>{profile.display_name}</strong></td>
                          <td>{profile.role === "admin" ? "Admin" : "Technician"}</td>
                          <td>
                            <span className={`ams-status-pill ${status === "approved" ? "is-completed" : status === "rejected" ? "is-open" : "is-planned"}`}>
                              {status ? approvalLabels[status] : "ไม่ทราบสถานะ"}
                            </span>
                          </td>
                          <td><time dateTime={profile.created_at}>{formatCreatedAt(profile.created_at)}</time></td>
                          <td>
                            <div className="ams-machine-actions">
                              <button type="button" disabled={isUpdatingUser || isDeletingUser || approvingId !== null} onClick={() => openEditDialog(profile)}>
                                แก้ไข
                              </button>
                              <button type="button" className="is-delete" disabled={isUpdatingUser || isDeletingUser || approvingId !== null} onClick={() => { setDeleteError(""); setDeletingProfile(profile); }}>
                                ลบ
                              </button>
                              {profile.approval_status === "pending" && (
                                <button
                                  type="button"
                                  disabled={approvingId !== null || isUpdatingUser || isDeletingUser}
                                  onClick={() => void approveProfile(profile)}
                                  aria-label={`${approvingId === profile.id ? "กำลังดำเนินการ..." : "อนุมัติสิทธิ์"} ${profile.display_name}`}
                                >
                                  {approvingId === profile.id ? "กำลังดำเนินการ..." : "อนุมัติสิทธิ์"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="ams-machine-table-foot"><span>ข้อมูลจาก public.profiles</span><span>{filteredProfiles.length} รายการ</span></div>
          </section>

          {isCreateOpen && (
            <div className="ams-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreateDialog(); }}>
              <form className="ams-machine-form" onSubmit={createUser} aria-labelledby="user-create-title" role="dialog" aria-modal="true">
                <div className="ams-form-heading">
                  <div><p className="ams-eyebrow">User Access</p><h2 id="user-create-title">เพิ่มผู้ใช้</h2></div>
                  <button className="ams-modal-close" type="button" onClick={closeCreateDialog} disabled={isCreating} aria-label="ปิดแบบฟอร์ม">×</button>
                </div>

                {createError && <p className="ams-form-error" role="alert">{createError}</p>}

                <div className="ams-form-grid">
                  <label className="ams-form-field ams-form-field-wide">
                    <span>Email <b>*</b></span>
                    <input autoFocus type="email" autoComplete="email" required maxLength={254} value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} />
                  </label>
                  <label className="ams-form-field ams-form-field-wide">
                    <span>Password <b>*</b></span>
                    <input type="password" autoComplete="new-password" required minLength={8} value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} />
                  </label>
                  <label className="ams-form-field ams-form-field-wide">
                    <span>ชื่อที่แสดง <b>*</b></span>
                    <input type="text" autoComplete="name" required maxLength={120} value={newUser.display_name} onChange={(event) => setNewUser((current) => ({ ...current, display_name: event.target.value }))} />
                  </label>
                  <label className="ams-form-field ams-form-field-wide">
                    <span>Role <b>*</b></span>
                    <select required value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as UserRole | "" }))}>
                      <option value="">เลือก Role</option>
                      <option value="admin">Admin</option>
                      <option value="technician">Technician</option>
                    </select>
                  </label>
                </div>

                <div className="ams-form-actions">
                  <button className="ams-form-cancel" type="button" onClick={closeCreateDialog} disabled={isCreating}>ยกเลิก</button>
                  <button className="ams-form-save" type="submit" disabled={isCreating}>{isCreating ? "กำลังเพิ่มผู้ใช้..." : "เพิ่มผู้ใช้"}</button>
                </div>
              </form>
            </div>
          )}

          {editingProfile && (
            <div className="ams-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditDialog(); }}>
              <form className="ams-machine-form" onSubmit={updateUser} aria-labelledby="user-edit-title" role="dialog" aria-modal="true">
                <div className="ams-form-heading">
                  <div><p className="ams-eyebrow">User Access</p><h2 id="user-edit-title">แก้ไขผู้ใช้</h2></div>
                  <button className="ams-modal-close" type="button" onClick={closeEditDialog} disabled={isUpdatingUser} aria-label="ปิดแบบฟอร์ม">×</button>
                </div>

                {editError && <p className="ams-form-error" role="alert">{editError}</p>}

                <div className="ams-form-grid">
                  <label className="ams-form-field ams-form-field-wide">
                    <span>Email (กรอกเมื่อต้องการเปลี่ยน)</span>
                    <input type="email" autoComplete="email" maxLength={254} placeholder="เว้นว่างหากไม่เปลี่ยน" value={editValues.email} onChange={(event) => setEditValues((current) => ({ ...current, email: event.target.value }))} />
                  </label>
                  <label className="ams-form-field ams-form-field-wide">
                    <span>Password (ไม่บังคับ)</span>
                    <input type="password" autoComplete="new-password" minLength={8} placeholder="เว้นว่างหากไม่เปลี่ยน" value={editValues.password} onChange={(event) => setEditValues((current) => ({ ...current, password: event.target.value }))} />
                  </label>
                  <label className="ams-form-field ams-form-field-wide">
                    <span>ชื่อที่แสดง <b>*</b></span>
                    <input type="text" autoComplete="name" required maxLength={120} value={editValues.display_name} onChange={(event) => setEditValues((current) => ({ ...current, display_name: event.target.value }))} />
                  </label>
                  <label className="ams-form-field ams-form-field-wide">
                    <span>Role <b>*</b></span>
                    <select required value={editValues.role} onChange={(event) => setEditValues((current) => ({ ...current, role: event.target.value as UserRole | "" }))}>
                      <option value="">เลือก Role</option>
                      <option value="admin">Admin</option>
                      <option value="technician">Technician</option>
                    </select>
                  </label>
                </div>

                <div className="ams-form-actions">
                  <button className="ams-form-cancel" type="button" onClick={closeEditDialog} disabled={isUpdatingUser}>ยกเลิก</button>
                  <button className="ams-form-save" type="submit" disabled={isUpdatingUser}>{isUpdatingUser ? "กำลังบันทึก..." : "บันทึก"}</button>
                </div>
              </form>
            </div>
          )}

          {deletingProfile && (
            <div className="ams-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDeleteDialog(); }}>
              <section className="ams-machine-form" role="dialog" aria-modal="true" aria-labelledby="user-delete-title">
                <div className="ams-form-heading">
                  <div><p className="ams-eyebrow">User Access</p><h2 id="user-delete-title">ยืนยันการลบผู้ใช้</h2></div>
                  <button className="ams-modal-close" type="button" onClick={closeDeleteDialog} disabled={isDeletingUser} aria-label="ปิดหน้าต่าง">×</button>
                </div>

                {deleteError && <p className="ams-form-error" role="alert">{deleteError}</p>}
                <p>ต้องการลบผู้ใช้ <strong>{deletingProfile.display_name}</strong> หรือไม่</p>
                <p className="ams-form-error">การลบผู้ใช้ไม่สามารถย้อนกลับได้</p>

                <div className="ams-form-actions">
                  <button className="ams-form-cancel" type="button" onClick={closeDeleteDialog} disabled={isDeletingUser}>ยกเลิก</button>
                  <button className="ams-form-save" type="button" onClick={() => void confirmDeleteUser()} disabled={isDeletingUser}>
                    {isDeletingUser ? "กำลังลบ..." : "ยืนยันลบ"}
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
