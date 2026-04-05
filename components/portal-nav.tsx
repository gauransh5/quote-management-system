"use client";

/**
 * Sidebar navigation for the portal.
 * Shows nav links and the current user info.
 * Admin-only links (Products, Templates, Users, Settings) are hidden from SALES users.
 *
 * Accepts an optional `theme` prop from the portal layout (server component).
 * When present (premium tenants), the sidebar uses the brand's primary color
 * and the active nav link uses the secondary/accent color.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@/generated/prisma/client";
import { cn, readableFontColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavTheme {
  sidebarBg?: string;       // primary color → sidebar background
  sidebarFg?: string;       // font color on sidebar (auto-computed if absent)
  secondaryColor?: string;  // accent → active nav item highlight
  pageBg?: string;          // not used in nav but passed for completeness
}

interface PortalNavProps {
  user: {
    name: string;
    role: Role;
    title: string | null;
  };
  companyName?: string;
  theme?: NavTheme;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quotes", label: "Quotes" },
  { href: "/profile", label: "Profile" },
];

const adminItems = [
  { href: "/products", label: "Products" },
  { href: "/templates", label: "Templates" },
  { href: "/users", label: "Users" },
  { href: "/settings", label: "Settings" },
];

export default function PortalNav({
  user,
  companyName = "Quote Portal",
  theme = {},
}: PortalNavProps) {
  const pathname = usePathname();
  const allItems = user.role === "ADMIN" ? [...navItems, ...adminItems] : navItems;

  const isThemed = Boolean(theme.sidebarBg);
  // Compute readable text color for the sidebar background
  const fg = theme.sidebarFg || (theme.sidebarBg ? readableFontColor(theme.sidebarBg) : undefined);
  const fgMuted = fg === "#ffffff" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
  const hoverBg = fg === "#ffffff" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

  return (
    <aside
      className={cn("w-56 border-r flex flex-col", isThemed ? "" : "bg-white")}
      style={theme.sidebarBg ? { backgroundColor: theme.sidebarBg, color: fg } : undefined}
    >
      <Link
        href="/quotes"
        className="block p-4 border-b transition-colors rounded-t-lg"
        style={isThemed
          ? { borderColor: fgMuted }
          : undefined}
      >
        <h2
          className="font-bold text-lg"
          style={isThemed ? { color: fg } : undefined}
        >
          {companyName}
        </h2>
        <p
          className="text-xs"
          style={{ color: fgMuted }}
        >
          Quote Portal
        </p>
      </Link>

      <nav className="flex-1 p-2 space-y-1">
        {allItems.map((item) => {
          const isActive = pathname === item.href;
          if (isThemed) {
            // Themed: active uses secondaryColor highlight, inactive uses transparent with hover
            return (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md text-sm font-medium transition-colors"
                style={
                  isActive
                    ? {
                        backgroundColor: theme.secondaryColor || hoverBg,
                        color: theme.secondaryColor
                          ? readableFontColor(theme.secondaryColor)
                          : fg,
                      }
                    : { color: fg }
                }
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                }}
              >
                {item.label}
              </Link>
            );
          }
          // Default (unthemed) appearance
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-black"
                  : "text-gray-600 hover:bg-gray-50 hover:text-black"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div
        className="p-4 border-t"
        style={isThemed ? { borderColor: fgMuted } : undefined}
      >
        <p
          className="text-sm font-medium truncate"
          style={isThemed ? { color: fg } : undefined}
        >
          {user.name}
        </p>
        <p className="text-xs" style={{ color: fgMuted }}>
          {user.title ?? user.role}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-xs"
          style={isThemed ? { color: fgMuted } : { color: undefined }}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
