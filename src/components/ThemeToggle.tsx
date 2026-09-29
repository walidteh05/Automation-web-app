"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("ams-theme-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("ams-theme-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("ams-theme", nextTheme);
    window.dispatchEvent(new Event("ams-theme-change"));
  }

  const nextThemeLabel = theme === "dark" ? "โหมดสว่าง" : "โหมดมืด";

  return (
    <button
      className="ams-theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`เปลี่ยนเป็น${nextThemeLabel}`}
      aria-pressed={theme === "dark"}
      title={`เปลี่ยนเป็น${nextThemeLabel}`}
    >
      <span className="ams-theme-toggle-icon" aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      <span>{nextThemeLabel}</span>
    </button>
  );
}
