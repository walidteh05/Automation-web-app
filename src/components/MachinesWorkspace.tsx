"use client";

import { useEffect, useState } from "react";
import AuthControls from "./AuthControls";
import AutomationSidebar from "./AutomationSidebar";
import { getSupabaseClient, type UserRole } from "../lib/supabase/client";

type MachineStatus = "running" | "stop" | "alarm" | "maintenance";
type StatusFilter = "all" | MachineStatus;

type Machine = {
  id: string;
  machine_code: string;
  machine_name: string;
  machine_type: string;
  location: string;
  status: MachineStatus;
};

type MachineDraft = Omit<Machine, "id">;

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "running", label: "Running" },
  { value: "stop", label: "Stop" },
  { value: "alarm", label: "Alarm" },
  { value: "maintenance", label: "Maintenance" },
];

const statusLabels: Record<MachineStatus, string> = {
  running: "Running",
  stop: "Stop",
  alarm: "Alarm",
  maintenance: "Maintenance",
};

const emptyDraft: MachineDraft = {
  machine_code: "",
  machine_name: "",
  machine_type: "",
  location: "",
  status: "stop",
};

export default function MachinesWorkspace() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState<MachineDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = role === "admin";

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (!userId) throw new Error("No authenticated user");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (profileError) throw profileError;
        if (isMounted) {
          setRole(profile?.role === "admin" || profile?.role === "technician" ? profile.role : null);
        }
      } catch {
        if (isMounted) setRoleError("Unable to load your role. Machine management actions are disabled.");
      } finally {
        if (isMounted) setIsRoleLoading(false);
      }
    }

    loadRole();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMachines() {
      try {
        const { data, error: queryError } = await getSupabaseClient()
          .from("machines")
          .select("id, machine_code, machine_name, machine_type, location, status")
          .is("deleted_at", null)
          .order("machine_code", { ascending: true });

        if (queryError) throw queryError;
        if (isMounted) setMachines(data ?? []);
      } catch {
        if (isMounted) setError("Unable to load machines. Check your connection and access permissions.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMachines();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredMachines = machines.filter((machine) => {
    const matchesSearch = [machine.machine_code, machine.machine_name, machine.location]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === "all" || machine.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function retryLoad() {
    setError("");
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  function openCreateForm() {
    setEditingId(null);
    setDraft({ ...emptyDraft });
    setFormError("");
    setNotice("");
  }

  function openEditForm(machine: Machine) {
    setEditingId(machine.id);
    setDraft({
      machine_code: machine.machine_code,
      machine_name: machine.machine_name,
      machine_type: machine.machine_type,
      location: machine.location,
      status: machine.status,
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

  function updateDraft<K extends keyof MachineDraft>(field: K, value: MachineDraft[K]) {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  }

  async function saveMachine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin || !draft) return;

    const values: MachineDraft = {
      machine_code: draft.machine_code.trim(),
      machine_name: draft.machine_name.trim(),
      machine_type: draft.machine_type.trim(),
      location: draft.location.trim(),
      status: draft.status,
    };

    if (Object.values(values).some((value) => !value)) {
      setFormError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const supabase = getSupabaseClient();
      const { data: duplicate, error: duplicateError } = await supabase
        .from("machines")
        .select("id")
        .eq("machine_code", values.machine_code)
        .maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate && duplicate.id !== editingId) {
        setFormError("Machine Code นี้ถูกใช้แล้ว กรุณาระบุรหัสอื่น");
        return;
      }

      const result = editingId
        ? await supabase.from("machines").update(values).eq("id", editingId).is("deleted_at", null)
        : await supabase.from("machines").insert(values);
      if (result.error) {
        if (result.error.code === "23505") {
          setFormError("Machine Code นี้ถูกใช้แล้ว กรุณาระบุรหัสอื่น");
          return;
        }
        throw result.error;
      }

      setDraft(null);
      setEditingId(null);
      setNotice(editingId ? "Machine updated successfully." : "Machine added successfully.");
      retryLoad();
    } catch {
      setFormError("บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และลองอีกครั้ง");
    } finally {
      setIsSaving(false);
    }
  }

  async function softDeleteMachine(machine: Machine) {
    if (!isAdmin || !window.confirm(`ยืนยันการนำ ${machine.machine_code} ออกจากรายการเครื่องที่ใช้งาน? ประวัติจะยังคงอยู่`)) return;

    setDeletingId(machine.id);
    setNotice("");
    try {
      const { error: deleteError } = await getSupabaseClient()
        .from("machines")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", machine.id)
        .is("deleted_at", null);
      if (deleteError) throw deleteError;

      setMachines((current) => current.filter((item) => item.id !== machine.id));
      setNotice(`${machine.machine_code} moved out of the active machine list.`);
    } catch {
      setError("Could not archive this machine. Check your access permissions and try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="ams-shell">
      <AutomationSidebar activeItem="machines" />
      <div className="ams-workspace">
        <header className="ams-topbar">
          <div className="ams-breadcrumb"><span>OPERATIONS</span><b>/</b><strong>MACHINES</strong></div>
          <div className="ams-topbar-meta"><span className="ams-readonly-tag">MACHINE MASTER</span><AuthControls /></div>
        </header>

        <main className="ams-main ams-machines-main">
          <section className="ams-heading-row ams-machines-heading">
            <div>
              <p className="ams-eyebrow">ASSET REGISTER</p>
              <h1>Machines</h1>
              <p className="ams-subtitle">Machine master data across the plant.</p>
            </div>
            <div className="ams-machines-heading-actions">
              <div className="ams-machine-count"><strong>{filteredMachines.length}</strong><span>ACTIVE MACHINES</span></div>
              {!isRoleLoading && isAdmin && <button className="ams-add-machine-button" type="button" onClick={openCreateForm}><span aria-hidden="true">+</span> Add Machine</button>}
            </div>
          </section>

          {roleError && <p className="ams-inline-error" role="alert">{roleError}</p>}
          {notice && <p className="ams-inline-notice" role="status">{notice}</p>}

          <section className="ams-machine-browser" aria-label="Machine master list">
            <div className="ams-machine-toolbar">
              <label className="ams-search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code, name, or location"
                  aria-label="Search machine code, name, or location"
                />
              </label>
              <label className="ams-status-filter">
                <span>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filter machines by status">
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <button className="ams-refresh-button" type="button" onClick={retryLoad} disabled={isLoading}>
                <span aria-hidden="true">↻</span> Refresh
              </button>
            </div>

            <div className="ams-table-scroll">
              <table className="ams-table ams-machines-table">
                <thead>
                  <tr><th>Machine Code</th><th>Machine Name</th><th>Machine Type</th><th>Location</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td className="ams-table-message" colSpan={6}>Loading machines...</td></tr>
                  ) : error ? (
                    <tr><td className="ams-table-message is-error" colSpan={6} role="alert">{error}</td></tr>
                  ) : filteredMachines.length === 0 ? (
                    <tr><td className="ams-table-message" colSpan={6}>{machines.length === 0 ? "No active machines found." : "No machines match these filters."}</td></tr>
                  ) : (
                    filteredMachines.map((machine) => (
                      <tr key={machine.id}>
                        <td><strong className="ams-code">{machine.machine_code}</strong></td>
                        <td><strong>{machine.machine_name}</strong></td>
                        <td>{machine.machine_type}</td>
                        <td>{machine.location}</td>
                        <td><span className={`ams-status-pill is-machine-${machine.status}`}>{statusLabels[machine.status]}</span></td>
                        <td>
                          {isAdmin ? (
                            <div className="ams-machine-actions">
                              <button type="button" onClick={() => openEditForm(machine)} aria-label={`Edit ${machine.machine_code}`}>Edit</button>
                              <button type="button" className="is-delete" onClick={() => softDeleteMachine(machine)} disabled={deletingId === machine.id} aria-label={`Archive ${machine.machine_code}`}>
                                {deletingId === machine.id ? "Archiving" : "Delete"}
                              </button>
                            </div>
                          ) : <span className="ams-action-placeholder" aria-label="Read only">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="ams-machine-table-foot"><span>Showing {filteredMachines.length} of {machines.length} active machines</span><span>{isAdmin ? "ADMIN CONTROLS ENABLED" : "READ ONLY"}</span></div>
          </section>

          {draft && (
            <div className="ams-modal-backdrop">
              <form className="ams-machine-form" onSubmit={saveMachine} aria-labelledby="machine-form-title" role="dialog" aria-modal="true">
                <div className="ams-form-heading">
                  <div><p className="ams-eyebrow">MACHINE MASTER</p><h2 id="machine-form-title">{editingId ? "Edit Machine" : "Add Machine"}</h2></div>
                  <button className="ams-modal-close" type="button" onClick={closeForm} disabled={isSaving} aria-label="Close form">×</button>
                </div>

                {formError && <p className="ams-form-error" role="alert">{formError}</p>}

                <div className="ams-form-grid">
                  <label className="ams-form-field"><span>Machine Code <b>*</b></span><input autoFocus required maxLength={80} value={draft.machine_code} onChange={(event) => updateDraft("machine_code", event.target.value)} /></label>
                  <label className="ams-form-field"><span>Machine Name <b>*</b></span><input required maxLength={160} value={draft.machine_name} onChange={(event) => updateDraft("machine_name", event.target.value)} /></label>
                  <label className="ams-form-field"><span>Machine Type <b>*</b></span><input required maxLength={120} value={draft.machine_type} onChange={(event) => updateDraft("machine_type", event.target.value)} /></label>
                  <label className="ams-form-field"><span>Location <b>*</b></span><input required maxLength={160} value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} /></label>
                  <label className="ams-form-field ams-form-field-wide"><span>Status <b>*</b></span>
                    <select required value={draft.status} onChange={(event) => updateDraft("status", event.target.value as MachineStatus)}>
                      {statusOptions.filter((option) => option.value !== "all").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="ams-form-actions">
                  <button className="ams-form-cancel" type="button" onClick={closeForm} disabled={isSaving}>Cancel</button>
                  <button className="ams-form-save" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Machine"}</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}