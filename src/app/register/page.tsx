import Link from "next/link";
import AuthForm from "../../components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="register-page">
      <section className="register-shell">
        <aside className="register-visual">
          <Link className="register-brand" href="/" aria-label="กลับหน้า Dashboard Automation Management System">
            <span className="register-brand-mark">⌘</span>
            <span>AMS_ACCESS_v1</span>
          </Link>
          <div>
            <h1>เริ่มต้นใช้งานระบบ Automation</h1>
            <p>จัดการข้อมูลเครื่องจักร ติดตาม Alarm และบันทึกงานซ่อมบำรุงได้ในระบบเดียว</p>
            <div className="register-terminal" aria-label="สถานะระบบ">
              <div className="terminal-bar"><span /><span /><span /><small>ข้อมูลผู้ใช้</small></div>
              <div className="terminal-lines"><b>กำลังเตรียมบัญชีผู้ใช้...</b><span>&gt; ตรวจสอบข้อมูลผู้ใช้งาน</span><span>&gt; พร้อมลงทะเบียน</span><em>● ระบบพร้อมใช้งาน</em></div>
            </div>
          </div>
          <div className="register-edition"><span>รุ่นระบบ</span><strong>2026.1</strong></div>
        </aside>

        <section className="register-panel" aria-labelledby="register-title">
          <div className="register-mobile-label"><span /> AUTOMATION MANAGEMENT SYSTEM</div>
          <h2 id="register-title">สมัครสมาชิก</h2>
          <p className="register-intro">กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้งาน</p>
          <AuthForm mode="register" />
        </section>
      </section>
    </main>
  );
}