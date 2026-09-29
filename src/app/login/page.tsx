import Link from "next/link";
import AuthForm from "../../components/AuthForm";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-shell">
        <header className="login-header">
          <div className="login-topic-badge"><span aria-hidden="true">⌘</span> AMS // เข้าสู่ระบบ</div>
          <Link className="login-brand" href="/" aria-label="กลับหน้า Dashboard Automation Management System">
            Automation <strong>Management System</strong>
          </Link>
          <p>ระบบบริหารจัดการงาน Automation ภายในโรงงาน</p>
        </header>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-header">
            <h1 id="login-title">เข้าสู่ระบบ</h1>
            <p>เข้าสู่ระบบเพื่อจัดการเครื่องจักร Alarm และงานซ่อมบำรุง</p>
          </div>
          <AuthForm mode="login" />
        </section>

        <p className="login-copyright">© Automation Management System</p>
      </div>
    </main>
  );
}