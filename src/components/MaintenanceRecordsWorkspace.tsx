"use client";

import { useEffect, useState, type FormEvent } from "react";
import AuthControls from "./AuthControls";
import AutomationSidebar from "./AutomationSidebar";
import { getSupabaseClient, type UserRole } from "../lib/supabase/client";

type MaintenanceStatus = "planned" | "in_progress" | "completed" | "cancelled";
type MaintenanceStatusFilter = "all" | MaintenanceStatus;

type MaintenanceRecord = {
  id: string;
  machine_id: string;
  technician_id: string;
  description: string;
  work_performed: string | null;
  maintenance_at: string;
  status: MaintenanceStatus;
  machine: { machine_code: string; machine_name: string } | null;
  technician: { display_name: string } | null;
};

type MachineOption = {
  id: string;
  machine_code: string;
  machine_name: string;
};

type TechnicianOption = {
  id: string;
  display_name: string;
};

type MaintenanceDraft = {
  machine_id: string;
  technician_id: string;
  description: string;
  work_performed: string;
  maintenance_at: string;
  status: MaintenanceStatus;
};

const statusFilters: { value: MaintenanceStatusFilter; label: string }[] = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "planned", label: "วางแผน" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
];

const statuses: { value: MaintenanceStatus; label: string }[] = [
  { value: "planned", label: "วางแผน" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
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

function friendlyError(error: { code?: string }) {
  if (error.code === "42501") return "ไม่มีสิทธิ์ดำเนินการนี้ โปรดตรวจสอบสิทธิ์บัญชีผู้ใช้";
  if (error.code === "23503") return "ไม่พบเครื่องจักรหรือช่างที่เลือกแล้ว";
  if (error.code === "23514") return "สถานะที่เลือกไม่รองรับ";
  return "บันทึกรายการซ่อมบำรุงไม่สำเร็จ โปรดตรวจสอบข้อมูลแล้วลองอีกครั้ง";
}

export default function MaintenanceRecordsWorkspace() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatusFilter>("all");
  const [machineFilter, setMachineFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<MaintenanceDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = role === "admin";
  const canManage = role === "admin" || role === "technician";

  useEffect(() => {
    let isMounted = true;

    async function loadMaintenanceData() {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const userId = sessionData.session?.user.id;
        if (!userId) throw new Error("ไม่พบผู้ใช้ที่เข้าสู่ระบบ");

        const [profileResult, machineResult, technicianResult, recordResult] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
          supabase.from("machines").select("id, machine_code, machine_name").is("deleted_at", null).order("machine_code"),
          supabase.from("profiles").select("id, display_name").eq("role", "technician").order("display_name"),
          supabase
            .from("maintenance_records")
            .select("id, machine_id, technician_id, description, work_performed, maintenance_at, status, machine:machines!maintenance_records_machine_id_fkey(machine_code, machine_name), technician:profiles!maintenance_records_technician_id_fkey(display_name)")
            .order("maintenance_at", { ascending: false }),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (machineResult.error) throw machineResult.error;
        if (technicianResult.error) throw technicianResult.error;
        if (recordResult.error) throw recordResult.error;

        if (!profileResult.data || !["admin", "technician"].includes(profileResult.data.role)) {
          throw new Error("ไม่สามารถตรวจสอบสิทธิ์บัญชีได้");
        }

        if (isMounted) {
          setRole(profileResult.data.role);
          setMachines(machineResult.data ?? []);
          setTechnicians(technicianResult.data ?? []);
          setRecords((recordResult.data ?? []) as MaintenanceRecord[]);
        }
      } catch {
        if (isMounted) setError("โหลดข้อมูลการซ่อมบำรุงไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อและสิทธิ์การใช้งาน");
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRoleLoading(false);
        }
      }
    }

    loadMaintenanceData();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRecords = records.filter((record) => {
    const searchValues = [
      record.machine?.machine_code ?? "",
      record.machine?.machine_name ?? "",
      record.description,
      record.work_performed ?? "",
      record.technician?.display_name ?? "",
    ];
    const matchesSearch = searchValues.some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesMachine = machineFilter === "all" || record.machine_id === machineFilter;
    return matchesSearch && matchesStatus && matchesMachine;
  });

  function reloadRecords() {
    setError("");
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  function openCreateForm() {
    setEditingId(null);
    setDraft({
      machine_id: "",
      technician_id: "",
      description: "",
      work_performed: "",
      maintenance_at: toDatetimeLocal(new Date()),
      status: "planned",
    });
    setFormError("");
    setNotice("");
  }

  function openEditForm(record: MaintenanceRecord) {
    setEditingId(record.id);
    setDraft({
      machine_id: record.machine_id,
      technician_id: record.technician_id,
      description: record.description,
      work_performed: record.work_performed ?? "",
      maintenance_at: toDatetimeLocal(new Date(record.maintenance_at)),
      status: record.status,
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

  function updateDraft<K extends keyof MaintenanceDraft>(field: K, value: MaintenanceDraft[K]) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !draft) return;

    const description = draft.description.trim();
    const maintenanceAt = new Date(draft.maintenance_at);
    if (!draft.machine_id || !draft.technician_id || !description || !draft.maintenance_at || Number.isNaN(maintenanceAt.getTime())) {
      setFormError("เลือก Machine และ Technician พร้อมกรอก Description กับ Maintenance At ให้ครบ");
      return;
    }
    if (!statuses.some((option) => option.value === draft.status)) {
      setFormError("โปรดเลือกสถานะที่รองรับ");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const values = {
        machine_id: draft.machine_id,
        technician_id: draft.technician_id,
        description,
        work_performed: draft.work_performed.trim() || null,
        maintenance_at: maintenanceAt.toISOString(),
        status: draft.status,
      };
      const supabase = getSupabaseClient();
      const result = editingId
        ? await supabase.from("maintenance_records").update(values).eq("id", editingId)
        : await supabase.from("maintenance_records").insert(values);
      if (result.error) throw result.error;

      setDraft(null);
      setEditingId(null);
      setNotice(editingId ? "แก้ไขรายการซ่อมบำรุงสำเร็จ" : "เพิ่มรายการซ่อมบำรุงสำเร็จ");
      reloadRecords();
    } catch (saveError) {
      setFormError(friendlyError(saveError as { code?: string }));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRecord(record: MaintenanceRecord) {
    if (!isAdmin || !window.confirm(`ต้องการลบรายการซ่อมบำรุงของ ${record.machine?.machine_code ?? "เครื่องจักรนี้"} หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`)) return;

    setDeletingId(record.id);
    setNotice("");
    try {
      const { error: deleteError } = await getSupabaseClient()
        .from("maintenance_records")
        .delete()
        .eq("id", record.id);
      if (deleteError) throw deleteError;
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setNotice("ลบรายการซ่อมบำรุงแล้ว");
    } catch {
      setError("ลบรายการซ่อมบำรุงไม่สำเร็จ โปรดตรวจสอบสิทธิ์แล้วลองอีกครั้ง");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="ams-shell">
      <AutomationSidebar activeItem="maintenance" />
      <div className="ams-workspace">
        <header className="ams-topbar">
          <div className="ams-breadcrumb"><span>ปฏิบัติการ</span><b>/</b><strong>Maintenance</strong></div>
          <div className="ams-topbar-meta"><span className="ams-readonly-tag">รายการซ่อมบำรุง</span><AuthControls /></div>
        </header>

        <main className="ams-main ams-maintenance-main">
          <section className="ams-heading-row ams-maintenance-heading">
            <div>
              <p className="ams-eyebrow">งานบริการและซ่อมบำรุง</p>
              <h1>Maintenance</h1>
              <p className="ams-subtitle">วางแผนและติดตามงานซ่อมบำรุงภายในโรงงาน</p>
            </div>
            <div className="ams-maintenance-heading-actions">
              <div className="ams-machine-count"><strong>{filteredRecords.length}</strong><span>รายการที่แสดง</span></div>
              {!isRoleLoading && canManage && <button className="ams-add-machine-button" type="button" onClick={openCreateForm}><span aria-hidden="true">+</span> เพิ่มรายการซ่อมบำรุง</button>}
            </div>
          </section>

          {notice && <p className="ams-inline-notice" role="status">{notice}</p>}
          {error && <p className="ams-inline-error" role="alert">{error}</p>}

          <section className="ams-machine-browser" aria-label="รายการซ่อมบำรุง">
            <div className="ams-machine-toolbar ams-maintenance-toolbar">
              <label className="ams-search-field">
                <span aria-hidden="true">⌕</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาเครื่องจักร รายละเอียด หรือช่าง" aria-label="ค้นหารหัสเครื่องจักร ชื่อเครื่องจักร รายละเอียด งานที่ดำเนินการ หรือชื่อช่าง" />
              </label>
              <label className="ams-status-filter"><span>สถานะ</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MaintenanceStatusFilter)} aria-label="กรองรายการซ่อมบำรุงตามสถานะ">
                  {statusFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="ams-status-filter"><span>เครื่องจักร</span>
                <select value={machineFilter} onChange={(event) => setMachineFilter(event.target.value)} aria-label="กรองรายการซ่อมบำรุงตามเครื่องจักร">
                  <option value="all">เครื่องจักรทั้งหมด</option>
                  {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_code} · {machine.machine_name}</option>)}
                </select>
              </label>
              <button className="ams-refresh-button" type="button" onClick={reloadRecords} disabled={isLoading}><span aria-hidden="true">↻</span> โหลดใหม่</button>
            </div>

            <div className="ams-table-scroll">
              <table className="ams-table ams-maintenance-records-table">
                <thead><tr><th>เครื่องจักร</th><th>ช่างผู้รับผิดชอบ</th><th>รายละเอียด</th><th>งานที่ดำเนินการ</th><th>วันที่บำรุงรักษา</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
                <tbody>
                  {isLoading ? (
                    <tr><td className="ams-table-message" colSpan={7}>กำลังโหลดข้อมูล...</td></tr>
                  ) : error && records.length === 0 ? (
                    <tr><td className="ams-table-message is-error" colSpan={7}>{error}</td></tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr><td className="ams-table-message" colSpan={7}>{records.length === 0 ? "ไม่พบข้อมูลการซ่อมบำรุง" : "ไม่พบรายการที่ตรงกับตัวกรอง"}</td></tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td><span className="ams-alarm-machine-code">{record.machine?.machine_code ?? "ไม่พบข้อมูลเครื่องจักร"}</span><small className="ams-alarm-machine-name">{record.machine?.machine_name ?? ""}</small></td>
                        <td>{record.technician?.display_name ?? "ไม่พบข้อมูลช่าง"}</td>
                        <td className="ams-description">{record.description}</td>
                        <td className="ams-description">{record.work_performed || "—"}</td>
                        <td><time dateTime={record.maintenance_at}>{formatDateTime(record.maintenance_at)}</time></td>
                        <td><span className={`ams-status-pill is-maintenance-${record.status.replace("_", "-")}`}>{statuses.find((item) => item.value === record.status)?.label}</span></td>
                        <td><div className="ams-machine-actions">
                          {canManage && <button type="button" onClick={() => openEditForm(record)} aria-label={`แก้ไขรายการซ่อมบำรุง ${record.id}`}>แก้ไข</button>}
                          {isAdmin && <button type="button" className="is-delete" onClick={() => deleteRecord(record)} disabled={deletingId === record.id} aria-label={`ลบรายการซ่อมบำรุง ${record.id}`}>{deletingId === record.id ? "กำลังลบ" : "ลบ"}</button>}
                          {!canManage && <span className="ams-action-placeholder" aria-label="ดูข้อมูลได้อย่างเดียว">—</span>}
                        </div></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="ams-machine-table-foot"><span>แสดง {filteredRecords.length} จาก {records.length} รายการซ่อมบำรุง</span><span>{isAdmin ? "Admin: จัดการได้" : role === "technician" ? "Technician: จัดการได้" : "ไม่มีข้อมูลสิทธิ์"}</span></div>
          </section>

          {draft && (
            <div className="ams-modal-backdrop">
              <form className="ams-machine-form ams-maintenance-form" onSubmit={saveRecord} aria-labelledby="maintenance-form-title" role="dialog" aria-modal="true">
                <div className="ams-form-heading">
                  <div><p className="ams-eyebrow">รายการซ่อมบำรุง</p><h2 id="maintenance-form-title">{editingId ? "แก้ไขรายการซ่อมบำรุง" : "เพิ่มรายการซ่อมบำรุง"}</h2></div>
                  <button className="ams-modal-close" type="button" onClick={closeForm} disabled={isSaving} aria-label="ปิดแบบฟอร์ม">×</button>
                </div>
                {formError && <p className="ams-form-error" role="alert">{formError}</p>}
                <div className="ams-form-grid">
                  <label className="ams-form-field"><span>เครื่องจักร <b>*</b></span>
                    <select required value={draft.machine_id} onChange={(event) => updateDraft("machine_id", event.target.value)}>
                      <option value="">เลือกเครื่องจักรที่ใช้งาน</option>
                      {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_code} · {machine.machine_name}</option>)}
                    </select>
                  </label>
                  <label className="ams-form-field"><span>ช่างผู้รับผิดชอบ <b>*</b></span>
                    <select required value={draft.technician_id} onChange={(event) => updateDraft("technician_id", event.target.value)}>
                      <option value="">เลือกช่างผู้รับผิดชอบ</option>
                      {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.display_name}</option>)}
                    </select>
                  </label>
                  <label className="ams-form-field ams-form-field-wide"><span>รายละเอียด <b>*</b></span><textarea required maxLength={1000} rows={3} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} /></label>
                  <label className="ams-form-field ams-form-field-wide"><span>งานที่ดำเนินการ</span><textarea maxLength={2000} rows={3} value={draft.work_performed} onChange={(event) => updateDraft("work_performed", event.target.value)} /></label>
                  <label className="ams-form-field"><span>วันที่บำรุงรักษา <b>*</b></span><input type="datetime-local" required value={draft.maintenance_at} onChange={(event) => updateDraft("maintenance_at", event.target.value)} /></label>
                  <label className="ams-form-field"><span>สถานะ <b>*</b></span>
                    <select required value={draft.status} onChange={(event) => updateDraft("status", event.target.value as MaintenanceStatus)}>
                      {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="ams-form-actions">
                  <button className="ams-form-cancel" type="button" onClick={closeForm} disabled={isSaving}>ยกเลิก</button>
                  <button className="ams-form-save" type="submit" disabled={isSaving}>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}