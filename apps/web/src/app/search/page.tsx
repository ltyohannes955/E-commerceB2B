import { SiteShell } from '@/components/site-shell';
import { ProductCard } from '@/components/catalog-ui';
import { catalogFetch, CatalogPage } from '@/lib/catalog';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  let data: CatalogPage | null = null;
  if (q) {
    try {
      data = await catalogFetch(`/search?q=${encodeURIComponent(q)}`);
    } catch {
      data = null;
    }
  }
  return (
    <SiteShell>
      <section className="section">
        <div className="shell">
          <span className="eyebrow">Search</span>
          <h1>{q ? `Results for “${q}”` : 'Find products by name or SKU.'}</h1>
          <form action="/search" className="mt-6 flex max-w-xl gap-2">
            <input
              className="field"
              name="q"
              defaultValue={q}
              placeholder="Search products, categories, or brands"
            />
            <button className="button" type="submit">
              Search
            </button>
          </form>
          <div className="mt-10">
            {q && data?.items.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((product) => (
                  <ProductCard product={product} key={product.id} />
                ))}
              </div>
            ) : q ? (
              <div className="empty-state">
                No published products matched that search.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
