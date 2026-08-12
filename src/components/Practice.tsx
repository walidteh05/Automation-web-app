"use client";

import React, { useState } from "react";

type Q = {
  id: string;
  question: string;
  answer: string;
};

const QUESTIONS: Q[] = [
  { id: "answer1", question: "1010₂ + 0011₂ = ?", answer: "1101" },
  { id: "answer2", question: "111₂ + 10₂ = ?", answer: "1001" },
  { id: "answer3", question: "101₂ + 101₂ = ?", answer: "1010" },
];

export default function Practice() {
  const [values, setValues] = useState<Record<string,string>>({});
  const [results, setResults] = useState<Record<string,string>>({});

  function onChange(id: string, v: string) {
    setValues(prev => ({ ...prev, [id]: v.toUpperCase().trim() }));
  }

  function check(id: string, correct: string) {
    const v = values[id] || "";
    if (v === correct.toUpperCase()) {
      setResults(prev => ({ ...prev, [id]: "✓ ถูกต้อง! เยี่ยมมาก" }));
    } else {
      setResults(prev => ({ ...prev, [id]: "✗ ยังไม่ถูก ลองคำนวณใหม่อีกครั้ง" }));
    }
  }

  return (
    <div>
      {QUESTIONS.map((q, idx) => (
        <div key={q.id} className="question-card">
          <div className="question-number">ข้อที่ {idx + 1}</div>
          <div className="question-text">{q.question}</div>
          <input
            className="answer-input"
            id={q.id}
            placeholder="กรอกคำตอบ"
            value={values[q.id] || ""}
            onChange={(e) => onChange(q.id, e.target.value)}
          />
          <button className="check-btn" onClick={() => check(q.id, q.answer)}>ตรวจคำตอบ</button>
          <div className="practice-result" id={`result-${q.id}`} style={{ marginTop: 8 }}>
            {results[q.id] || ""}
          </div>
        </div>
      ))}
    </div>
  );
}
