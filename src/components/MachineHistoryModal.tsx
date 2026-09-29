"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

type MachineHistoryTarget = {
  id: string;
  machine_code: string;
  machine_name: string;
};

type AlarmHistoryRecord = {
  id: string;
  alarm_code: string;
  alarm_description: string;
  cause: string | null;
  occurred_at: string;
  status: "open" | "in_progress" | "closed";
  creator: { display_name: string } | null;
};

type MaintenanceHistoryRecord = {
  id: string;
  description: string;
  work_performed: string | null;
  maintenance_at: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  technician: { display_name: string } | null;
};

type HistoryItem = {
  id: string;
  type: "Alarm" | "Maintenance";
  occurredAt: string;
  title: string;
  note: string | null;
  status: string;
  statusLabel: string;
  responsible: string;
};

const statusLabels: Record<string, string> = {
  open: "เปิด",
  in_progress: "กำลังดำเนินการ",
  closed: "ปิดแล้ว",
  planned: "วางแผน",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    calendar: "gregory",
    numberingSystem: "latn",
  }).format(new Date(value));
}

type MachineHistoryModalProps = {
  machine: MachineHistoryTarget;
  onClose: () => void;
};

export default function MachineHistoryModal({ machine, onClose }: MachineHistoryModalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!machine.id) return;
    let isMounted = true;

    async function loadHistory() {
      try {
        const supabase = getSupabaseClient();
        const [alarmsResult, maintenanceResult] = await Promise.all([
          supabase
            .from("alarm_records")
            .select("id, alarm_code, alarm_description, cause, occurred_at, status, creator:profiles!alarm_records_created_by_fkey(display_name)")
            .eq("machine_id", machine.id)
            .order("occurred_at", { ascending: false }),
          supabase
            .from("maintenance_records")
            .select("id, description, work_performed, maintenance_at, status, technician:profiles!maintenance_records_technician_id_fkey(display_name)")
            .eq("machine_id", machine.id)
            .order("maintenance_at", { ascending: false }),
        ]);

        if (alarmsResult.error) throw alarmsResult.error;
        if (maintenanceResult.error) throw maintenanceResult.error;

        const alarmItems: HistoryItem[] = ((alarmsResult.data ?? []) as AlarmHistoryRecord[]).map((record) => ({
          id: `alarm-${record.id}`,
          type: "Alarm",
          occurredAt: record.occurred_at,
          title: `${record.alarm_code} · ${record.alarm_description}`,
          note: record.cause,
          status: record.status,
          statusLabel: statusLabels[record.status] ?? record.status,
          responsible: record.creator?.display_name ?? "ไม่ระบุผู้บันทึก",
        }));
        const maintenanceItems: HistoryItem[] = ((maintenanceResult.data ?? []) as MaintenanceHistoryRecord[]).map((record) => ({
          id: `maintenance-${record.id}`,
          type: "Maintenance",
          occurredAt: record.maintenance_at,
          title: record.description,
          note: record.work_performed,
          status: record.status,
          statusLabel: statusLabels[record.status] ?? record.status,
          responsible: record.technician?.display_name ?? "ไม่ระบุช่างผู้รับผิดชอบ",
        }));

        if (isMounted) {
          setHistory([...alarmItems, ...maintenanceItems].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()));
          setError("");
        }
      } catch {
        if (isMounted) setError("โหลดประวัติเครื่องจักรไม่สำเร็จ โปรดลองโหลดใหม่หรือตรวจสอบสิทธิ์การเข้าถึง");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [machine.id, reloadKey]);

  function reloadHistory() {
    setHistory([]);
    setError("");
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  return (
    <div className="ams-history-backdrop">
      <section className="ams-history-modal" role="dialog" aria-modal="true" aria-labelledby="machine-history-title">
        <header className="ams-history-heading">
          <div>
            <p className="ams-eyebrow">ประวัติเครื่องจักร</p>
            <h2 id="machine-history-title">Machine History</h2>
            <p className="ams-history-machine-name"><strong>{machine.machine_code}</strong> · {machine.machine_name}</p>
          </div>
          <div className="ams-history-heading-actions">
            <button className="ams-refresh-button" type="button" onClick={reloadHistory} disabled={isLoading} aria-label="โหลดประวัติเครื่องจักรใหม่">
              <span aria-hidden="true">↻</span> โหลดใหม่
            </button>
            <button className="ams-modal-close" type="button" onClick={onClose} aria-label="ปิดประวัติเครื่องจักร">×</button>
          </div>
        </header>

        {!machine.id ? (
          <p className="ams-history-state is-error" role="alert">ไม่พบรหัสเครื่องจักรสำหรับโหลดประวัติ</p>
        ) : isLoading ? (
          <p className="ams-history-state" role="status">กำลังโหลดประวัติเครื่องจักร...</p>
        ) : error ? (
          <div className="ams-history-state is-error" role="alert"><p>{error}</p><button className="ams-refresh-button" type="button" onClick={reloadHistory}>ลองอีกครั้ง</button></div>
        ) : history.length === 0 ? (
          <p className="ams-history-state">ยังไม่มีประวัติของเครื่องจักรนี้</p>
        ) : (
          <ol className="ams-history-list">
            {history.map((item) => (
              <li className={`ams-history-item is-${item.type.toLowerCase()}`} key={item.id}>
                <time className="ams-history-date" dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
                <div className="ams-history-content">
                  <div className="ams-history-item-heading"><span className="ams-history-type">{item.type}</span><h3>{item.title}</h3></div>
                  {item.note && <p className="ams-history-note">{item.type === "Alarm" ? "สาเหตุ" : "งานที่ดำเนินการ"}: {item.note}</p>}
                  <p className="ams-history-responsible">ผู้รับผิดชอบ: {item.responsible}</p>
                </div>
                <span className={`ams-status-pill is-${item.status.replace("_", "-")}`}>{item.statusLabel}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
