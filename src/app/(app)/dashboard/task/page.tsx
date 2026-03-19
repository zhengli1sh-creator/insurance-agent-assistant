import { AssistantTaskShell } from "@/components/dashboard/assistant-task-shell";

type DashboardTaskPageProps = {
  searchParams?: Promise<{ surface?: string }>;
};

export default async function DashboardTaskPage({ searchParams }: DashboardTaskPageProps) {
  const params = (await searchParams) ?? {};
  const surface = params.surface === "activities" || params.surface === "customers" ? params.surface : "visit";

  return <AssistantTaskShell surface={surface} />;
}
