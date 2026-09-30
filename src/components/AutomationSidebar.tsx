"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

type AutomationSidebarProps = {
  activeItem: "dashboard" | "machines" | "alarms" | "maintenance" | "user-access";
};

export default function AutomationSidebar({ activeItem }: AutomationSidebarProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminRole() {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", sessionData.session.user.id)
          .maybeSingle();
        if (isMounted && profile?.role === "admin") setIsAdmin(true);
      } catch {
        // Keep the admin-only navigation hidden if the role cannot be verified.
      }
    }

    void checkAdminRole();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside className="ams-sidebar">
      <Link className="ams-brand" href="/" aria-label="Dashboard ระบบ Automation Management System">
        <span className="ams-brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="ams-brand-copy"><strong>AMS</strong><small>ปฏิบัติการโรงงาน</small></span>
      </Link>

      <div className="ams-nav-label">พื้นที่ระบบ</div>
      <nav className="ams-navigation" aria-label="เมนูหลัก">
        <Link className={`ams-nav-link${activeItem === "dashboard" ? " is-active" : ""}`} href="/" aria-current={activeItem === "dashboard" ? "page" : undefined}>
          <span className="ams-nav-glyph">01</span>Dashboard
        </Link>
        <Link className={`ams-nav-link${activeItem === "machines" ? " is-active" : ""}`} href="/machines" aria-current={activeItem === "machines" ? "page" : undefined}>
          <span className="ams-nav-glyph">02</span>Machines
        </Link>
        <Link className={`ams-nav-link${activeItem === "alarms" ? " is-active" : ""}`} href="/alarms" aria-current={activeItem === "alarms" ? "page" : undefined}>
          <span className="ams-nav-glyph">03</span>Alarms
        </Link>
        <Link className={`ams-nav-link${activeItem === "maintenance" ? " is-active" : ""}`} href="/maintenance" aria-current={activeItem === "maintenance" ? "page" : undefined}>
          <span className="ams-nav-glyph">04</span>Maintenance
        </Link>
        {isAdmin && (
          <Link className={`ams-nav-link${activeItem === "user-access" ? " is-active" : ""}`} href="/user-access" aria-current={activeItem === "user-access" ? "page" : undefined}>
            <span className="ams-nav-glyph">05</span>User Access
          </Link>
        )}
      </nav>

      <div className="ams-sidebar-foot">
        <span className="ams-online-dot" />
        <span><strong>เครือข่ายโรงงาน</strong><small>พร้อมใช้งาน</small></span>
      </div>
    </aside>
  );
}
