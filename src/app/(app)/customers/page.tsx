import Link from "next/link";
import { Plus } from "lucide-react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CustomerCrmPanel } from "@/components/customers/customer-crm-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomersPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.22fr_0.9fr]">
      <div className="space-y-6">
        <Card className="glass-panel border-white/55 bg-white/84">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-4 rounded-full border-0 bg-[#B8894A]/12 px-3 py-1 text-[#B8894A]">客户中心</Badge>
                <h2 className="text-3xl font-semibold text-slate-900">把客户资料和跟进状态清晰整理出来。</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                  登录后可查看和维护你的客户资料；未登录时先展示示例内容，方便你预览。
                </p>
              </div>
              <Link href="/customers/new">
                <Button className="rounded-full bg-[#123B5D] px-5 text-white hover:bg-[#0E2E49]">
                  <Plus className="mr-2 h-4 w-4" />
                  添加客户
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        <CustomerCrmPanel />
      </div>
      <div className="space-y-6 xl:sticky xl:top-28 xl:h-fit">
        <ChatPanel />
      </div>
    </div>
  );
}
