import { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { TopNav } from "@/components/layout/top-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(184,137,74,0.12),_transparent_22%),linear-gradient(180deg,_#F7F4EE_0%,_#EEF3F8_48%,_#F8FBFF_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_20%_20%,_rgba(30,58,138,0.2),_transparent_34%),radial-gradient(circle_at_80%_10%,_rgba(184,137,74,0.16),_transparent_26%)]" />
      <TopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 pb-28 pt-20 md:pt-24 lg:px-8 lg:pb-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
