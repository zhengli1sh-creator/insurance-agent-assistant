import { CustomerDetailShell } from "@/components/customers/customer-detail-shell";

type CustomerDetailPageProps = {
  params?: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const resolvedParams = await params;

  return <CustomerDetailShell customerId={resolvedParams?.id ?? ""} />;
}
