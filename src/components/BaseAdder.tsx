"use client";

import React, { useState } from "react";

function digitValue(ch: string) {
  if (!ch) return NaN;
  if (/^[0-9]$/.test(ch)) return ch.charCodeAt(0) - 48;
  const c = ch.toUpperCase();
  if (c >= "A" && c <= "F") return c.charCodeAt(0) - 55;
  return NaN;
}

function digitChar(val: number) {
  if (val < 10) return String(val);
  return String.fromCharCode(55 + val);
}

type Step = {
  position: number;
  index: number;
  a: string;
  b: string;
  vA: number;
  vB: number;
  beforeCarry: number;
  sum: number;
  digit: number;
  carryAfter: number;
};

function computeDigitSteps(a: string, b: string, base: number) {
  const A = a.trim().toUpperCase();
  const B = b.trim().toUpperCase();
  if (!A || !B) throw new Error("empty");

  const len = Math.max(A.length, B.length);
  const aP = A.padStart(len, "0");
  const bP = B.padStart(len, "0");

  const steps: Step[] = [];
  let carry = 0;
  const resultDigits: string[] = [];

  for (let i = len - 1; i >= 0; i--) {
    const chA = aP[i];
    const chB = bP[i];
    const vA = digitValue(chA);
    const vB = digitValue(chB);
    if (isNaN(vA) || isNaN(vB) || vA >= base || vB >= base) {
      throw new Error("invalid digit for base");
    }
    const beforeCarry = carry;
    const sum = vA + vB + carry;
    const digit = sum % base;
    carry = Math.floor(sum / base);

    steps.push({
      position: len - i,
      index: i,
      a: chA,
      b: chB,
      vA,
      vB,
      beforeCarry,
      sum,
      digit,
      carryAfter: carry,
    });

    resultDigits.push(digitChar(digit));
  }

  if (carry > 0) resultDigits.push(digitChar(carry));

  const result = resultDigits.reverse().join("");
  return { steps: steps.reverse(), result };
}

export default function BaseAdder() {
  const [num1, setNum1] = useState("1011");
  const [num2, setNum2] = useState("1101");
  const [base, setBase] = useState(2);
  const [stepsHtml, setStepsHtml] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [dec1, setDec1] = useState<number | null>(null);
  const [dec2, setDec2] = useState<number | null>(null);

  function onCalculate() {
    if (!num1 || !num2) {
      alert("กรุณากรอกตัวเลขทั้งสองช่อง");
      return;
    }

    try {
      const d1 = parseInt(num1, base);
      const d2 = parseInt(num2, base);
      if (isNaN(d1) || isNaN(d2)) throw new Error();

      setDec1(d1);
      setDec2(d2);

      const { steps, result } = computeDigitSteps(num1, num2, base);
      setResult(result + "₍" + base + "₎");

      // Build simple HTML-like string for steps (rendered as JSX below)
      setStepsHtml(JSON.stringify(steps));
    } catch (err) {
      alert("กรุณาตรวจสอบว่าตัวเลขถูกต้องตามฐานที่เลือก");
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 180px", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>ตัวเลขตัวที่ 1</label>
          <input value={num1} onChange={(e) => setNum1(e.target.value.toUpperCase())} style={{ width: "100%", padding: 10 }} />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>ตัวเลขตัวที่ 2</label>
          <input value={num2} onChange={(e) => setNum2(e.target.value.toUpperCase())} style={{ width: "100%", padding: 10 }} />
        </div>
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>เลือกฐาน</label>
          <select value={base} onChange={(e) => setBase(parseInt(e.target.value, 10))} style={{ width: "100%", padding: 10 }}>
            <option value={2}>ฐาน 2</option>
            <option value={8}>ฐาน 8</option>
            <option value={10}>ฐาน 10</option>
            <option value={16}>ฐาน 16</option>
          </select>
        </div>
      </div>

      <button onClick={onCalculate} style={{ marginTop: 12, padding: 12, width: "100%", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8 }}>คำนวณและแสดงขั้นตอน</button>

      {result && (
        <div style={{ marginTop: 18 }}>
          <div style={{ background: "#0f172a", color: "white", padding: 12, borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontFamily: "monospace" }}>{num1} + {num2}</div>
            <div style={{ color: "#60a5fa", fontWeight: 800, marginTop: 8 }}>{result}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            {/* Render steps from stepsHtml JSON */}
            {stepsHtml && (() => {
              try {
                const steps: Step[] = JSON.parse(stepsHtml);
                return (
                  <div>
                    <div style={{ marginTop: 12, fontWeight: 700 }}>ขั้นตอนทีละหลัก (ขวา → ซ้าย)</div>
                    {steps.map((s, idx) => (
                      <div key={idx} style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, padding: 12, marginTop: 8 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>หลักที่ {idx + 1} (ตำแหน่งจากขวา)</div>
                        <div style={{ fontFamily: "monospace" }}>ค่าที่เข้ามา: {s.a} ({s.vA}) + {s.b} ({s.vB}){s.beforeCarry ? ` + Carry(${s.beforeCarry})` : ''}</div>
                        <div style={{ marginTop: 8, background: "#fff", padding: 8, borderRadius: 6 }}>
                          {s.vA} + {s.vB}{s.beforeCarry ? ' + ' + s.beforeCarry : ''} = {s.sum}<br />
                          เขียนหลักนี้เป็น <strong>{digitChar(s.digit)}</strong> และ {s.carryAfter ? `ทด ${s.carryAfter}` : 'ไม่มีการทด'}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              } catch (e) {
                return null;
              }
            })()}

            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>ตรวจสอบโดยแปลงเป็นฐาน 10</div>
              <div>{num1}<sub>{base}</sub> = {dec1}<sub>10</sub></div>
              <div>{num2}<sub>{base}</sub> = {dec2}<sub>10</sub></div>
              <div style={{ background: '#f8fafc', padding: 8, borderRadius: 6, marginTop: 8 }}>{dec1} + {dec2} = { (dec1 ?? 0) + (dec2 ?? 0) }</div>
              <div style={{ marginTop: 8 }}>แปลงกลับเป็นฐาน {base}: <strong>{result}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
