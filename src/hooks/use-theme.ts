import { useEffect, useState } from "react";

const STORAGE_KEY = "medilink-theme";

export type Theme = "light" | "dark";

/** Lightweight theme controller. Light is the default unless the user has chosen a theme. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme = stored === "dark" || stored === "light" ? stored : "light";
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}

export function resetThemeToLight() {
  window.localStorage.setItem(STORAGE_KEY, "light");
  document.documentElement.classList.remove("dark");
}
