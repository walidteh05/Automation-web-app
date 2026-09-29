"use client";

import { useEffect, useState, type FormEvent } from "react";
import AuthControls from "./AuthControls";
import AutomationSidebar from "./AutomationSidebar";
import { getSupabaseClient, type UserRole } from "../lib/supabase/client";

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
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
];

const statuses: { value: AlarmStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
];

function toDatetimeLocal(value: Date) {
  const localTime = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function friendlyError(error: { code?: string; message?: string }) {
  if (error.code === "42501") return "Supabase denied this action. Check your account permissions.";
  if (error.code === "23503") return "The selected machine or user is no longer available.";
  if (error.code === "23514") return "The selected status is not supported.";
  return "Unable to save the alarm. Please check the information and try again.";
}

export default function AlarmRecordsWorkspace() {
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AlarmStatusFilter>("all");
  const [machineFilter, setMachineFilter] = useState("all");
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
        if (!currentUserId) throw new Error("No authenticated user");

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
          throw new Error("Unable to verify account role");
        }

        if (isMounted) {
          setUserId(currentUserId);
          setRole(profileResult.data.role);
          setMachines(machinesResult.data ?? []);
          setAlarms((alarmsResult.data ?? []) as AlarmRecord[]);
        }
      } catch {
        if (isMounted) setError("Unable to load alarm records. Check your connection and access permissions.");
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
      setFormError("Choose a machine and complete the alarm code, description, and date/time.");
      return;
    }
    if (!statuses.some((option) => option.value === draft.status)) {
      setFormError("Select a valid alarm status.");
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
      setNotice(editingId ? "Alarm record updated." : "Alarm record added.");
      reloadRecords();
    } catch (saveError) {
      setFormError(friendlyError(saveError as { code?: string; message?: string }));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAlarm(alarm: AlarmRecord) {
    if (!isAdmin || !window.confirm(`Delete alarm ${alarm.alarm_code}? This action cannot be undone.`)) return;

    setDeletingId(alarm.id);
    setNotice("");
    try {
      const { error: deleteError } = await getSupabaseClient()
        .from("alarm_records")
        .delete()
        .eq("id", alarm.id);
      if (deleteError) throw deleteError;
      setAlarms((current) => current.filter((item) => item.id !== alarm.id));
      setNotice(`${alarm.alarm_code} deleted.`);
    } catch {
      setError("Unable to delete this alarm. Check your access permissions and try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="ams-shell">
      <AutomationSidebar activeItem="alarms" />
      <div className="ams-workspace">
        <header className="ams-topbar">
          <div className="ams-breadcrumb"><span>OPERATIONS</span><b>/</b><strong>ALARMS</strong></div>
          <div className="ams-topbar-meta"><span className="ams-readonly-tag">ALARM RECORDS</span><AuthControls /></div>
        </header>

        <main className="ams-main ams-alarms-main">
          <section className="ams-heading-row ams-alarms-heading">
            <div>
              <p className="ams-eyebrow">EVENT LOG</p>
              <h1>Alarm records</h1>
              <p className="ams-subtitle">Review and track machine events across the plant.</p>
            </div>
            <div className="ams-alarm-heading-actions">
              <div className="ams-machine-count"><strong>{filteredAlarms.length}</strong><span>RECORDS SHOWN</span></div>
              {!isRoleLoading && canManage && <button className="ams-add-machine-button" type="button" onClick={openCreateForm}><span aria-hidden="true">+</span> Add Alarm</button>}
            </div>
          </section>

          {notice && <p className="ams-inline-notice" role="status">{notice}</p>}
          {error && <p className="ams-inline-error" role="alert">{error}</p>}

          <section className="ams-machine-browser" aria-label="Alarm records">
            <div className="ams-machine-toolbar ams-alarm-toolbar">
              <label className="ams-search-field">
                <span aria-hidden="true">⌕</span>
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, description, or machine" aria-label="Search alarm code, description, machine code, or machine name" />
              </label>
              <label className="ams-status-filter"><span>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AlarmStatusFilter)} aria-label="Filter alarms by status">
                  {statusFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="ams-status-filter"><span>Machine</span>
                <select value={machineFilter} onChange={(event) => setMachineFilter(event.target.value)} aria-label="Filter alarms by machine">
                  <option value="all">All machines</option>
                  {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_code} · {machine.machine_name}</option>)}
                </select>
              </label>
              <button className="ams-refresh-button" type="button" onClick={reloadRecords} disabled={isLoading}><span aria-hidden="true">↻</span> Refresh</button>
            </div>

            <div className="ams-table-scroll">
              <table className="ams-table ams-alarm-table">
                <thead><tr><th>Alarm Code</th><th>Machine</th><th>Description</th><th>Occurred At</th><th>Cause</th><th>Status</th><th>Created By</th><th>Actions</th></tr></thead>
                <tbody>
                  {isLoading ? (
                    <tr><td className="ams-table-message" colSpan={8}>Loading alarm records...</td></tr>
                  ) : error && alarms.length === 0 ? (
                    <tr><td className="ams-table-message is-error" colSpan={8}>{error}</td></tr>
                  ) : filteredAlarms.length === 0 ? (
                    <tr><td className="ams-table-message" colSpan={8}>{alarms.length === 0 ? "No alarm records found." : "No alarms match these filters."}</td></tr>
                  ) : (
                    filteredAlarms.map((alarm) => (
                      <tr key={alarm.id}>
                        <td><strong className="ams-code">{alarm.alarm_code}</strong></td>
                        <td><span className="ams-alarm-machine-code">{alarm.machine?.machine_code ?? "Machine unavailable"}</span><small className="ams-alarm-machine-name">{alarm.machine?.machine_name ?? alarm.machine_id}</small></td>
                        <td className="ams-description">{alarm.alarm_description}</td>
                        <td><time dateTime={alarm.occurred_at}>{formatDateTime(alarm.occurred_at)}</time></td>
                        <td className="ams-description">{alarm.cause || "—"}</td>
                        <td><span className={`ams-status-pill is-${alarm.status.replace("_", "-")}`}>{statuses.find((item) => item.value === alarm.status)?.label}</span></td>
                        <td>{alarm.creator?.display_name ?? (alarm.created_by ? `${alarm.created_by.slice(0, 8)}…` : "System")}</td>
                        <td><div className="ams-machine-actions">
                          {canManage && <button type="button" onClick={() => openEditForm(alarm)} aria-label={`Edit ${alarm.alarm_code}`}>Edit</button>}
                          {isAdmin && <button type="button" className="is-delete" onClick={() => deleteAlarm(alarm)} disabled={deletingId === alarm.id} aria-label={`Delete ${alarm.alarm_code}`}>{deletingId === alarm.id ? "Deleting" : "Delete"}</button>}
                          {!canManage && <span className="ams-action-placeholder" aria-label="Read only">—</span>}
                        </div></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="ams-machine-table-foot"><span>Showing {filteredAlarms.length} of {alarms.length} alarm records</span><span>{isAdmin ? "ADMIN ACCESS" : role === "technician" ? "TECHNICIAN ACCESS" : "ROLE UNAVAILABLE"}</span></div>
          </section>

          {draft && (
            <div className="ams-modal-backdrop">
              <form className="ams-machine-form ams-alarm-form" onSubmit={saveAlarm} aria-labelledby="alarm-form-title" role="dialog" aria-modal="true">
                <div className="ams-form-heading">
                  <div><p className="ams-eyebrow">ALARM RECORD</p><h2 id="alarm-form-title">{editingId ? "Edit Alarm" : "Add Alarm"}</h2></div>
                  <button className="ams-modal-close" type="button" onClick={closeForm} disabled={isSaving} aria-label="Close form">×</button>
                </div>
                {formError && <p className="ams-form-error" role="alert">{formError}</p>}
                <div className="ams-form-grid">
                  <label className="ams-form-field ams-form-field-wide"><span>Machine <b>*</b></span>
                    <select required value={draft.machine_id} onChange={(event) => updateDraft("machine_id", event.target.value)}>
                      <option value="">Select active machine</option>
                      {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_code} · {machine.machine_name}</option>)}
                    </select>
                  </label>
                  <label className="ams-form-field"><span>Alarm Code <b>*</b></span><input autoFocus required maxLength={100} value={draft.alarm_code} onChange={(event) => updateDraft("alarm_code", event.target.value)} /></label>
                  <label className="ams-form-field"><span>Status <b>*</b></span>
                    <select required value={draft.status} onChange={(event) => updateDraft("status", event.target.value as AlarmStatus)}>
                      {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="ams-form-field ams-form-field-wide"><span>Alarm Description <b>*</b></span><textarea required maxLength={1000} rows={3} value={draft.alarm_description} onChange={(event) => updateDraft("alarm_description", event.target.value)} /></label>
                  <label className="ams-form-field"><span>Occurred At <b>*</b></span><input type="datetime-local" required value={draft.occurred_at} onChange={(event) => updateDraft("occurred_at", event.target.value)} /></label>
                  <label className="ams-form-field"><span>Cause</span><textarea maxLength={1000} rows={2} value={draft.cause} onChange={(event) => updateDraft("cause", event.target.value)} /></label>
                </div>
                <div className="ams-form-actions">
                  <button className="ams-form-cancel" type="button" onClick={closeForm} disabled={isSaving}>Cancel</button>
                  <button className="ams-form-save" type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Alarm"}</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}