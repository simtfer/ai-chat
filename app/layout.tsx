import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nebula · AI 群聊",
  description: "和一群有性格的 AI 一起聊天，自定节奏，随意插话。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="relative min-h-dvh bg-canvas text-ink">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="aurora aurora-a" />
          <div className="aurora aurora-b" />
          <div className="aurora aurora-c" />
          <div className="absolute inset-0 bg-grid opacity-70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(139,92,246,0.16),transparent_55%)]" />
        </div>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          gap={10}
          toastOptions={{
            style: {
              background: "rgba(18, 21, 32, 0.94)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#e9ebf5",
              backdropFilter: "blur(18px)",
              borderRadius: "14px",
              boxShadow: "0 20px 50px -20px rgba(0,0,0,0.9)",
            },
          }}
        />
      </body>
    </html>
  );
}
