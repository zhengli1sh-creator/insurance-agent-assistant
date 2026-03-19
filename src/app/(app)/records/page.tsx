import { RecordsPageShell } from "@/components/records/records-page-shell";

type RecordsPageProps = {
  searchParams?: Promise<{ tab?: string; source?: string }>;
};

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  const params = (await searchParams) ?? {};
  const initialTab = params.tab === "activities" ? "activities" : "visits";
  const fromAssistantHome = params.source === "assistant-home";

  return <RecordsPageShell initialTab={initialTab} fromAssistantHome={fromAssistantHome} />;
}
