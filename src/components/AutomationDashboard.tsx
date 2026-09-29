"use client";

import { useEffect, useState } from "react";
import AuthControls from "./AuthControls";
import AutomationSidebar from "./AutomationSidebar";
import { getSupabaseClient, type UserRole } from "../lib/supabase/client";

type DashboardIdentity = {
  displayName: string;
  role: UserRole | null;
};

type MachineStatus = "running" | "stop" | "alarm" | "maintenance";
type AlarmStatus = "open" | "in_progress" | "closed";
type MaintenanceStatus = "planned" | "in_progress" | "completed" | "cancelled";

type DashboardMachine = {
  id: string;
  status: MachineStatus;
};

type DashboardAlarm = {
  id: string;
  alarm_code: string;
  alarm_description: string;
  status: AlarmStatus;
  occurred_at: string;
  machine: { machine_code: string; machine_name: string } | null;
};

type DashboardMaintenance = {
  id: string;
  description: string;
  work_performed: string | null;
  maintenance_at: string;
  status: MaintenanceStatus;
  machine: { machine_code: string; machine_name: string } | null;
  technician: { display_name: string } | null;
};

type DashboardData = {
  machines: DashboardMachine[];
  alarms: DashboardAlarm[];
  alarmCount: number;
  maintenance: DashboardMaintenance[];
  maintenanceCount: number;
};

const emptyDashboardData: DashboardData = {
  machines: [],
  alarms: [],
  alarmCount: 0,
  maintenance: [],
  maintenanceCount: 0,
};

const machineStatusItems = [
  { label: "กำลังทำงาน", value: "running", tone: "running" },
  { label: "หยุดทำงาน", value: "stop", tone: "stopped" },
  { label: "เกิด Alarm", value: "alarm", tone: "alarmed" },
  { label: "อยู่ระหว่างซ่อมบำรุง", value: "maintenance", tone: "servicing" },
] as const;

const metricStyles = [
  { label: "เครื่องจักรทั้งหมด", tone: "green", marker: "M" },
  { label: "กำลังทำงาน", tone: "lime", marker: "R" },
  { label: "หยุดทำงาน", tone: "amber", marker: "S" },
  { label: "เกิด Alarm", tone: "red", marker: "A" },
  { label: "อยู่ระหว่างซ่อมบำรุง", tone: "blue", marker: "M" },
  { label: "Alarm ทั้งหมด", tone: "violet", marker: "!" },
  { label: "รายการซ่อมบำรุงทั้งหมด", tone: "teal", marker: "W" },
] as const;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", calendar: "gregory", numberingSystem: "latn" }).format(new Date(value));
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    open: "เปิด",
    in_progress: "กำลังดำเนินการ",
    closed: "ปิดแล้ว",
    planned: "วางแผน",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
  };
  return labels[value] ?? value;
}

function roleLabel(role: UserRole | null) {
  if (role === "admin") return "Admin";
  if (role === "technician") return "Technician";
  return "ไม่มีข้อมูลสิทธิ์";
}

