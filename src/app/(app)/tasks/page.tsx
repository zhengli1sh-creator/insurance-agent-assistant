"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LiveTaskBoard } from "@/components/tasks/live-task-board";

export default function TasksPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 md:gap-3">
      <Card className="glass-panel advisor-glass-surface-strong flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px]">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          {/* 页面顶部标题栏 */}
          <div className="advisor-panel-header-surface shrink-0 px-4 py-2.5 sm:px-5 md:px-6">
            <div className="flex flex-col gap-2 md:gap-2.5">
              {/* 移动端布局 */}
              <div className="flex items-center gap-3 md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className="advisor-outline-button h-8 w-8 rounded-full hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <h1 className="min-w-0 text-base font-semibold text-slate-900">任务管理</h1>
                </div>
              </div>

              {/* 桌面端布局 */}
              <div className="hidden items-center gap-3 md:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className="advisor-outline-button h-9 w-9 rounded-full hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold text-slate-900 md:text-[1.35rem]">任务管理</h1>
                </div>
              </div>
            </div>
          </div>

          {/* 任务看板内容区域 */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 md:px-6">
            <div className="mx-auto max-w-3xl">
              <LiveTaskBoard />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
