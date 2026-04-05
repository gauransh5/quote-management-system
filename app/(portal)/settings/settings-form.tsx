"use client";

/**
 * Settings form — admin only.
 *
 * Three sections:
 * - Basic (all tiers): company name, logo URL, primary color, tax labels, locale, currency
 * - Theme Colors (premium): color-thief palette extraction + fine-tune pickers for
 *   secondary color, font color, and background color
 * - Premium Branding (premium): tagline, phone, website, footer, email sender
 *
 * Color-thief workflow:
 *   1. Admin enters a logo URL
 *   2. Clicks "Extract Palette from Logo" — loads image into a canvas, samples 5 dominant colors
 *   3. Five swatches appear; clicking a swatch assigns it to a color field
 *   4. Each color field also has an inline color picker + hex input for manual fine-tuning
 *
 * Follows the server→client pattern: server loads current settings, passes as props.
 */
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readableFontColor, rgbToHex, resolveLogoHeight } from "@/lib/utils";
import QuotePreview from "./quote-preview";

// Curated locale list — Intl has no enumerate-all API, so we maintain this list
// and canonicalize + label via Intl.DisplayNames.
const _LOCALE_SEEDS = [
  "en-CA", "en-US", "en-GB", "en-AU", "en-NZ",
  "fr-CA", "fr-FR",
  "de-DE", "de-AT", "de-CH",
  "es-ES", "es-MX", "es-AR",
  "pt-BR", "pt-PT",
  "nl-NL", "it-IT", "pl-PL",
  "ja-JP", "zh-CN", "zh-TW",
  "ko-KR", "ar-SA", "hi-IN",
];

const _langNames = new Intl.DisplayNames(["en"], { type: "language" });
const LOCALE_OPTIONS = Intl.getCanonicalLocales(_LOCALE_SEEDS).map((locale) => ({
  value: locale,
  label: _langNames.of(locale) ?? locale,
}));

// Full ISO 4217 currency list from the runtime — no hardcoding needed.
const _currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const CURRENCY_OPTIONS = Intl.supportedValuesOf("currency")
  .map((code) => ({ value: code, label: `${code} — ${_currencyNames.of(code) ?? code}` }))
  .sort((a, b) => a.label.localeCompare(b.label));

const LOGO_SIZE_PRESETS = [
  { value: "sm", label: "Small (24px)" },
  { value: "md", label: "Medium (40px)" },
  { value: "lg", label: "Large (64px)" },
  { value: "xl", label: "X-Large (96px)" },
  { value: "custom", label: "Custom…" },
];

interface Settings {
  companyName: string;
  companyTagline: string;
  companyPhone: string;
  companyWebsite: string;
  logoUrl: string;
  logoSize: string;       // preset token ("sm"|"md"|"lg"|"xl") or numeric string ("72")
  showCompanyName: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontColor: string;
  navbarColor: string;
  backgroundColor: string;
  emailFromName: string;
  emailFromAddress: string;
  emailAdminAddress: string;
  tax1Label: string;
  tax2Label: string;
  locale: string;
  currency: string;
  premiumBranding: boolean;
  footerText: string;
}

// A single color-picker row: color swatch + hex text input
function ColorField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-10 h-9 rounded border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-32"
          disabled={disabled}
          maxLength={7}
        />
        {/* Live preview chip */}
        {value && /^#[0-9a-fA-F]{6}$/.test(value) && (
          <span
            className="px-3 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: value,
              color: readableFontColor(value),
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            Aa
          </span>
        )}
      </div>
    </div>
  );
}

