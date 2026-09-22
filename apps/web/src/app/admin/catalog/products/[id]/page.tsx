import { SiteShell } from '@/components/site-shell';
import { ProductEditor } from '@/components/admin-catalog';
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SiteShell>
      <section className="section">
        <div className="shell">
          <ProductEditor productId={id} />
        </div>
      </section>
    </SiteShell>
  );
}
