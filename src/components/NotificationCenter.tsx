"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

type NotificationRecord = {
  id: string;
  type: "Alarm" | "Maintenance";
  title: string;
  machineCode: string;
  machineName: string;
  description: string;
  createdAt: string;
  status: string;
  href: "/alarms" | "/maintenance";
};

type AlarmRow = {
  id: string;
  alarm_code: string;
  alarm_description: string;
  occurred_at: string;
  status: "open" | "in_progress";
  machine: { machine_code: string; machine_name: string } | null;
};

type MaintenanceRow = {
  id: string;
  description: string;
  maintenance_at: string;
  status: "planned" | "in_progress";
  machine: { machine_code: string; machine_name: string } | null;
};

const readStorageKey = "ams-notification-read-ids-v1";

const statusLabels: Record<string, string> = {
  open: "เปิด",
  in_progress: "กำลังดำเนินการ",
  planned: "วางแผน",
};

function readStoredIds() {
  try {
    const storedValue = window.localStorage.getItem(readStorageKey);
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : [];
    return new Set(Array.isArray(parsedValue) ? parsedValue.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(readStorageKey, JSON.stringify([...ids]));
  } catch {
    // Keep the notification panel usable when browser storage is unavailable.
  }
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    calendar: "gregory",
    numberingSystem: "latn",
  }).format(new Date(value));
}

export default function NotificationCenter({ refreshKey = 0 }: { refreshKey?: number }) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const centerRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.reduce((count, item) => count + (readIds.has(item.id) ? 0 : 1), 0);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      setIsLoading(true);
      setError(false);
      setReadIds(readStoredIds());

      try {
        const supabase = getSupabaseClient();
        const [alarmResult, maintenanceResult] = await Promise.all([
          supabase
            .from("alarm_records")
            .select("id, alarm_code, alarm_description, occurred_at, status, machine:machines!alarm_records_machine_id_fkey(machine_code, machine_name)")
            .in("status", ["open", "in_progress"])
            .order("occurred_at", { ascending: false }),
          supabase
            .from("maintenance_records")
            .select("id, description, maintenance_at, status, machine:machines!maintenance_records_machine_id_fkey(machine_code, machine_name)")
            .in("status", ["planned", "in_progress"])
            .order("maintenance_at", { ascending: false }),
        ]);

        if (alarmResult.error) throw alarmResult.error;
        if (maintenanceResult.error) throw maintenanceResult.error;

        const alarmNotifications: NotificationRecord[] = ((alarmResult.data ?? []) as AlarmRow[]).map((alarm) => ({
          id: `alarm:${alarm.id}`,
          type: "Alarm",
          title: `${alarm.machine?.machine_code ?? "เครื่องจักร"} มี Alarm ใหม่`,
          machineCode: alarm.machine?.machine_code ?? "ไม่พบรหัสเครื่องจักร",
          machineName: alarm.machine?.machine_name ?? "ไม่พบชื่อเครื่องจักร",
          description: `${alarm.alarm_code} - ${alarm.alarm_description}`,
          createdAt: alarm.occurred_at,
          status: alarm.status,
          href: "/alarms",
        }));
        const maintenanceNotifications: NotificationRecord[] = ((maintenanceResult.data ?? []) as MaintenanceRow[]).map((record) => ({
          id: `maintenance:${record.id}`,
          type: "Maintenance",
          title: `${record.machine?.machine_code ?? "เครื่องจักร"} มีงานบำรุงรักษาที่รอดำเนินการ`,
          machineCode: record.machine?.machine_code ?? "ไม่พบรหัสเครื่องจักร",
          machineName: record.machine?.machine_name ?? "ไม่พบชื่อเครื่องจักร",
          description: record.description,
          createdAt: record.maintenance_at,
          status: record.status,
          href: "/maintenance",
        }));

        if (isMounted) {
          setNotifications([...alarmNotifications, ...maintenanceNotifications].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)));
        }
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, [refreshKey, retryKey]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !centerRef.current?.contains(event.target)) setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function markAsRead(id: string) {
    if (readIds.has(id)) return;
    const nextReadIds = new Set(readIds);
    nextReadIds.add(id);
    saveReadIds(nextReadIds);
    setReadIds(nextReadIds);
  }

  function markAllAsRead() {
    const nextReadIds = new Set(readIds);
    notifications.forEach((item) => nextReadIds.add(item.id));
    saveReadIds(nextReadIds);
    setReadIds(nextReadIds);
  }

  return (
    <div className="ams-notification-center" ref={centerRef}>
      <button
        className="ams-notification-trigger"
        type="button"
        aria-label="การแจ้งเตือน"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="ams-notification-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className="ams-notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <section className="ams-notification-panel" id="ams-notification-panel" role="dialog" aria-label="การแจ้งเตือน">
          <header className="ams-notification-panel-header">
            <div><h2>การแจ้งเตือน</h2><span>{unreadCount} ยังไม่ได้อ่าน</span></div>
            <div className="ams-notification-panel-actions">
              <button type="button" onClick={markAllAsRead} disabled={unreadCount === 0}>อ่านทั้งหมด</button>
              <button className="ams-notification-close" type="button" onClick={() => setIsOpen(false)} aria-label="ปิดการแจ้งเตือน">×</button>
            </div>
          </header>

          {isLoading ? (
            <p className="ams-notification-message" role="status">กำลังโหลดการแจ้งเตือน...</p>
          ) : error ? (
            <div className="ams-notification-message" role="alert">
              <p>โหลดการแจ้งเตือนไม่สำเร็จ</p>
              <button type="button" onClick={() => setRetryKey((key) => key + 1)}>ลองอีกครั้ง</button>
            </div>
          ) : notifications.length === 0 ? (
            <p className="ams-notification-message">ไม่มีการแจ้งเตือน</p>
          ) : (
            <div className="ams-notification-list">
              {notifications.map((item) => {
                const isRead = readIds.has(item.id);
                return (
                  <Link
                    className={`ams-notification-item ${isRead ? "is-read" : "is-unread"}`}
                    href={item.href}
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                  >
                    <div className="ams-notification-item-top">
                      <span className={`ams-notification-type is-${item.type.toLowerCase()}`}>{item.type}</span>
                      <span className="ams-notification-status">{statusLabels[item.status] ?? item.status}</span>
                    </div>
                    <strong className="ams-notification-title">{item.title}</strong>
                    <span className="ams-notification-machine">{item.machineCode} · {item.machineName}</span>
                    <span className="ams-notification-description">{item.description}</span>
                    <span className="ams-notification-item-bottom">
                      <time dateTime={item.createdAt}>{formatNotificationTime(item.createdAt)}</time>
                      <span>{isRead ? "อ่านแล้ว" : "ยังไม่ได้อ่าน"}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}