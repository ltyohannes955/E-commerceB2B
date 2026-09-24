import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { ProductCard } from '@/components/catalog-ui';
import { catalogFetch, CatalogPage } from '@/lib/catalog';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';

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
      <div className="catalog-page">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <CaretRight size={13} />
            <Link href="/products">Products</Link>
            <CaretRight size={13} />
            <span>{data.category.name}</span>
          </nav>
          <div className="catalog-page-heading">
            <div>
              <p className="store-kicker">Department</p>
              <h1>{data.category.name}</h1>
              <p>
                {data.category.description ||
                  'Browse products in this sourcing lane.'}
              </p>
            </div>
            <span className="catalog-heading-note">
              {data.products.total} products
            </span>
          </div>
          <div className="product-grid">
            {data.products.items.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
