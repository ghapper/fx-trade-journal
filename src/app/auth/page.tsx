"use client";
// src/app/auth/page.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error("メールアドレスとパスワードを入力してください");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("ログインしました");
        router.push("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("登録しました！メールを確認してください");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-primary">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-widest">
            FX<span className="text-accent-cyan">.</span>JOURNAL
          </h1>
          <p className="text-text-muted text-sm mt-1">トレード記録・振り返りアプリ</p>
        </div>

        <div className="card p-6 space-y-4">
          {/* Tab */}
          <div className="grid grid-cols-2 gap-1 bg-bg-tertiary rounded p-1">
            <button
              onClick={() => setMode("login")}
              className={`py-1.5 rounded text-sm transition-colors ${
                mode === "login"
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-muted"
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`py-1.5 rounded text-sm transition-colors ${
                mode === "signup"
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-muted"
              }`}
            >
              新規登録
            </button>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="label">メールアドレス</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div>
              <label className="label">パスワード</label>
              <input
                type="password"
                className="input-field"
                placeholder="8文字以上"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-3 text-base font-bold"
          >
            {loading ? "処理中..." : mode === "login" ? "ログイン" : "登録する"}
          </button>
        </div>
      </div>
    </div>
  );
}
