"use client";

import { useEffect, useState } from "react";
import AuthControls from "./AuthControls";
import AutomationSidebar from "./AutomationSidebar";
import { getSupabaseClient, type UserRole } from "../lib/supabase/client";

type DashboardIdentity = {
  displayName: string;
  role: UserRole | null;
};

const metrics = [
  { label: "Total Machines", value: "24", note: "Across 4 production lines", tone: "green", marker: "M" },
  { label: "Running", value: "18", note: "75% of installed assets", tone: "lime", marker: "R" },
  { label: "Stop", value: "02", note: "Awaiting operator action", tone: "amber", marker: "S" },
  { label: "Alarm", value: "01", note: "Requires attention", tone: "red", marker: "A" },
  { label: "Maintenance", value: "03", note: "Currently under service", tone: "blue", marker: "M" },
  { label: "Total Alarms", value: "128", note: "Recorded this month", tone: "violet", marker: "!" },
  { label: "Total Maintenance", value: "42", note: "Work orders this month", tone: "teal", marker: "W" },
] as const;

const machineStatuses = [
  { label: "Running", count: 18, tone: "running" },
  { label: "Stop", count: 2, tone: "stopped" },
  { label: "Alarm", count: 1, tone: "alarmed" },
  { label: "Maintenance", count: 3, tone: "servicing" },
] as const;

const alarmRows = [
  { code: "AL-2048", machine: "Filler Line 02", description: "Bottle feed pressure below threshold", status: "Open", time: "10:42", dateTime: "2026-09-30T10:42:00+07:00" },
  { code: "AL-1182", machine: "CNC Cell 04", description: "Spindle temperature warning", status: "In Progress", time: "09:18", dateTime: "2026-09-30T09:18:00+07:00" },
  { code: "AL-0931", machine: "Conveyor A1", description: "Photoelectric sensor misalignment", status: "Open", time: "08:56", dateTime: "2026-09-30T08:56:00+07:00" },
  { code: "AL-0874", machine: "Press Station 03", description: "Hydraulic pressure fluctuation", status: "Closed", time: "Yesterday", dateTime: "2026-09-29T15:24:00+07:00" },
] as const;

const maintenanceRows = [
  { machine: "Robot Arm R-07", technician: "Narin S.", description: "Replace wrist-axis encoder", status: "In Progress", time: "11:10", dateTime: "2026-09-30T11:10:00+07:00" },
  { machine: "Filler Line 02", technician: "Mali K.", description: "Inspect pneumatic valve assembly", status: "Planned", time: "09:30", dateTime: "2026-09-30T09:30:00+07:00" },
  { machine: "CNC Cell 01", technician: "Krit P.", description: "Quarterly spindle lubrication", status: "Completed", time: "Yesterday", dateTime: "2026-09-29T14:05:00+07:00" },
] as const;

function roleLabel(role: UserRole | null) {
  if (role === "admin") return "Admin";
  if (role === "technician") return "Technician";
  return "Role unavailable";
}

