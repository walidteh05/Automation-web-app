"use client";

import { useEffect, useState, type FormEvent } from "react";
import AuthControls from "./AuthControls";
import AutomationSidebar from "./AutomationSidebar";
import NotificationCenter from "./NotificationCenter";
import { getSupabaseClient, type UserRole } from "../lib/supabase/client";
import { downloadCsv } from "../lib/csv";
import { isValidDateRange, isWithinLocalDateRange } from "../lib/dateRange";

type AlarmStatus = "open" | "in_progress" | "closed";
type AlarmStatusFilter = "all" | AlarmStatus;

type AlarmRecord = {
  id: string;
  machine_id: string;
  alarm_code: string;
  alarm_description: string;
  occurred_at: string;
  cause: string | null;
  status: AlarmStatus;
  created_by: string | null;
  machine: { machine_code: string; machine_name: string } | null;
  creator: { display_name: string } | null;
};

type MachineOption = {
  id: string;
  machine_code: string;
  machine_name: string;
};

type AlarmDraft = {
  machine_id: string;
  alarm_code: string;
  alarm_description: string;
  occurred_at: string;
  cause: string;
  status: AlarmStatus;
};

const statusFilters: { value: AlarmStatusFilter; label: string }[] = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "open", label: "เปิด" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "closed", label: "ปิดแล้ว" },
];

const statuses: { value: AlarmStatus; label: string }[] = [
  { value: "open", label: "เปิด" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "closed", label: "ปิดแล้ว" },
];

function toDatetimeLocal(value: Date) {
  const localTime = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    calendar: "gregory",
    numberingSystem: "latn",
  }).format(new Date(value));
}

function friendlyError(error: { code?: string; message?: string }) {
  if (error.code === "42501") return "ไม่มีสิทธิ์ดำเนินการนี้ โปรดตรวจสอบสิทธิ์บัญชีผู้ใช้";
  if (error.code === "23503") return "ไม่พบเครื่องจักรหรือผู้ใช้ที่เลือกแล้ว";
  if (error.code === "23514") return "สถานะที่เลือกไม่รองรับ";
  return "บันทึก Alarm ไม่สำเร็จ โปรดตรวจสอบข้อมูลแล้วลองอีกครั้ง";
}

