import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { ProductCard } from '@/components/catalog-ui';
import { catalogFetch, CatalogPage } from '@/lib/catalog';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let data: {
    category: { name: string; description: string | null };
    products: CatalogPage;
  };
  try {
    data = await catalogFetch(`/categories/${slug}`);
  } catch {
    notFound();
  }
  return (
    <SiteShell>
      <section className="section">
        <div className="shell">
          <span className="eyebrow">Category</span>
          <h1>{data.category.name}</h1>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            {data.category.description ||
              'Browse products in this sourcing lane.'}
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.products.items.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
