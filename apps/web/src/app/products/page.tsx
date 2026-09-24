import Link from 'next/link';
import { CaretRight, SlidersHorizontal } from '@phosphor-icons/react/dist/ssr';
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
  const queryLabel =
    typeof params.q === 'string' && params.q ? ` for “${params.q}”` : '';
  return (
    <SiteShell>
      <div className="catalog-page">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <CaretRight size={13} />
            <span>All products</span>
          </nav>
          <div className="catalog-page-heading">
            <div>
              <p className="store-kicker">Business catalog</p>
              <h1>Products{queryLabel}</h1>
              <p>
                Compare stock, minimums, and buying paths for your next order.
              </p>
            </div>
            <div className="catalog-heading-note">
              <SlidersHorizontal size={18} />
              <span>
                Prices in ETB
                <br />
                <small>Updated catalog view</small>
              </span>
            </div>
          </div>
          <div className="catalog-layout">
            <CatalogFilters searchParams={params} />
            <div className="catalog-results">
              <div className="results-toolbar">
                <span>
                  {data ? `${data.total} products` : 'Catalog unavailable'}
                </span>
                <Link href="/products" className="clear-filters">
                  Clear filters
                </Link>
              </div>
              {!data ? (
                <div className="empty-state">
                  Catalog is taking a short break. Try again in a moment.
                </div>
              ) : data.items.length === 0 ? (
                <div className="empty-state">
                  <strong>No products match those filters.</strong>
                  <span>
                    Try a broader search or clear the current filters.
                  </span>
                  <Link href="/products" className="button button-secondary">
                    Clear filters
                  </Link>
                </div>
              ) : (
                <div className="product-grid">
                  {data.items.map((product) => (
                    <ProductCard product={product} key={product.id} />
                  ))}
                </div>
              )}
              {data && data.totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                  {Array.from({ length: data.totalPages }, (_, i) => (
                    <Link
                      className={
                        data.page === i + 1
                          ? 'page-number is-current'
                          : 'page-number'
                      }
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
      </div>
    </SiteShell>
  );
}
