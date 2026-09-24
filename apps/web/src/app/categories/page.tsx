import Link from 'next/link';
import { ArrowRight, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { SiteShell } from '@/components/site-shell';
import { catalogFetch, type CatalogCategory } from '@/lib/catalog';

export default async function CategoriesPage() {
  let categories: CatalogCategory[] = [];
  try {
    const result = await catalogFetch<CatalogCategory[]>('/categories');
    categories = result.filter((category) => category.parentId === null);
  } catch {
    // The storefront still renders a useful error state if the API is unavailable.
  }

  return (
    <SiteShell>
      <main className="catalog-page">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <CaretRight size={13} />
            <span>Categories</span>
          </nav>
          <div className="catalog-page-heading">
            <div>
              <p className="store-kicker">Shop by department</p>
              <h1>Find the right sourcing lane.</h1>
              <p>
                Browse the categories currently available in the public catalog.
              </p>
            </div>
          </div>
          {categories.length ? (
            <div className="category-grid">
              {categories.map((category, index) => (
                <article
                  className={`category-card category-card-${['navy', 'sand', 'emerald', 'ink'][index % 4]}`}
                  key={category.id}
                >
                  <p className="category-kicker">Department</p>
                  <h3>{category.name}</h3>
                  <p>
                    {category.description ||
                      (category.children.length
                        ? `${category.children.length} subcategories to explore.`
                        : 'Browse products in this department.')}
                  </p>
                  <Link
                    className="category-link"
                    href={`/categories/${category.slug}`}
                  >
                    Browse department <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state" role="status">
              <h2>No categories available yet</h2>
              <p>Check back soon or browse the full product catalog.</p>
              <Link className="button" href="/products">
                Browse products
              </Link>
            </div>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