export default function AutomationDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(emptyDashboardData);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [identity, setIdentity] = useState<DashboardIdentity>({
    displayName: "กำลังโหลดข้อมูลผู้ใช้",
    role: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const supabase = getSupabaseClient();
        const [machinesResult, alarmRowsResult, alarmCountResult, maintenanceRowsResult, maintenanceCountResult] = await Promise.all([
          supabase.from("machines").select("id, status").is("deleted_at", null),
          supabase
            .from("alarm_records")
            .select("id, alarm_code, alarm_description, status, occurred_at, machine:machines!alarm_records_machine_id_fkey(machine_code, machine_name)")
            .order("occurred_at", { ascending: false })
            .limit(4),
          supabase.from("alarm_records").select("id", { count: "exact", head: true }),
          supabase
            .from("maintenance_records")
            .select("id, description, work_performed, maintenance_at, status, machine:machines!maintenance_records_machine_id_fkey(machine_code, machine_name), technician:profiles!maintenance_records_technician_id_fkey(display_name)")
            .order("maintenance_at", { ascending: false })
            .limit(3),
          supabase.from("maintenance_records").select("id", { count: "exact", head: true }),
        ]);

        if (machinesResult.error) throw machinesResult.error;
        if (alarmRowsResult.error) throw alarmRowsResult.error;
        if (alarmCountResult.error) throw alarmCountResult.error;
        if (maintenanceRowsResult.error) throw maintenanceRowsResult.error;
        if (maintenanceCountResult.error) throw maintenanceCountResult.error;

        if (isMounted) {
          setDashboardData({
            machines: machinesResult.data ?? [],
            alarms: (alarmRowsResult.data ?? []) as DashboardAlarm[],
            alarmCount: alarmCountResult.count ?? 0,
            maintenance: (maintenanceRowsResult.data ?? []) as DashboardMaintenance[],
            maintenanceCount: maintenanceCountResult.count ?? 0,
          });
          setDataError("");
        }
      } catch {
        if (isMounted) setDataError("โหลดข้อมูล Dashboard ไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อและสิทธิ์การใช้งาน");
      } finally {
        if (isMounted) setIsDataLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadIdentity() {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) return;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("display_name, role")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;

        const metadataName = user.user_metadata?.display_name;
        const fallbackName = typeof metadataName === "string" ? metadataName : user.email?.split("@")[0];
        if (isMounted) {
          setIdentity({
            displayName: profile?.display_name.trim() || fallbackName || "ผู้ปฏิบัติงานโรงงาน",
            role: profile?.role ?? null,
          });
        }
      } catch {
        if (isMounted) setIdentity({ displayName: "ผู้ปฏิบัติงานโรงงาน", role: null });
      }
    }

    loadIdentity();
    return () => {
      isMounted = false;
    };
  }, []);

  const machineCount = dashboardData.machines.length;
  const countMachineStatus = (status: MachineStatus) => dashboardData.machines.filter((machine) => machine.status === status).length;
  const runningCount = countMachineStatus("running");
  const machineStatuses = machineStatusItems.map((status) => ({
    ...status,
    count: countMachineStatus(status.value),
  }));
  const runningPercent = machineCount === 0 ? 0 : Math.round((runningCount / machineCount) * 100);
  const metricValues = [
    machineCount,
    runningCount,
    countMachineStatus("stop"),
    countMachineStatus("alarm"),
    countMachineStatus("maintenance"),
    dashboardData.alarmCount,
    dashboardData.maintenanceCount,
  ];
  const metricNotes = [
    "เครื่องจักรที่ใช้งาน",
    `${runningPercent}% ของเครื่องจักรที่ใช้งาน`,
    "เครื่องจักรที่หยุดทำงาน",
    "เครื่องจักรที่เกิด Alarm",
    "เครื่องจักรที่อยู่ระหว่างซ่อมบำรุง",
    "Alarm ที่บันทึกทั้งหมด",
    "รายการซ่อมบำรุงที่บันทึกทั้งหมด",
  ];

  function refreshDashboard() {
    setIsDataLoading(true);
    setDataError("");
    setReloadKey((key) => key + 1);
  }

  const initials = identity.displayName.trim().slice(0, 1).toUpperCase() || "U";

  return (
    <div className="ams-shell" id="overview">
      <AutomationSidebar activeItem="dashboard" />

      <div className="ams-workspace">
        <header className="ams-topbar">
          <div className="ams-breadcrumb"><span>ปฏิบัติการ</span><b>/</b><strong>ภาพรวม</strong></div>
          <div className="ams-topbar-meta"><span className="ams-shift-tag"><i /> กะกลางวัน <b>06:00–14:00</b></span><span className="ams-sample-tag">ข้อมูลล่าสุด</span><button className="ams-refresh-button" type="button" onClick={refreshDashboard} disabled={isDataLoading} aria-label="โหลดข้อมูล Dashboard ใหม่"><span aria-hidden="true">↻</span> โหลดใหม่</button></div>
        </header>

        <main className="ams-main">
          <section className="ams-heading-row">
            <div>
              <p className="ams-eyebrow">AUTOMATION MANAGEMENT SYSTEM</p>
              <h1>Dashboard</h1>
              <p className="ams-subtitle">ติดตามสถานะการผลิตและงานซ่อมบำรุงได้ในหน้าเดียว</p>
            </div>
            <div className="ams-account">
              <div className="ams-avatar" aria-hidden="true">{initials}</div>
              <div className="ams-account-copy"><strong>{identity.displayName}</strong><span>{roleLabel(identity.role)}</span></div>
              <AuthControls />
            </div>
          </section>

          {dataError && <p className="ams-inline-error" role="alert">{dataError}</p>}

          <section className="ams-metrics" aria-label="ข้อมูลสรุปโรงงาน">
            {metricStyles.map((metric, index) => (
              <article className={`ams-metric ams-tone-${metric.tone}`} key={metric.label}>
                <div className="ams-metric-top"><span>{metric.label}</span><span className="ams-metric-marker" aria-hidden="true">{metric.marker}</span></div>
                <strong className="ams-metric-value">{isDataLoading ? "—" : String(metricValues[index])}</strong>
                <small>{isDataLoading ? "กำลังโหลดข้อมูล..." : metricNotes[index]}</small>
              </article>
            ))}
          </section>

          <div className="ams-overview-grid">
            <section className="ams-section ams-machine-status" id="machine-status" aria-labelledby="machine-status-title">
              <div className="ams-section-heading">
                <div><p className="ams-eyebrow">สถานะเครื่องจักร</p><h2 id="machine-status-title">สถานะเครื่องจักร</h2></div>
                <span className="ams-total-chip">{isDataLoading ? "—" : `${machineCount} เครื่อง`}</span>
              </div>
              <div className="ams-status-list">
                {machineStatuses.map((status) => (
                  <div className="ams-status-row" key={status.label}>
                    <div className="ams-status-label"><span className={`ams-status-dot is-${status.tone}`} /><span>{status.label}</span><strong>{isDataLoading ? "—" : String(status.count).padStart(2, "0")}</strong></div>
                    <div className="ams-status-track"><span className={`ams-status-fill is-${status.tone}`} style={{ width: `${machineCount ? (status.count / machineCount) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className="ams-status-foot"><span>อัตราเครื่องจักรที่กำลังทำงาน</span><strong>{isDataLoading ? "—" : `${runningPercent}%`}</strong></div>
            </section>

            <section className="ams-section ams-alarm-section" id="alarms" aria-labelledby="alarms-title">
              <div className="ams-section-heading">
                <div><p className="ams-eyebrow">รายการที่ต้องติดตาม</p><h2 id="alarms-title">Alarm ล่าสุด</h2></div>
                <a className="ams-section-link" href="#alarms">ดูทั้งหมด <span aria-hidden="true">↗</span></a>
              </div>
              <div className="ams-table-scroll">
                <table className="ams-table">
                  <thead><tr><th>รหัส Alarm</th><th>เครื่องจักร</th><th>รายละเอียด</th><th>สถานะ</th><th>วันที่เกิด</th></tr></thead>
                  <tbody>
                    {isDataLoading ? (
                      <tr><td className="ams-table-message" colSpan={5}>กำลังโหลดข้อมูล...</td></tr>
                    ) : dataError ? (
                      <tr><td className="ams-table-message is-error" colSpan={5}>ไม่สามารถโหลดข้อมูล Alarm ได้</td></tr>
                    ) : dashboardData.alarms.length === 0 ? (
                      <tr><td className="ams-table-message" colSpan={5}>ไม่พบข้อมูล Alarm</td></tr>
                    ) : dashboardData.alarms.map((alarm) => (
                      <tr key={alarm.id}>
                        <td><strong className="ams-code">{alarm.alarm_code}</strong></td>
                        <td>{alarm.machine?.machine_code ?? "ไม่พบข้อมูลเครื่องจักร"} · {alarm.machine?.machine_name ?? ""}</td>
                        <td className="ams-description">{alarm.alarm_description}</td>
                        <td><span className={`ams-status-pill is-${alarm.status.replace("_", "-")}`}>{formatStatus(alarm.status)}</span></td>
                        <td><time dateTime={alarm.occurred_at}>{formatDateTime(alarm.occurred_at)}</time></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="ams-section ams-maintenance-section" id="maintenance" aria-labelledby="maintenance-title">
            <div className="ams-section-heading">
              <div><p className="ams-eyebrow">งานบริการและซ่อมบำรุง</p><h2 id="maintenance-title">การซ่อมบำรุงล่าสุด</h2></div>
              <a className="ams-section-link" href="#maintenance">ดูทั้งหมด <span aria-hidden="true">↗</span></a>
            </div>
            <div className="ams-table-scroll">
              <table className="ams-table ams-maintenance-table">
                <thead><tr><th>เครื่องจักร</th><th>ช่างผู้รับผิดชอบ</th><th>รายละเอียด</th><th>สถานะ</th><th>วันที่บำรุงรักษา</th></tr></thead>
                <tbody>
                  {isDataLoading ? (
                    <tr><td className="ams-table-message" colSpan={5}>กำลังโหลดข้อมูล...</td></tr>
                  ) : dataError ? (
                    <tr><td className="ams-table-message is-error" colSpan={5}>ไม่สามารถโหลดข้อมูลการซ่อมบำรุงได้</td></tr>
                  ) : dashboardData.maintenance.length === 0 ? (
                    <tr><td className="ams-table-message" colSpan={5}>ไม่พบข้อมูลการซ่อมบำรุง</td></tr>
                  ) : dashboardData.maintenance.map((record) => (
                    <tr key={record.id}>
                      <td><strong>{record.machine?.machine_code ?? "ไม่พบข้อมูลเครื่องจักร"} · {record.machine?.machine_name ?? ""}</strong></td>
                      <td>{record.technician?.display_name ?? "ไม่พบข้อมูลช่าง"}</td>
                      <td className="ams-description">{record.description}</td>
                      <td><span className={`ams-status-pill is-maintenance-${record.status.replace("_", "-")}`}>{formatStatus(record.status)}</span></td>
                      <td><time dateTime={record.maintenance_at}>{formatDateTime(record.maintenance_at)}</time></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="ams-footer"><span>AMS <b>·</b> ระบบปฏิบัติการโรงงาน</span><span>สถานะระบบล่าสุด <i /></span></footer>
        </main>
      </div>
    </div>
  );
}