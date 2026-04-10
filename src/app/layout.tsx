import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Sans_SC } from "next/font/google";

import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const accentFont = Cormorant_Garamond({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "保险代理人智能助手",
  description: "帮助保险代理人整理客户、记录与每日重点。",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${bodyFont.variable} ${accentFont.variable} bg-background text-foreground antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
