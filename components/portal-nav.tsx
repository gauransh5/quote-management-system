"use client";

/**
 * Sidebar navigation for the portal.
 * Shows nav links and the current user info.
 * Admin-only links (Users) are hidden from SALES users.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PortalNavProps {
  user: {
    name: string;
    role: Role;
    title: string | null;
  };
}

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/quotes", label: "Quotes" },
  { href: "/profile", label: "Profile" },
];

const adminItems = [{ href: "/users", label: "Users" }];

export default function PortalNav({ user }: PortalNavProps) {
  const pathname = usePathname();

  const allItems =
    user.role === "ADMIN" ? [...navItems, ...adminItems] : navItems;

  return (
    <aside className="w-56 border-r bg-white flex flex-col">
      <Link
        href="/quotes"
        className="block p-4 border-b hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <h2 className="font-bold text-lg">Boss Security</h2>
        <p className="text-xs text-muted-foreground">Quote Portal</p>
      </Link>

      <nav className="flex-1 p-2 space-y-1">
        {allItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-gray-100 text-black"
                : "text-gray-600 hover:bg-gray-50 hover:text-black"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <p className="text-sm font-medium truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground">
          {user.title ?? user.role}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-xs text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
