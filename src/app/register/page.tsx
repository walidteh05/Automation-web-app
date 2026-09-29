import Link from "next/link";
import AuthForm from "../../components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="register-page">
      <section className="register-shell">
        <aside className="register-visual">
          <Link className="register-brand" href="/" aria-label="กลับหน้าหลัก Base Number Handbook">
            <span className="register-brand-mark">⌘</span>
            <span>BASE_SYSTEM_v2.0</span>
          </Link>
          <div>
            <h1>เริ่มต้นเรียนรู้ระบบเลขฐาน &amp; Digital Logic</h1>
            <p>เข้าถึงคลังแบบฝึกหัด การแปลงเลขฐาน 2, 8, 10, 16 และเครื่องคำนวณสำหรับวิศวกรรมคอมพิวเตอร์</p>
            <div className="register-terminal" aria-label="สถานะระบบ">
              <div className="terminal-bar"><span /><span /><span /><small>user_profile.bin</small></div>
              <div className="terminal-lines"><b>$ bin_convert --init</b><span>&gt; DEC: 42 -&gt; BIN: 00101010</span><span>&gt; Status: Ready to register</span><em>● SYSTEM ONLINE</em></div>
            </div>
          </div>
          <div className="register-edition"><span>Handbook Edition</span><strong>2026.1</strong></div>
        </aside>

        <section className="register-panel" aria-labelledby="register-title">
          <div className="register-mobile-label"><span /> BASE NUMBER HANDBOOK</div>
          <h2 id="register-title">สร้างบัญชีผู้ใช้งาน</h2>
          <p className="register-intro">กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้งาน</p>
          <AuthForm mode="register" />
        </section>
      </section>
    </main>
  );
}