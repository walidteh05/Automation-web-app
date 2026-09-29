import Link from "next/link";

type AutomationSidebarProps = {
  activeItem: "dashboard" | "machines" | "alarms";
};

export default function AutomationSidebar({ activeItem }: AutomationSidebarProps) {
  return (
    <aside className="ams-sidebar">
      <Link className="ams-brand" href="/" aria-label="Automation Management System dashboard">
        <span className="ams-brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="ams-brand-copy"><strong>AMS</strong><small>PLANT OPERATIONS</small></span>
      </Link>

      <div className="ams-nav-label">WORKSPACE</div>
      <nav className="ams-navigation" aria-label="Main navigation">
        <Link className={`ams-nav-link${activeItem === "dashboard" ? " is-active" : ""}`} href="/" aria-current={activeItem === "dashboard" ? "page" : undefined}>
          <span className="ams-nav-glyph">01</span>Dashboard
        </Link>
        <Link className={`ams-nav-link${activeItem === "machines" ? " is-active" : ""}`} href="/machines" aria-current={activeItem === "machines" ? "page" : undefined}>
          <span className="ams-nav-glyph">02</span>Machines
        </Link>
        <Link className={`ams-nav-link${activeItem === "alarms" ? " is-active" : ""}`} href="/alarms" aria-current={activeItem === "alarms" ? "page" : undefined}>
          <span className="ams-nav-glyph">03</span>Alarms
        </Link>
        <Link className="ams-nav-link" href="/#maintenance"><span className="ams-nav-glyph">04</span>Maintenance</Link>
      </nav>

      <div className="ams-sidebar-foot">
        <span className="ams-online-dot" />
        <span><strong>Plant network</strong><small>Operational</small></span>
      </div>
    </aside>
  );
}