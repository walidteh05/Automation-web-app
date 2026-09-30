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
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  async function approveProfile(profile: Profile) {
    if (profile.approval_status !== "pending" || approvingId !== null) return;

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
            <button className="ams-refresh-button" type="button" onClick={refreshProfiles} disabled={isLoading || approvingId !== null}>
              <span aria-hidden="true">↻</span> {isLoading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
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
                            {profile.approval_status === "pending" ? (
                              <div className="ams-machine-actions">
                                <button
                                  type="button"
                                  disabled={approvingId !== null}
                                  onClick={() => void approveProfile(profile)}
                                  aria-label={`${approvingId === profile.id ? "กำลังดำเนินการ..." : "อนุมัติสิทธิ์"} ${profile.display_name}`}
                                >
                                  {approvingId === profile.id ? "กำลังดำเนินการ..." : "อนุมัติสิทธิ์"}
                                </button>
                              </div>
                            ) : "—"}
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
        </main>
      </div>
    </div>
  );
}
