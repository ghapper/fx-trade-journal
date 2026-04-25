// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "FX Trade Journal",
  description: "FXトレード記録・振り返りアプリ",
  manifest: "/manifest.json",
  themeColor: "#0a0a0f",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#1a1a24",
              color: "#e8e8f0",
              border: "1px solid #2a2a3e",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
