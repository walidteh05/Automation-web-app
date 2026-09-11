import Link from "next/link";
import AuthForm from "../../components/AuthForm";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-shell">
        <header className="login-header">
          <div className="login-topic-badge"><span aria-hidden="true">⌘</span> BASE_NUMBER // AUTH</div>
          <Link className="login-brand" href="/" aria-label="กลับหน้าหลัก Base Number Handbook">
            Base Number <strong>Handbook</strong>
          </Link>
          <p>คู่มือการเรียนรู้ระบบเลขฐานและคอมพิวเตอร์</p>
        </header>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-header">
            <h1 id="login-title">ยินดีต้อนรับกลับ</h1>
            <p>เข้าสู่ระบบเพื่อเข้าใช้งานบทเรียนและแบบฝึกหัด</p>
          </div>
          <AuthForm mode="login" />
        </section>

        <p className="login-copyright">© Base Number Handbook. Educational Purpose.</p>
      </div>
    </main>
  );
}