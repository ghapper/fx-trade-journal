"use client";
// src/components/layout/AppShell.tsx
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import { supabase } from "@/lib/supabase";
import {
  HomeIcon,
  ListIcon,
  PlusCircleIcon,
  BarChart2Icon,
  SettingsIcon,
  UploadIcon,
  LogOutIcon,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

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
  const router = useRouter();
  const loadAll = useAppStore((s) => s.loadAll);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // 認証状態を確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserEmail(session.user.email ?? null);
        loadAll();
      } else if (pathname !== "/auth") {
        router.push("/auth");
      }
      setAuthChecked(true);
    });

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUserEmail(session.user.email ?? null);
          if (pathname === "/auth") {
            router.push("/");
          }
        } else {
          setUserEmail(null);
          router.push("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("ログアウトしました");
    router.push("/auth");
  };

  // 認証チェック中は何も表示しない
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary text-text-muted text-sm">
        読み込み中...
      </div>
    );
  }

  // 認証画面はナビなしで表示
  if (pathname === "/auth") {
    return <>{children}</>;
  }

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
        {/* User info & logout */}
        <div className="flex items-center gap-2">
          {userEmail && (
            <span className="text-xs text-text-muted hidden md:block">{userEmail}</span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-text-muted hover:text-loss text-xs transition-colors"
          >
            <LogOutIcon size={14} />
            <span className="hidden md:block">ログアウト</span>
          </button>
        </div>
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
