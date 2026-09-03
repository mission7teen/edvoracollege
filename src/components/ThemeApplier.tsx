import { useEffect } from "react";
import { useData } from "@/lib/store";
import { applyAccent } from "@/lib/theme";

/** Keeps the document in sync with the saved dark/light mode and accent colour. */
export function ThemeApplier() {
  const theme = useData((s) => s.theme);
  const accent = useData((s) => s.accent);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const dark = theme === "dark";
    document.documentElement.classList.toggle("dark", dark);
    applyAccent(accent, dark);
  }, [theme, accent]);

  return null;
}
