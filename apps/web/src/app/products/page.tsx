import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { CatalogFilters, ProductCard } from '@/components/catalog-ui';
import { catalogFetch, CatalogPage } from '@/lib/catalog';

export default async function Products({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') query.set(key, value);
  });
  let data: CatalogPage | null = null;
  try {
    data = await catalogFetch<CatalogPage>(`/products?${query.toString()}`);
  } catch {
    data = null;
  }
  return (
    <SiteShell>
      <section className="section">
        <div className="shell">
          <div className="section-heading section-heading-wide">
            <span className="eyebrow">Catalog</span>
            <h1>Source with a clearer view.</h1>
            <p>
              Industrial, commercial, and workplace essentials selected for
              Ethiopian buyers.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-[220px_1fr]">
            <CatalogFilters searchParams={params} />
            <div>
              <div className="mb-5 flex items-center justify-between text-sm text-[var(--muted)]">
                <span>
                  {data ? `${data.total} products` : 'Catalog unavailable'}
                </span>
                <Link href="/products" className="underline">
                  Clear filters
                </Link>
              </div>
              {!data ? (
                <div className="empty-state">
                  Catalog is taking a short break. Try again in a moment.
                </div>
              ) : data.items.length === 0 ? (
                <div className="empty-state">
                  No products match those filters.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {data.items.map((product) => (
                    <ProductCard product={product} key={product.id} />
                  ))}
                </div>
              )}
              {data && data.totalPages > 1 && (
                <nav
                  className="mt-8 flex justify-center gap-2"
                  aria-label="Pagination"
                >
                  {Array.from({ length: data.totalPages }, (_, i) => (
                    <Link
                      className={`rounded-lg px-3 py-2 text-sm ${data?.page === i + 1 ? 'bg-[var(--navy)] text-white' : 'border border-[var(--line)]'}`}
                      href={`/products?${new URLSearchParams({ ...Object.fromEntries(query), page: String(i + 1) }).toString()}`}
                      key={i}
                    >
                      {i + 1}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
