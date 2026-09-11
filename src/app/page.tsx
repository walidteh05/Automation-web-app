import BaseAdder from "../components/BaseAdder";
import AuthControls from "../components/AuthControls";
import HomeAuthGuard from "../components/HomeAuthGuard";
import Practice from "../components/Practice";

export default function Home() {
  return (
    <HomeAuthGuard>
      <>

      <nav className="navbar">
        <div className="logo">
          <div className="logo-icon">∑</div>
          Base Learning
        </div>
        <div className="nav-actions">
          <div className="nav-label">บทเรียนที่ 01 • ระบบเลขฐาน</div>
          <AuthControls />
        </div>
      </nav>

      <header className="hero">
        <div className="hero-content">
          <div className="lesson-tag">บทเรียนออนไลน์</div>
          <h1>การบวกเลขฐาน</h1>
          <p>เรียนรู้วิธีการบวกเลขฐาน 2, 8, 10 และ 16 ตั้งแต่พื้นฐาน กฎการบวก การทดเลข ไปจนถึงการแก้โจทย์แบบทีละขั้นตอน</p>
        </div>
      </header>

      <div className="page">
        <aside className="sidebar">
          <div className="sidebar-card">
            <div className="sidebar-title">เนื้อหาบทเรียน</div>
            <nav className="lesson-menu">
              <a href="#intro" className="active">01 บทนำ</a>
              <a href="#objective">02 จุดประสงค์</a>
              <a href="#base">03 ระบบเลขฐาน</a>
              <a href="#concept">04 หลักการบวก</a>
              <a href="#example">05 ตัวอย่าง</a>
              <a href="#lab">06 ทดลองคำนวณ</a>
              <a href="#practice">07 แบบฝึกหัด</a>
              <a href="#summary">08 สรุป</a>
            </nav>
          </div>
        </aside>

        <main className="content">
          <section className="section" id="intro">
            <div className="section-number">บทที่ 01</div>
            <h2>ทำความรู้จักกับการบวกเลขฐาน</h2>
            <p>ระบบเลขฐานเป็นวิธีการแทนค่าตัวเลข โดยแต่ละระบบจะมีจำนวนสัญลักษณ์ ที่สามารถใช้แทนตัวเลขแตกต่างกัน</p>
            <p>ในการเขียนโปรแกรมและวิศวกรรมคอมพิวเตอร์ เรามักพบระบบเลขฐาน 2, 8, 10 และ 16 ดังนั้นการเข้าใจวิธีการบวกเลขในแต่ละฐาน จึงเป็นพื้นฐานสำคัญ</p>
            <div className="info-box"><strong>💡 แนวคิดสำคัญ</strong> การบวกเลขฐานอื่น ๆ มีหลักการคล้ายกับการบวกเลขฐาน 10 แต่สิ่งที่แตกต่างคือ เมื่อผลบวกมีค่าเท่ากับฐาน จะต้องเกิดการทดไปยังหลักถัดไป</div>
          </section>

          <section className="section" id="objective">
            <div className="section-number">บทที่ 02</div>
            <h2>จุดประสงค์การเรียนรู้</h2>
            <p>หลังจากเรียนบทนี้ ผู้เรียนควรสามารถ อธิบายและคำนวณการบวกเลขฐานได้</p>
            <div className="objective-grid">
              <div className="objective"><div className="objective-icon">📚</div><strong>เข้าใจระบบเลขฐาน</strong><span>อธิบายความแตกต่างของฐาน 2, 8, 10 และ 16 ได้</span></div>
              <div className="objective"><div className="objective-icon">🧮</div><strong>คำนวณการบวก</strong><span>สามารถบวกเลขฐานจากขวาไปซ้ายได้</span></div>
              <div className="objective"><div className="objective-icon">🎯</div><strong>จัดการ Carry</strong><span>สามารถตรวจสอบและทดเลขไปยังหลักถัดไปได้</span></div>
            </div>
          </section>

          <section className="section" id="base">
            <div className="section-number">บทที่ 03</div>
            <h2>ระบบเลขฐานที่ควรรู้</h2>
            <p>ก่อนที่จะเริ่มบวกเลขฐาน เราต้องรู้ก่อนว่าแต่ละฐานสามารถใช้ตัวเลขอะไรได้บ้าง</p>
            <div className="base-grid">
              <div className="base-card"><div className="base-number">2</div><div className="base-name">Binary</div><div className="base-symbol">0, 1</div></div>
              <div className="base-card"><div className="base-number">8</div><div className="base-name">Octal</div><div className="base-symbol">0 - 7</div></div>
              <div className="base-card"><div className="base-number">10</div><div className="base-name">Decimal</div><div className="base-symbol">0 - 9</div></div>
              <div className="base-card"><div className="base-number">16</div><div className="base-name">Hexadecimal</div><div className="base-symbol">0 - 9, A - F</div></div>
            </div>
            <h3>ตัวอย่างค่าของเลขฐาน 16</h3>
            <table className="rule-table"><thead><tr><th>Decimal</th><th>Hexadecimal</th></tr></thead><tbody>
              <tr><td>0</td><td>0</td></tr>
              <tr><td>5</td><td>5</td></tr>
              <tr><td>9</td><td>9</td></tr>
              <tr><td>10</td><td>A</td></tr>
              <tr><td>11</td><td>B</td></tr>
              <tr><td>12</td><td>C</td></tr>
              <tr><td>13</td><td>D</td></tr>
              <tr><td>14</td><td>E</td></tr>
              <tr><td>15</td><td>F</td></tr>
            </tbody></table>
          </section>

          <section className="section" id="concept">
            <div className="section-number">บทที่ 04</div>
            <h2>หลักการบวกเลขฐาน</h2>
            <p>การบวกเลขฐานทำจาก <strong>หลักขวาสุดไปยังหลักซ้ายสุด</strong> เช่นเดียวกับการบวกเลขฐาน 10</p>
            <div className="info-box"><strong>กฎสำคัญ</strong> ถ้าผลบวกในหลักใด มีค่ามากกว่าหรือเท่ากับค่าฐาน จะต้องนำค่า Carry ไปบวกกับหลักถัดไป</div>
            <h3>ตัวอย่างกฎการบวกฐาน 2</h3>
            <table className="rule-table"><thead><tr><th>การบวก</th><th>ผลลัพธ์</th><th>Carry</th></tr></thead><tbody>
              <tr><td>0 + 0</td><td>0</td><td>0</td></tr>
              <tr><td>0 + 1</td><td>1</td><td>0</td></tr>
              <tr><td>1 + 0</td><td>1</td><td>0</td></tr>
              <tr><td>1 + 1</td><td>0</td><td>1</td></tr>
            </tbody></table>
            <div className="warning-box"><strong>⚠️ จำให้ดี</strong>
              <div className="binary-number">1 + 1</div>
              จะไม่ได้คำตอบเป็น 2 เพราะเลข 2 ไม่สามารถเขียนเป็นเลขหนึ่งหลัก ในฐาน 2 ได้ ดังนั้นจึงได้ <div className="binary-number">10₂</div>
            </div>
            <div className="success-box"><strong>จำง่าย ๆ</strong><br/>ฐาน 2 → ครบ 2 แล้วทด<br/>ฐาน 8 → ครบ 8 แล้วทด<br/>ฐาน 10 → ครบ 10 แล้วทด<br/>ฐาน 16 → ครบ 16 แล้วทด</div>
          </section>

          <section className="section" id="example">
            <div className="section-number">บทที่ 05</div>
            <h2>ตัวอย่างการบวกแบบ Step-by-Step</h2>
            <p>มาดูตัวอย่างการบวกเลขฐาน 2 ตั้งแต่การจัดตำแหน่ง ไปจนถึงการตรวจสอบ Carry</p>
            <div className="example-header"><small>ตัวอย่างที่ 1</small><div className="question">1011₂ + 1101₂</div><small>Binary Addition</small></div>
            <div className="step-container">
              <div className="step-card"><div className="step-title"><div className="step-badge">1</div><strong>จัดตำแหน่งตัวเลข</strong></div>
                <div className="step-body"><p>ให้จัดตัวเลขทั้งสองจำนวน ให้อยู่ในแนวเดียวกัน โดยเริ่มจากหลักขวาสุด</p>
                <div className="formula">&nbsp;&nbsp;1011<br/>+ 1101<br/>──────</div>
                <p>ตอนนี้เราจะเริ่มคำนวณ จาก <span className="highlight">ขวา → ซ้าย</span></p></div></div>

              <div className="step-card"><div className="step-title"><div className="step-badge">2</div><strong>บวกหลักขวาสุด</strong></div>
                <div className="step-body"><p>หลักแรกคือ</p><div className="formula">1 + 1 = 10₂</div>
                <p>เนื่องจากฐานเป็น 2 เมื่อได้ค่า 2 เราเขียนเป็น <strong>0</strong> และทด <strong>1</strong> ไปหลักถัดไป</p>
                <div className="success-box">ผลลัพธ์หลักนี้ = <strong>0</strong><br/>Carry = <strong>1</strong></div></div></div>

              <div className="step-card"><div className="step-title"><div className="step-badge">3</div><strong>บวกหลักถัดไป</strong></div>
                <div className="step-body"><p>หลักถัดไปมี Carry จากหลักก่อนหน้า</p><div className="formula">1 + 0 + 1 = 10₂</div>
                <p>เขียน 0 และทด 1 ต่อไป</p>
                <div className="success-box">ผลลัพธ์ = <strong>0</strong><br/>Carry = <strong>1</strong></div></div></div>

              <div className="step-card"><div className="step-title"><div className="step-badge">4</div><strong>บวกหลักที่สาม</strong></div>
                <div className="step-body"><div className="formula">0 + 1 + 1 = 10₂</div><p>เขียน 0 และทด 1 ต่อไป</p></div></div>

              <div className="step-card"><div className="step-title"><div className="step-badge">5</div><strong>บวกหลักสุดท้าย</strong></div>
                <div className="step-body"><div className="formula">1 + 1 + 1 = 11₂</div><p>ผลลัพธ์ของหลักนี้คือ 1 และ Carry อีก 1</p></div></div>

              <div className="step-card"><div className="step-title"><div className="step-badge">6</div><strong>รวมผลลัพธ์</strong></div>
                <div className="step-body"><div className="formula">&nbsp;&nbsp;1011<br/>+ 1101<br/>──────<br/>11000</div>
                <div className="success-box"><strong>✓ คำตอบ</strong><br/><br/>1011₂ + 1101₂ = <strong>11000₂</strong></div></div></div>
            </div>
          </section>

          <section className="section">
            <div className="section-number">Visual Learning</div>
            <h2>มองตำแหน่งของเลขฐาน 2</h2>
            <p>แต่ละตำแหน่งของเลขฐาน 2 มีค่าน้ำหนักเป็นกำลังของ 2</p>
            <div className="binary-board"><div className="binary-row"><div className="binary-cell active">1</div><div className="binary-cell">0</div><div className="binary-cell active">1</div><div className="binary-cell active">1</div></div>
            <div className="binary-row"><div className="binary-cell">2³</div><div className="binary-cell">2²</div><div className="binary-cell">2¹</div><div className="binary-cell">2⁰</div></div>
            <div className="binary-label">8 &nbsp;&nbsp;&nbsp;4 &nbsp;&nbsp;&nbsp;2 &nbsp;&nbsp;&nbsp;1</div></div>
            <div className="info-box"><strong>ตัวอย่าง</strong>1011₂ = (1 × 8) + (0 × 4) + (1 × 2) + (1 × 1) = 11₁₀</div>
          </section>

          <section className="section lab" id="lab">
            <div className="section-number">Interactive Learning</div>
            <h2>ทดลองบวกเลขฐานด้วยตัวเอง</h2>
            <p>ลองกรอกตัวเลขแล้วระบบจะแสดง ผลลัพธ์และขั้นตอนการคำนวณ</p>
            <div style={{ marginTop: 12 }}>
              <BaseAdder />
            </div>
          </section>

          <section className="section practice" id="practice">
            <div className="section-number">แบบฝึกหัด</div>
            <h2>ลองทำด้วยตัวเอง</h2>
            <p>หลังจากศึกษาเนื้อหาแล้ว ลองตอบคำถามต่อไปนี้</p>
            <div style={{ marginTop: 8 }}>
              <Practice />
            </div>
          </section>

          <section className="section" id="summary">
            <div className="section-number">บทสรุป</div>
            <h2>สรุปสิ่งที่เราเรียนรู้</h2>
            <p>ก่อนจบบทเรียน ลองทบทวนแนวคิดสำคัญอีกครั้ง</p>
            <div className="summary-list">
              <div className="summary-item"><div className="check">✓</div><div>ระบบเลขฐานแต่ละชนิด มีจำนวนสัญลักษณ์ที่ใช้แตกต่างกัน</div></div>
              <div className="summary-item"><div className="check">✓</div><div>การบวกเลขฐานทำจาก หลักขวาสุดไปซ้ายสุด</div></div>
              <div className="summary-item"><div className="check">✓</div><div>ถ้าผลบวกมีค่าถึงฐาน จะต้องเกิด Carry</div></div>
              <div className="summary-item"><div className="check">✓</div><div>Carry จากหลักก่อนหน้า ต้องนำมารวมกับหลักถัดไป</div></div>
              <div className="summary-item"><div className="check">✓</div><div>ตรวจสอบคำตอบโดยสามารถ แปลงกลับเป็นฐาน 10 ได้</div></div>
            </div>
            <div className="success-box"><strong>🎉 เก่งมาก!</strong><br/>ตอนนี้คุณเข้าใจพื้นฐานการบวกเลขฐานแล้ว ลองกลับไปทำแบบฝึกหัดอีกครั้ง เพื่อฝึกให้คล่อง</div>
          </section>

        </main>
      </div>

      <footer>
        <div>Base Learning</div>
        <small>สื่อการเรียนรู้เรื่องระบบเลขฐาน</small>
      </footer>
      </>
    </HomeAuthGuard>
  );
}
