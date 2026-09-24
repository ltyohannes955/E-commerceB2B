import { AdminRfqDetail } from '@/components/admin-commerce';

export default async function AdminRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminRfqDetail id={id} />;
}
