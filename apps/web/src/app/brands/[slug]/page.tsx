import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { ProductCard } from '@/components/catalog-ui';
import { catalogFetch, CatalogPage } from '@/lib/catalog';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let data: {
    brand: { name: string; description: string | null };
    products: CatalogPage;
  };
  try {
    data = await catalogFetch(`/brands/${slug}`);
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
            <span>{data.brand.name}</span>
          </nav>
          <div className="catalog-page-heading">
            <div>
              <p className="store-kicker">Brand partner</p>
              <h1>{data.brand.name}</h1>
              <p>
                {data.brand.description ||
                  'Reliable products for your next order.'}
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
