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
  analyticsAlarms: Pick<DashboardAlarm, "status" | "occurred_at">[];
};

const emptyDashboardData: DashboardData = {
  machines: [],
  alarms: [],
  alarmCount: 0,
  maintenance: [],
  maintenanceCount: 0,
  analyticsAlarms: [],
};

const alarmStatusItems = [
  { value: "open", label: "เปิด", color: "#cb6255" },
  { value: "in_progress", label: "กำลังดำเนินการ", color: "#468c9a" },
  { value: "closed", label: "ปิดแล้ว", color: "#559769" },
] as const;

function buildAlarmTrend(alarms: DashboardData["analyticsAlarms"]) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    return date;
  });
  const counts = days.map((date) => alarms.filter((alarm) => {
    const occurredAt = new Date(alarm.occurred_at);
    return occurredAt.getFullYear() === date.getFullYear() && occurredAt.getMonth() === date.getMonth() && occurredAt.getDate() === date.getDate();
  }).length);
  const maxCount = Math.max(...counts, 1);
  const points = counts.map((count, index) => `${28 + (index * 544) / 13},${126 - (count / maxCount) * 102}`).join(" ");
  return { days, counts, maxCount, points };
}

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

        const analyticsAlarms: DashboardData["analyticsAlarms"] = [];
        const pageSize = 1000;
        for (let start = 0; ; start += pageSize) {
          const { data, error } = await supabase.from("alarm_records").select("status, occurred_at").order("occurred_at", { ascending: true }).range(start, start + pageSize - 1);
          if (error) throw error;
          analyticsAlarms.push(...(data ?? []));
          if (!data || data.length < pageSize) break;
        }

        if (isMounted) {
          setDashboardData({
            machines: machinesResult.data ?? [],
            alarms: (alarmRowsResult.data ?? []) as DashboardAlarm[],
            alarmCount: alarmCountResult.count ?? 0,
            maintenance: (maintenanceRowsResult.data ?? []) as DashboardMaintenance[],
            maintenanceCount: maintenanceCountResult.count ?? 0,
            analyticsAlarms,
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
  const alarmCounts = alarmStatusItems.map((item) => ({ ...item, count: dashboardData.analyticsAlarms.filter((alarm) => alarm.status === item.value).length }));
  const maxStatusCount = Math.max(...alarmCounts.map((item) => item.count), 1);
  const alarmTrend = buildAlarmTrend(dashboardData.analyticsAlarms);
  const trendHasAlarms = alarmTrend.counts.some((count) => count > 0);

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

          <section className="ams-section ams-analytics-section" aria-labelledby="alarm-analytics-title">
            <div className="ams-section-heading">
              <div><p className="ams-eyebrow">วิเคราะห์รายการแจ้งเตือน</p><h2 id="alarm-analytics-title">Alarm Analytics</h2></div>
              <span className="ams-total-chip">{isDataLoading ? "—" : `${dashboardData.analyticsAlarms.length} รายการ`}</span>
            </div>
            {isDataLoading ? <p className="ams-analytics-message" role="status">กำลังโหลดข้อมูล Alarm...</p> : dataError ? <p className="ams-analytics-message is-error" role="alert">ไม่สามารถโหลดข้อมูลวิเคราะห์ Alarm ได้</p> : dashboardData.analyticsAlarms.length === 0 ? <p className="ams-analytics-message">ยังไม่มีข้อมูล Alarm สำหรับแสดงผล</p> : (
              <div className="ams-analytics-grid">
                <div className="ams-status-analytics" aria-labelledby="alarm-status-analytics-title">
                  <h3 className="ams-analytics-subtitle" id="alarm-status-analytics-title">Alarm Status Analytics</h3>
                  <div className="ams-analytics-statuses" aria-label="จำนวน Alarm ตามสถานะปัจจุบัน">
                    {alarmCounts.map((item) => <div className="ams-analytics-status" key={item.value}><div className="ams-analytics-status-label"><span className="ams-analytics-dot" style={{ backgroundColor: item.color }} /><span>{item.label}</span><strong>{item.count}</strong></div><div className="ams-status-analytics-track"><span style={{ width: `${(item.count / maxStatusCount) * 100}%`, backgroundColor: item.color }} /></div></div>)}
                  </div>
                </div>
                <div className="ams-trend-wrap">
                  <div className="ams-trend-title"><strong>Alarm Trend</strong><span>14 วันล่าสุด</span></div>
                  {!trendHasAlarms ? <p className="ams-analytics-message">ไม่มี Alarm ที่เกิดขึ้นในช่วง 14 วันที่ผ่านมา</p> : <div className="ams-trend-chart">
                    <svg viewBox="0 0 600 150" role="img" aria-label="กราฟจำนวน Alarm รายวันในช่วง 14 วันล่าสุด" preserveAspectRatio="none">
                      {[24, 75, 126].map((y) => <line key={y} x1="28" y1={y} x2="572" y2={y} className="ams-trend-gridline" />)}
                      <polyline points={alarmTrend.points} className="ams-trend-line" />
                      {alarmTrend.counts.map((count, index) => <circle key={alarmTrend.days[index].toISOString()} cx={28 + (index * 544) / 13} cy={126 - (count / alarmTrend.maxCount) * 102} r="3" className="ams-trend-point"><title>{`${alarmTrend.days[index].toLocaleDateString("th-TH", { day: "numeric", month: "short" })}: ${count} รายการ`}</title></circle>)}
                    </svg>
                    <div className="ams-trend-labels"><span>{alarmTrend.days[0].toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span><span>{alarmTrend.days[6].toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span><span>{alarmTrend.days[13].toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span></div>
                    <p className="ams-trend-caption">จำนวน Alarm ที่เกิดในแต่ละวัน</p>
                  </div>}
                </div>
              </div>
            )}
          </section>

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