export default function AutomationDashboard() {
  const [identity, setIdentity] = useState<DashboardIdentity>({
    displayName: "Loading profile",
    role: null,
  });

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
            displayName: profile?.display_name.trim() || fallbackName || "Factory operator",
            role: profile?.role ?? null,
          });
        }
      } catch {
        if (isMounted) setIdentity({ displayName: "Factory operator", role: null });
      }
    }

    loadIdentity();
    return () => {
      isMounted = false;
    };
  }, []);

  const initials = identity.displayName.trim().slice(0, 1).toUpperCase() || "U";

  return (
    <div className="ams-shell" id="overview">
      <AutomationSidebar activeItem="dashboard" />

      <div className="ams-workspace">
        <header className="ams-topbar">
          <div className="ams-breadcrumb"><span>OPERATIONS</span><b>/</b><strong>OVERVIEW</strong></div>
          <div className="ams-topbar-meta"><span className="ams-shift-tag"><i /> DAY SHIFT <b>06:00–14:00</b></span><span className="ams-sample-tag">SAMPLE DATA</span></div>
        </header>

        <main className="ams-main">
          <section className="ams-heading-row">
            <div>
              <p className="ams-eyebrow">AUTOMATION MANAGEMENT SYSTEM</p>
              <h1>Plant overview</h1>
              <p className="ams-subtitle">Production status and maintenance activity at a glance.</p>
            </div>
            <div className="ams-account">
              <div className="ams-avatar" aria-hidden="true">{initials}</div>
              <div className="ams-account-copy"><strong>{identity.displayName}</strong><span>{roleLabel(identity.role)}</span></div>
              <AuthControls />
            </div>
          </section>

          <section className="ams-metrics" aria-label="Plant metrics">
            {metrics.map((metric) => (
              <article className={`ams-metric ams-tone-${metric.tone}`} key={metric.label}>
                <div className="ams-metric-top"><span>{metric.label}</span><span className="ams-metric-marker" aria-hidden="true">{metric.marker}</span></div>
                <strong className="ams-metric-value">{metric.value}</strong>
                <small>{metric.note}</small>
              </article>
            ))}
          </section>

          <div className="ams-overview-grid">
            <section className="ams-section ams-machine-status" id="machine-status" aria-labelledby="machine-status-title">
              <div className="ams-section-heading">
                <div><p className="ams-eyebrow">ASSET HEALTH</p><h2 id="machine-status-title">Machine status</h2></div>
                <span className="ams-total-chip">24 TOTAL</span>
              </div>
              <div className="ams-status-list">
                {machineStatuses.map((status) => (
                  <div className="ams-status-row" key={status.label}>
                    <div className="ams-status-label"><span className={`ams-status-dot is-${status.tone}`} /><span>{status.label}</span><strong>{String(status.count).padStart(2, "0")}</strong></div>
                    <div className="ams-status-track"><span className={`ams-status-fill is-${status.tone}`} style={{ width: `${(status.count / 24) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className="ams-status-foot"><span>Asset availability</span><strong>75%</strong></div>
            </section>

            <section className="ams-section ams-alarm-section" id="alarms" aria-labelledby="alarms-title">
              <div className="ams-section-heading">
                <div><p className="ams-eyebrow">ATTENTION REQUIRED</p><h2 id="alarms-title">Recent alarms</h2></div>
                <a className="ams-section-link" href="#alarms">View all <span aria-hidden="true">↗</span></a>
              </div>
              <div className="ams-table-scroll">
                <table className="ams-table">
                  <thead><tr><th>Alarm code</th><th>Machine</th><th>Description</th><th>Status</th><th>Occurred at</th></tr></thead>
                  <tbody>
                    {alarmRows.map((alarm) => (
                      <tr key={alarm.code}>
                        <td><strong className="ams-code">{alarm.code}</strong></td>
                        <td>{alarm.machine}</td>
                        <td className="ams-description">{alarm.description}</td>
                        <td><span className={`ams-status-pill is-${alarm.status.toLowerCase().replace(" ", "-")}`}>{alarm.status}</span></td>
                        <td><time dateTime={alarm.dateTime}>{alarm.time}</time></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="ams-section ams-maintenance-section" id="maintenance" aria-labelledby="maintenance-title">
            <div className="ams-section-heading">
              <div><p className="ams-eyebrow">SERVICE ACTIVITY</p><h2 id="maintenance-title">Recent maintenance</h2></div>
              <a className="ams-section-link" href="#maintenance">View all <span aria-hidden="true">↗</span></a>
            </div>
            <div className="ams-table-scroll">
              <table className="ams-table ams-maintenance-table">
                <thead><tr><th>Machine</th><th>Technician</th><th>Description</th><th>Status</th><th>Maintenance at</th></tr></thead>
                <tbody>
                  {maintenanceRows.map((record) => (
                    <tr key={`${record.machine}-${record.time}`}>
                      <td><strong>{record.machine}</strong></td>
                      <td>{record.technician}</td>
                      <td className="ams-description">{record.description}</td>
                      <td><span className={`ams-status-pill is-${record.status.toLowerCase().replace(" ", "-")}`}>{record.status}</span></td>
                      <td><time dateTime={record.dateTime}>{record.time}</time></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="ams-footer"><span>AMS <b>·</b> PLANT OPERATIONS</span><span>OPERATIONAL SNAPSHOT <i /></span></footer>
        </main>
      </div>
    </div>
  );
}