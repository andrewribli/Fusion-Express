"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppTheme = "dark" | "lite";

const STORAGE_KEY = "gracerun-theme";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "lite",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function applyThemeClass(_theme: AppTheme) {
  document.body.classList.remove("dark-mode", "lite-mode");
  document.body.classList.add("lite-mode");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("lite");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next: AppTheme = stored === "lite" ? "lite" : "dark";
    setThemeState(next);
    applyThemeClass(next);
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyThemeClass(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "lite" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
