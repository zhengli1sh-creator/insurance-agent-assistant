import { AssistantHome } from "@/components/dashboard/assistant-home";

type DashboardPageProps = {
  searchParams?: Promise<{ returnMessage?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = (await searchParams) ?? {};

  return <AssistantHome returnMessage={params.returnMessage ?? ""} />;
}
