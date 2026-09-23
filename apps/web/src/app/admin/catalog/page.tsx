import { AdminCatalogList } from '@/components/admin-catalog';
export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  return (
    <section className="section">
      <div className="shell">
        <AdminCatalogList initialProduct={product} />
      </div>
    </section>
  );
}
