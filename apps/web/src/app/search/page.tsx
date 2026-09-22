import { SiteShell } from '@/components/site-shell';
import { ProductCard } from '@/components/catalog-ui';
import { catalogFetch, CatalogPage } from '@/lib/catalog';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';

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
      <div className="catalog-page">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <CaretRight size={13} />
            <span>Search</span>
          </nav>
          <div className="catalog-page-heading search-page-heading">
            <div>
              <p className="store-kicker">Catalog search</p>
              <h1>
                {q ? `Results for “${q}”` : 'Find products by name or SKU.'}
              </h1>
              <p>
                Search across product names, brands, categories, and internal
                SKUs.
              </p>
            </div>
          </div>
          <form action="/search" className="search-page-form">
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
          <div className="search-page-results">
            {q && data?.items.length ? (
              <div className="product-grid">
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
      </div>
    </SiteShell>
  );
}
