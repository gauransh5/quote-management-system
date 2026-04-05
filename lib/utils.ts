import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the relative luminance of a hex color (0–1).
 * Uses the WCAG 2.1 formula for perceived brightness.
 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Returns "#ffffff" or "#1a1a1a" depending on which is more readable against
 * the given background color hex (WCAG contrast ratio decision).
 */
export function readableFontColor(bgHex: string): "#ffffff" | "#1a1a1a" {
  try {
    const lum = relativeLuminance(bgHex);
    // WCAG: contrast ratio ≥ 4.5:1. White on dark bg, dark on light bg.
    return lum < 0.35 ? "#ffffff" : "#1a1a1a";
  } catch {
    return "#1a1a1a";
  }
}

/**
 * Converts an [R, G, B] array from color-thief to a hex string.
 */
export function rgbToHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Preset logo size tokens → pixel heights. */
const LOGO_PRESET_PX: Record<string, number> = { sm: 24, md: 40, lg: 64, xl: 96 };

/**
 * Resolves a logoSize value (preset token OR numeric string) to a pixel height.
 * Examples: "md" → 40, "72" → 72, "custom" → fallback 40.
 */
export function resolveLogoHeight(logoSize: string): number {
  if (logoSize in LOGO_PRESET_PX) return LOGO_PRESET_PX[logoSize];
  const parsed = parseInt(logoSize, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
}