export default function AlarmRecordsWorkspace() {
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AlarmStatusFilter>("all");
  const [machineFilter, setMachineFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<AlarmDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = role === "admin";
  const canManage = role === "admin" || role === "technician";

  useEffect(() => {
    let isMounted = true;

    async function loadAlarmData() {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const currentUserId = sessionData.session?.user.id;
        if (!currentUserId) throw new Error("ไม่พบผู้ใช้ที่เข้าสู่ระบบ");

        const [profileResult, machinesResult, alarmsResult] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", currentUserId).maybeSingle(),
          supabase.from("machines").select("id, machine_code, machine_name").is("deleted_at", null).order("machine_code"),
          supabase
            .from("alarm_records")
            .select("id, machine_id, alarm_code, alarm_description, occurred_at, cause, status, created_by, machine:machines!alarm_records_machine_id_fkey(machine_code, machine_name), creator:profiles!alarm_records_created_by_fkey(display_name)")
            .order("occurred_at", { ascending: false }),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (machinesResult.error) throw machinesResult.error;
        if (alarmsResult.error) throw alarmsResult.error;

        if (!profileResult.data || !["admin", "technician"].includes(profileResult.data.role)) {
          throw new Error("ไม่สามารถตรวจสอบสิทธิ์บัญชีได้");
        }

        if (isMounted) {
          setUserId(currentUserId);
          setRole(profileResult.data.role);
          setMachines(machinesResult.data ?? []);
          setAlarms((alarmsResult.data ?? []) as AlarmRecord[]);
        }
      } catch {
        if (isMounted) setError("โหลดข้อมูล Alarm ไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อและสิทธิ์การใช้งาน");
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRoleLoading(false);
        }
      }
    }

    loadAlarmData();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const isDateRangeValid = isValidDateRange(startDate, endDate);
  const hasDateRange = Boolean(startDate || endDate);
  const filteredAlarms = alarms.filter((alarm) => {
    const searchValues = [
      alarm.alarm_code,
      alarm.alarm_description,
      alarm.machine?.machine_code ?? "",
      alarm.machine?.machine_name ?? "",
    ];
    const matchesSearch = searchValues.some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === "all" || alarm.status === statusFilter;
    const matchesMachine = machineFilter === "all" || alarm.machine_id === machineFilter;
    const matchesDate = isDateRangeValid && isWithinLocalDateRange(alarm.occurred_at, startDate, endDate);
    return matchesSearch && matchesStatus && matchesMachine && matchesDate;
  });

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setMachineFilter("all");
    setStartDate("");
    setEndDate("");
  }

  function reloadRecords() {
    setError("");
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  function exportAlarms() {
    if (filteredAlarms.length === 0) return;
    downloadCsv("alarms", ["Alarm Code", "Machine Code", "Machine Name", "Description", "Cause", "Occurred At", "Status", "Created By"], filteredAlarms.map((alarm) => [
      alarm.alarm_code,
      alarm.machine?.machine_code ?? "",
      alarm.machine?.machine_name ?? "",
      alarm.alarm_description,
      alarm.cause,
      alarm.occurred_at,
      statuses.find((item) => item.value === alarm.status)?.label ?? alarm.status,
      alarm.creator?.display_name ?? (alarm.created_by ? `${alarm.created_by.slice(0, 8)}…` : "ระบบ"),
    ]));
  }

  function openCreateForm() {
    setEditingId(null);
    setDraft({
      machine_id: "",
      alarm_code: "",
      alarm_description: "",
      occurred_at: toDatetimeLocal(new Date()),
      cause: "",
      status: "open",
    });
    setFormError("");
    setNotice("");
  }

  function openEditForm(alarm: AlarmRecord) {
    setEditingId(alarm.id);
    setDraft({
      machine_id: alarm.machine_id,
      alarm_code: alarm.alarm_code,
      alarm_description: alarm.alarm_description,
      occurred_at: toDatetimeLocal(new Date(alarm.occurred_at)),
      cause: alarm.cause ?? "",
      status: alarm.status,
    });
    setFormError("");
    setNotice("");
  }

  function closeForm() {
    if (isSaving) return;
    setDraft(null);
    setEditingId(null);
    setFormError("");
  }

  function updateDraft<K extends keyof AlarmDraft>(field: K, value: AlarmDraft[K]) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  async function saveAlarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !draft) return;

    const alarmCode = draft.alarm_code.trim();
    const alarmDescription = draft.alarm_description.trim();
    const occurredAt = new Date(draft.occurred_at);
    if (!draft.machine_id || !alarmCode || !alarmDescription || !draft.occurred_at || Number.isNaN(occurredAt.getTime())) {
      setFormError("กรุณาเลือกเครื่องจักรและกรอกรหัส Alarm รายละเอียด และวันที่เกิดให้ครบถ้วน");
      return;
    }
    if (!statuses.some((option) => option.value === draft.status)) {
      setFormError("โปรดเลือกสถานะ Alarm ที่รองรับ");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const values = {
        machine_id: draft.machine_id,
        alarm_code: alarmCode,
        alarm_description: alarmDescription,
        occurred_at: occurredAt.toISOString(),
        cause: draft.cause.trim() || null,
        status: draft.status,
      };
      const supabase = getSupabaseClient();
      const result = editingId
        ? await supabase.from("alarm_records").update(values).eq("id", editingId)
        : await supabase.from("alarm_records").insert({ ...values, created_by: userId });
      if (result.error) throw result.error;

      setDraft(null);
      setEditingId(null);
      setNotice(editingId ? "แก้ไขรายการ Alarm สำเร็จ" : "เพิ่มรายการ Alarm สำเร็จ");
      reloadRecords();
    } catch (saveError) {
      setFormError(friendlyError(saveError as { code?: string; message?: string }));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAlarm(alarm: AlarmRecord) {
    if (!isAdmin || !window.confirm(`ต้องการลบ Alarm ${alarm.alarm_code} หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`)) return;

    setDeletingId(alarm.id);
    setNotice("");
    try {
      const { error: deleteError } = await getSupabaseClient()
        .from("alarm_records")
        .delete()
        .eq("id", alarm.id);
      if (deleteError) throw deleteError;
      setAlarms((current) => current.filter((item) => item.id !== alarm.id));
      setNotice(`ลบ Alarm ${alarm.alarm_code} แล้ว`);
    } catch {
      setError("ลบ Alarm ไม่สำเร็จ โปรดตรวจสอบสิทธิ์แล้วลองอีกครั้ง");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="ams-shell">
      <AutomationSidebar activeItem="alarms" />
      <div className="ams-workspace">
        <header className="ams-topbar">
          <div className="ams-breadcrumb"><span>ปฏิบัติการ</span><b>/</b><strong>Alarms</strong></div>
          <div className="ams-topbar-meta"><span className="ams-readonly-tag">รายการ Alarm</span><NotificationCenter refreshKey={reloadKey} /><AuthControls /></div>
        </header>

        <main className="ams-main ams-alarms-main">
          <section className="ams-heading-row ams-alarms-heading">
            <div>
              <p className="ams-eyebrow">บันทึกเหตุการณ์</p>
              <h1>Alarms</h1>
              <p className="ams-subtitle">ตรวจสอบและติดตาม Alarm ของเครื่องจักรภายในโรงงาน</p>
            </div>
            <div className="ams-alarm-heading-actions">
              <div className="ams-machine-count"><strong>{filteredAlarms.length}</strong><span>รายการที่แสดง</span></div>
              {!isRoleLoading && canManage && <button className="ams-add-machine-button" type="button" onClick={openCreateForm}><span aria-hidden="true">+</span> เพิ่ม Alarm</button>}
            </div>
          </section>

          {notice && <p className="ams-inline-notice" role="status">{notice}</p>}
          {error && <p className="ams-inline-error" role="alert">{error}</p>}

          <section className="ams-machine-browser" aria-label="รายการ Alarm">
            <div className="ams-machine-toolbar ams-alarm-toolbar ams-record-filter-bar">
              <label className="ams-filter-field">
                <span>ค้นหา</span>
                <span className="ams-search-field">
                  <span aria-hidden="true">⌕</span>
                  <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารหัส รายละเอียด หรือเครื่องจักร" aria-label="ค้นหารหัส Alarm รายละเอียด รหัสเครื่องจักร หรือชื่อเครื่องจักร" />
                </span>
              </label>
              <label className="ams-filter-field ams-status-filter"><span>สถานะ</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AlarmStatusFilter)} aria-label="กรอง Alarm ตามสถานะ">
                  {statusFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="ams-filter-field ams-status-filter"><span>เครื่องจักร</span>
                <select value={machineFilter} onChange={(event) => setMachineFilter(event.target.value)} aria-label="กรอง Alarm ตามเครื่องจักร">
                  <option value="all">เครื่องจักรทั้งหมด</option>
                  {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_code} · {machine.machine_name}</option>)}
                </select>
              </label>
              <label className="ams-filter-field ams-date-filter"><span>วันที่เริ่มต้น</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="วันที่เริ่มต้นสำหรับกรอง Alarm" /></label>
              <label className="ams-filter-field ams-date-filter"><span>วันที่สิ้นสุด</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="วันที่สิ้นสุดสำหรับกรอง Alarm" /></label>
              <div className="ams-filter-actions">
                <button className="ams-clear-filter-button" type="button" onClick={clearFilters}>ล้างตัวกรอง</button>
                <button className="ams-refresh-button" type="button" onClick={reloadRecords} disabled={isLoading}><span aria-hidden="true">↻</span> โหลดใหม่</button>
                <button className="ams-export-button" type="button" onClick={exportAlarms} disabled={isLoading || filteredAlarms.length === 0} aria-label="ส่งออก Alarm เป็น CSV"><span aria-hidden="true">↓</span> Export CSV</button>
                {!isLoading && filteredAlarms.length === 0 && <span className="ams-export-empty" role="status">ไม่มีข้อมูลสำหรับส่งออก</span>}
              </div>
              {!isDateRangeValid && <p className="ams-date-range-error" role="alert">วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด</p>}
            </div>

            <div className="ams-table-scroll">
              <table className="ams-table ams-alarm-table">
                <thead><tr><th>รหัส Alarm</th><th>เครื่องจักร</th><th>รายละเอียด</th><th>วันที่เกิด</th><th>สาเหตุ</th><th>สถานะ</th><th>ผู้บันทึก</th><th>จัดการ</th></tr></thead>
                <tbody>
                  {isLoading ? (
                    <tr><td className="ams-table-message" colSpan={8}>กำลังโหลดข้อมูล...</td></tr>
                  ) : error && alarms.length === 0 ? (
                    <tr><td className="ams-table-message is-error" colSpan={8}>{error}</td></tr>
                  ) : filteredAlarms.length === 0 ? (
                    <tr><td className="ams-table-message" colSpan={8}>{hasDateRange ? "ไม่พบข้อมูลในช่วงวันที่ที่เลือก" : alarms.length === 0 ? "ไม่พบข้อมูล Alarm" : "ไม่พบ Alarm ที่ตรงกับตัวกรอง"}</td></tr>
                  ) : (
                    filteredAlarms.map((alarm) => (
                      <tr key={alarm.id}>
                        <td><strong className="ams-code">{alarm.alarm_code}</strong></td>
                        <td><span className="ams-alarm-machine-code">{alarm.machine?.machine_code ?? "ไม่พบข้อมูลเครื่องจักร"}</span><small className="ams-alarm-machine-name">{alarm.machine?.machine_name ?? ""}</small></td>
                        <td className="ams-description">{alarm.alarm_description}</td>
                        <td><time dateTime={alarm.occurred_at}>{formatDateTime(alarm.occurred_at)}</time></td>
                        <td className="ams-description">{alarm.cause || "—"}</td>
                        <td><span className={`ams-status-pill is-${alarm.status.replace("_", "-")}`}>{statuses.find((item) => item.value === alarm.status)?.label}</span></td>
                        <td>{alarm.creator?.display_name ?? (alarm.created_by ? `${alarm.created_by.slice(0, 8)}…` : "ระบบ")}</td>
                        <td><div className="ams-machine-actions">
                          {canManage && <button type="button" onClick={() => openEditForm(alarm)} aria-label={`แก้ไข ${alarm.alarm_code}`}>แก้ไข</button>}
                          {isAdmin && <button type="button" className="is-delete" onClick={() => deleteAlarm(alarm)} disabled={deletingId === alarm.id} aria-label={`ลบ ${alarm.alarm_code}`}>{deletingId === alarm.id ? "กำลังลบ" : "ลบ"}</button>}
                          {!canManage && <span className="ams-action-placeholder" aria-label="ดูข้อมูลได้อย่างเดียว">—</span>}
                        </div></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="ams-machine-table-foot"><span>แสดง {filteredAlarms.length} จาก {alarms.length} รายการ Alarm</span><span>{isAdmin ? "Admin: จัดการได้" : role === "technician" ? "Technician: จัดการได้" : "ไม่มีข้อมูลสิทธิ์"}</span></div>
          </section>

          {draft && (
            <div className="ams-modal-backdrop">
              <form className="ams-machine-form ams-alarm-form" onSubmit={saveAlarm} aria-labelledby="alarm-form-title" role="dialog" aria-modal="true">
                <div className="ams-form-heading">
                  <div><p className="ams-eyebrow">รายการ Alarm</p><h2 id="alarm-form-title">{editingId ? "แก้ไข Alarm" : "เพิ่ม Alarm"}</h2></div>
                  <button className="ams-modal-close" type="button" onClick={closeForm} disabled={isSaving} aria-label="ปิดแบบฟอร์ม">×</button>
                </div>
                {formError && <p className="ams-form-error" role="alert">{formError}</p>}
                <div className="ams-form-grid">
                  <label className="ams-form-field ams-form-field-wide"><span>เครื่องจักร <b>*</b></span>
                    <select required value={draft.machine_id} onChange={(event) => updateDraft("machine_id", event.target.value)}>
                      <option value="">เลือกเครื่องจักรที่ใช้งาน</option>
                      {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_code} · {machine.machine_name}</option>)}
                    </select>
                  </label>
                  <label className="ams-form-field"><span>รหัส Alarm <b>*</b></span><input autoFocus required maxLength={100} value={draft.alarm_code} onChange={(event) => updateDraft("alarm_code", event.target.value)} /></label>
                  <label className="ams-form-field"><span>สถานะ <b>*</b></span>
                    <select required value={draft.status} onChange={(event) => updateDraft("status", event.target.value as AlarmStatus)}>
                      {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="ams-form-field ams-form-field-wide"><span>รายละเอียด Alarm <b>*</b></span><textarea required maxLength={1000} rows={3} value={draft.alarm_description} onChange={(event) => updateDraft("alarm_description", event.target.value)} /></label>
                  <label className="ams-form-field"><span>วันที่เกิด <b>*</b></span><input type="datetime-local" required value={draft.occurred_at} onChange={(event) => updateDraft("occurred_at", event.target.value)} /></label>
                  <label className="ams-form-field"><span>สาเหตุ</span><textarea maxLength={1000} rows={2} value={draft.cause} onChange={(event) => updateDraft("cause", event.target.value)} /></label>
                </div>
                <div className="ams-form-actions">
                  <button className="ams-form-cancel" type="button" onClick={closeForm} disabled={isSaving}>ยกเลิก</button>
                  <button className="ams-form-save" type="submit" disabled={isSaving}>{isSaving ? "กำลังบันทึก..." : "บันทึก Alarm"}</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
