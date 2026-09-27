"use client";

import { useCallback, useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

/**
 * Réglage de thème de l'espace client (Clair / Sombre / Système).
 *
 * Préférence de confort, pas un consentement : stockée en `localStorage`
 * (jamais un cookie), lue et écrite entourée de `try/catch` (navigation
 * privée, quota dépassé). Les pages publiques et marketing restent
 * toujours claires : au démontage (sortie de la coque de l'application),
 * la classe `.dark` est retirée de `<html>`.
 *
 * Le script inline de `app/(app)/layout.tsx` applique déjà la classe au
 * premier rendu pour éviter le flash ; ce composant prend le relais
 * ensuite et réagit aux changements système en mode "Système".
 */

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "decelio-theme";

function readStoredTheme(): Theme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // Stockage indisponible : on retombe sur "système", sans bloquer l'interface.
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Clair", Icon: Sun },
  { value: "dark", label: "Sombre", Icon: Moon },
  { value: "system", label: "Système", Icon: Monitor },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyTheme(stored);
    setReady(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readStoredTheme() === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onSystemChange);

    return () => {
      media.removeEventListener("change", onSystemChange);
      // Les pages publiques restent toujours claires : on nettoie en quittant l'application.
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    };
  }, []);

  const choose = useCallback((next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Préférence de confort seulement : si le stockage refuse, le choix ne survit pas au rechargement.
    }
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Thème de l'interface"
      className="flex items-center gap-0.5 rounded-sm border border-line bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={ready && theme === value}
          title={label}
          onClick={() => choose(value)}
          className={`flex h-8 w-8 items-center justify-center rounded-xs text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink ${
            ready && theme === value ? "bg-surface-2 text-ink" : ""
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
