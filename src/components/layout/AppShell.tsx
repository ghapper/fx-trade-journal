"use client";
// src/components/layout/AppShell.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/store";
import {
  HomeIcon,
  ListIcon,
  PlusCircleIcon,
  BarChart2Icon,
  SettingsIcon,
  UploadIcon,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "ホーム", icon: HomeIcon },
  { href: "/trades", label: "一覧", icon: ListIcon },
  { href: "/quick-input", label: "入力", icon: PlusCircleIcon },
  { href: "/analysis", label: "分析", icon: BarChart2Icon },
  { href: "/import", label: "取込", icon: UploadIcon },
  { href: "/settings", label: "設定", icon: SettingsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const loadAll = useAppStore((s) => s.loadAll);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-primary">
      {/* Top header */}
      <header className="flex-shrink-0 border-b border-border-subtle bg-bg-secondary px-4 py-2 flex items-center justify-between">
        <span className="font-display text-sm font-bold text-text-primary tracking-widest">
          FX<span className="text-accent-cyan">.</span>JOURNAL
        </span>
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors",
                pathname === href
                  ? "bg-accent-blue/20 text-accent-blue"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex-shrink-0 border-t border-border-subtle bg-bg-secondary">
        <div className="grid grid-cols-6">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors",
                pathname === href
                  ? "text-accent-blue"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
