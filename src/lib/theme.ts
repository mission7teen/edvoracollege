export const PRESET_ACCENTS: { name: string; hex: string }[] = [
  { name: "Indigo", hex: "#3949e0" },
  { name: "Royal Blue", hex: "#1e4fd8" },
  { name: "Emerald", hex: "#10a37f" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Amber", hex: "#d97706" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Slate", hex: "#475569" },
];

export const DEFAULT_ACCENT = PRESET_ACCENTS[0].hex;

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [57, 73, 224];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB hex -> OKLCH triple (L 0..1, C, H degrees) */
export function hexToOklch(hex: string): [number, number, number] {
  const [r8, g8, b8] = hexToRgb(hex);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = lin(r8), g = lin(g8), b = lin(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}

const ok = (L: number, C: number, H: number) =>
  `oklch(${clamp(L).toFixed(3)} ${Math.max(0, C).toFixed(3)} ${H.toFixed(1)})`;

/** Applies the accent colour to the live document for both light and dark mode. */
export function applyAccent(hex: string, isDark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const [L, C, H] = hexToOklch(hex || DEFAULT_ACCENT);
  const base = isDark ? clamp(Math.max(L, 0.6), 0.45, 0.78) : clamp(Math.min(L, 0.55), 0.35, 0.62);
  const chroma = Math.min(C, 0.26);

  const vars: Record<string, string> = {
    "--primary": ok(base, chroma, H),
    "--primary-foreground": base > 0.68 ? ok(0.16, 0.03, H) : ok(0.99, 0.005, H),
    "--primary-glow": ok(clamp(base + 0.14, 0, 0.9), chroma * 0.95, H),
    "--primary-deep": ok(clamp(base - 0.16, 0.15, 1), chroma * 0.85, H),
    "--ring": ok(clamp(base + 0.06, 0, 0.9), chroma * 0.9, H),
    "--chart-1": ok(base, chroma, H),
    "--chart-4": ok(clamp(base + 0.14, 0, 0.9), chroma * 0.95, H),
    "--sidebar-primary": ok(base, chroma, H),
    "--sidebar-ring": ok(clamp(base + 0.06, 0, 0.9), chroma * 0.6, H),
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", hex);
}