export default function SettingsForm({
  initialSettings,
}: {
  initialSettings: Settings;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);


  // Color palette extraction state
  const [palette, setPalette] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  // Which field a palette swatch click will target
  const [swatchTarget, setSwatchTarget] = useState<keyof Settings>("primaryColor");

  function update(field: keyof Settings, value: string | boolean | null) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  /**
   * Loads the logo URL into a canvas and uses color-thief-browser to extract
   * the dominant color + a 5-color palette. CORS failures are surfaced to the user.
   */
  const extractPalette = useCallback(async () => {
    if (!settings.logoUrl) return;
    setExtractError("");
    setExtracting(true);
    setPalette([]);

    try {
      // Dynamic import — color-thief-browser is client-only (uses Canvas)
      const ColorThief = (await import("color-thief-browser")).default;
      const thief = new ColorThief();

      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load image — check the URL and ensure it supports CORS."));
        img.src = settings.logoUrl;
      });

      // Extract palette of 6 colors (dominant + 5 supporting)
      const colors = thief.getPalette(img, 6) as [number, number, number][];
      const hexPalette = colors.map(rgbToHex);
      setPalette(hexPalette);

      // Auto-assign: dominant → primary, second → secondary, compute font color
      const dominant = hexPalette[0];
      const accent = hexPalette[1] ?? hexPalette[0];
      setSettings((prev) => ({
        ...prev,
        primaryColor: dominant,
        secondaryColor: accent,
        fontColor: readableFontColor(dominant),
        // Suggest lightest color as background (sort by luminance)
        backgroundColor: [...hexPalette].sort((a, b) => {
          const lum = (h: string) => {
            const clean = h.replace("#", "");
            const r = parseInt(clean.slice(0, 2), 16) / 255;
            const g = parseInt(clean.slice(2, 4), 16) / 255;
            const b = parseInt(clean.slice(4, 6), 16) / 255;
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          return lum(b) - lum(a);
        })[0],
      }));
      setSaved(false);
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Failed to extract palette.");
    } finally {
      setExtracting(false);
    }
  }, [settings.logoUrl]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: settings.companyName,
        companyTagline: settings.companyTagline || null,
        companyPhone: settings.companyPhone || null,
        companyWebsite: settings.companyWebsite || null,
        logoUrl: settings.logoUrl || null,
        logoSize: settings.logoSize,
        showCompanyName: settings.showCompanyName,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor || null,
        fontColor: settings.fontColor || null,
        navbarColor: settings.navbarColor || null,
        backgroundColor: settings.backgroundColor || null,
        emailFromName: settings.emailFromName || null,
        emailFromAddress: settings.emailFromAddress || null,
        emailAdminAddress: settings.emailAdminAddress || null,
        tax1Label: settings.tax1Label,
        tax2Label: settings.tax2Label,
        locale: settings.locale,
        currency: settings.currency,
        premiumBranding: settings.premiumBranding,
        footerText: settings.footerText || null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      let errorMsg = "Failed to save settings";
      try {
        const data = await res.json();
        errorMsg = data.error || errorMsg;
      } catch {
        // server returned empty or non-JSON body
      }
      setError(errorMsg);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  const isPremium = settings.premiumBranding;

  return (
    <form onSubmit={handleSave} className="mt-6 space-y-6 max-w-2xl">
      {/* Basic settings — all tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              value={settings.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={settings.logoUrl}
              onChange={(e) => update("logoUrl", e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            {settings.logoUrl && (
              <div className="mt-2 p-3 border rounded-md bg-gray-50 space-y-3">
                <p className="text-xs text-muted-foreground">Preview:</p>
                <img
                  src={settings.logoUrl}
                  alt="Logo preview"
                  style={{ height: resolveLogoHeight(settings.logoSize) }}
                  className="object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />

                {/* Size controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Label htmlFor="logoSize" className="text-xs shrink-0">Logo size</Label>
                  <select
                    id="logoSize"
                    value={LOGO_SIZE_PRESETS.some(p => p.value === settings.logoSize) ? settings.logoSize : "custom"}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        // Keep current numeric size or default to 40
                        const current = resolveLogoHeight(settings.logoSize);
                        update("logoSize", String(current));
                      } else {
                        update("logoSize", e.target.value);
                      }
                    }}
                    className="h-7 rounded border px-2 text-xs"
                  >
                    {LOGO_SIZE_PRESETS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {/* Custom px input — shown when no preset matches */}
                  {!["sm","md","lg","xl"].includes(settings.logoSize) && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={16}
                        max={300}
                        value={settings.logoSize}
                        onChange={(e) => update("logoSize", e.target.value)}
                        className="h-7 w-16 rounded border px-2 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">px</span>
                    </div>
                  )}
                </div>

                {/* Show company name alongside logo */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showCompanyName}
                    onChange={(e) => update("showCompanyName", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs">Also show company name alongside logo</span>
                </label>
              </div>
            )}
          </div>
          <ColorField
            id="primaryColor"
            label="Primary Color"
            value={settings.primaryColor}
            onChange={(v) => update("primaryColor", v)}
            hint="Used for the portal sidebar and quote page header background."
          />
        </CardContent>
      </Card>

      {/* Tax & Locale */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tax & Locale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax1Label">Tax 1 Label</Label>
              <Input
                id="tax1Label"
                value={settings.tax1Label}
                onChange={(e) => update("tax1Label", e.target.value)}
                placeholder="GST"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax2Label">Tax 2 Label</Label>
              <Input
                id="tax2Label"
                value={settings.tax2Label}
                onChange={(e) => update("tax2Label", e.target.value)}
                placeholder="PST"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Select
                value={settings.locale}
                onValueChange={(v) => update("locale", v)}
              >
                <SelectTrigger id="locale">
                  <SelectValue placeholder="Select locale" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(v) => update("currency", v)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Branding — theme colors + company info */}
      <Card className={!isPremium ? "opacity-60" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Premium Branding</CardTitle>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-muted-foreground">{isPremium ? "Enabled" : "Disabled"}</span>
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => update("premiumBranding", e.target.checked)}
                className="w-4 h-4"
              />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            Full brand palette, tagline, contact info, and footer text on the public quote page.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Theme Colors */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Theme Colors</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!isPremium || !settings.logoUrl || extracting}
                  onClick={extractPalette}
                >
                  {extracting ? "Extracting…" : "Extract Palette from Logo"}
                </Button>
                {!settings.logoUrl && (
                  <span className="text-xs text-muted-foreground">Set a logo URL above first.</span>
                )}
              </div>

              {palette.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Click a swatch to assign it to:</span>
                    <select
                      className="h-7 rounded border px-2 text-xs"
                      value={swatchTarget as string}
                      onChange={(e) => setSwatchTarget(e.target.value as keyof Settings)}
                    >
                      <option value="primaryColor">Primary Color</option>
                      <option value="secondaryColor">Secondary Color</option>
                      <option value="fontColor">Font Color</option>
                      <option value="navbarColor">Navbar Background</option>
                      <option value="backgroundColor">Body Background</option>
                    </select>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {palette.map((color, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={!isPremium}
                        onClick={() => update(swatchTarget, color)}
                        title={`Assign ${color} to ${String(swatchTarget)}`}
                        className="w-10 h-10 rounded-md border-2 border-transparent hover:border-black/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Colors were auto-assigned. Use the pickers below to fine-tune.
                  </p>
                </div>
              )}

              {extractError && <p className="text-xs text-red-600">{extractError}</p>}
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!isPremium}
                  onClick={() => {
                    setSettings((prev) => ({
                      ...prev,
                      primaryColor: "#ffffff",
                      secondaryColor: "",
                      fontColor: "",
                      navbarColor: "",
                      backgroundColor: "",
                    }));
                    setPalette([]);
                    setSaved(false);
                  }}
                  className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset colors to defaults
                </button>
              </div>
              <ColorField
                id="secondaryColor"
                label="Secondary / Accent Color"
                value={settings.secondaryColor}
                onChange={(v) => update("secondaryColor", v)}
                disabled={!isPremium}
                hint="Used for action buttons (Accept, Save), active nav highlights."
              />
              <ColorField
                id="fontColor"
                label="Font Color on Brand Surfaces"
                value={settings.fontColor}
                onChange={(v) => update("fontColor", v)}
                disabled={!isPremium}
                hint="Text color inside the portal sidebar and quote page header. Leave blank to auto-compute."
              />
              <ColorField
                id="navbarColor"
                label="Navbar / Header Background"
                value={settings.navbarColor}
                onChange={(v) => update("navbarColor", v)}
                disabled={!isPremium}
                hint="Background of the header bar on the public quote page. Leave blank to use Primary Color."
              />
              <ColorField
                id="backgroundColor"
                label="Body Background"
                value={settings.backgroundColor}
                onChange={(v) => update("backgroundColor", v)}
                disabled={!isPremium}
                hint="Page body background behind the quote content. Leave blank for white."
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Company info */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Company Info</p>
            <div className="space-y-2">
              <Label htmlFor="companyTagline">Tagline</Label>
              <Input
                id="companyTagline"
                value={settings.companyTagline}
                onChange={(e) => update("companyTagline", e.target.value)}
                placeholder="Professional Security Services"
                disabled={!isPremium}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Phone</Label>
                <Input
                  id="companyPhone"
                  value={settings.companyPhone}
                  onChange={(e) => update("companyPhone", e.target.value)}
                  placeholder="+1 555-000-0000"
                  disabled={!isPremium}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <Input
                  id="companyWebsite"
                  value={settings.companyWebsite}
                  onChange={(e) => update("companyWebsite", e.target.value)}
                  placeholder="yourcompany.com"
                  disabled={!isPremium}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerText">Footer Text</Label>
              <Input
                id="footerText"
                value={settings.footerText}
                onChange={(e) => update("footerText", e.target.value)}
                placeholder="Custom footer text for printed quotes"
                disabled={!isPremium}
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Email Notifications — available to all tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Notifications</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure where system emails are sent and how they appear to recipients.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailAdminAddress">Admin Notification Email</Label>
            <Input
              id="emailAdminAddress"
              type="email"
              value={settings.emailAdminAddress}
              onChange={(e) => update("emailAdminAddress", e.target.value)}
              placeholder="admin@yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Receives alerts when a customer accepts a quote or requests changes.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emailFromName">Sender Name</Label>
              <Input
                id="emailFromName"
                value={settings.emailFromName}
                onChange={(e) => update("emailFromName", e.target.value)}
                placeholder="Your Company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailFromAddress">Sender Address</Label>
              <Input
                id="emailFromAddress"
                type="email"
                value={settings.emailFromAddress}
                onChange={(e) => update("emailFromAddress", e.target.value)}
                placeholder="noreply@yourcompany.com"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The From: name and address on outgoing emails. Requires SPF/DKIM DNS records for custom domains.
          </p>
        </CardContent>
      </Card>

      {/* Save + Preview */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Settings saved successfully.</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPreview(true)}
        >
          Preview Quote
        </Button>
      </div>

      {showPreview && (
        <QuotePreview
          settings={settings}
          onClose={() => setShowPreview(false)}
        />
      )}
    </form>
  );
}
