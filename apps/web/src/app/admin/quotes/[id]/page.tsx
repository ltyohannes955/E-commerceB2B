import { AdminQuoteDetail } from '@/components/admin-commerce';

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminQuoteDetail id={id} />;
}
