import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import {
  DisabledActions,
  PriceDisplay,
  ProductGallery,
} from '@/components/catalog-ui';
import { catalogFetch, CatalogProduct, formatEtb } from '@/lib/catalog';

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product: CatalogProduct;
  try {
    product = await catalogFetch<CatalogProduct>(`/products/${slug}`);
  } catch {
    notFound();
  }
  return (
    <SiteShell>
      <section className="section">
        <div className="shell">
          <Link href="/products" className="text-sm text-[var(--muted)]">
            ← Back to catalog
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <ProductGallery product={product} />
            <div className="grid content-start gap-5">
              <p className="eyebrow">
                {product.category.name}
                {product.brand ? ` · ${product.brand.name}` : ''}
              </p>
              <h1 className="m-0 text-4xl leading-tight md:text-5xl">
                {product.name}
              </h1>
              <p className="m-0 text-lg leading-8 text-[var(--muted)]">
                {product.shortDescription}
              </p>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
                <div className="text-2xl">
                  <PriceDisplay product={product} />
                </div>
                <p className="mt-2 mb-0 text-sm text-[var(--muted)]">
                  Minimum order: {product.minimumOrderQuantity} {product.unit}
                  {product.leadTimeDays
                    ? ` · ${product.leadTimeDays} day lead time`
                    : ''}
                </p>
                {product.priceTiers.length > 0 && (
                  <div className="mt-5 border-t border-[var(--line)] pt-4">
                    <p className="eyebrow">Volume pricing</p>
                    <div className="mt-2 grid gap-2 text-sm">
                      {product.priceTiers.map((tier) => (
                        <div
                          className="flex justify-between"
                          key={tier.minimumQuantity}
                        >
                          <span>{tier.minimumQuantity}+ units</span>
                          <strong>{formatEtb(tier.unitPrice)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DisabledActions saleMode={product.saleMode} />
              <div className="grid gap-3 rounded-2xl border border-[var(--line)] p-5 text-sm">
                <p className="eyebrow">Details</p>
                <p className="m-0">
                  Availability:{' '}
                  <strong>{product.availability.replaceAll('_', ' ')}</strong>
                </p>
                <p className="m-0">
                  Origin: <strong>{product.countryOfOrigin}</strong>
                </p>
                <p className="m-0">
                  SKU: <strong>{product.internalSku}</strong>
                </p>
              </div>
            </div>
          </div>
          {product.variants.length > 1 && (
            <section className="mt-16">
              <p className="eyebrow">Configure</p>
              <h2>Choose a variant</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {product.variants.map((variant) => (
                  <div
                    className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
                    key={variant.id}
                  >
                    <strong>{variant.name}</strong>
                    <p className="m-0 mt-2 text-sm text-[var(--muted)]">
                      {variant.sku}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
          {product.specifications.length > 0 && (
            <section className="mt-16">
              <p className="eyebrow">Specifications</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {product.specifications.map((spec) => (
                  <div
                    className="flex justify-between gap-4 border-b border-[var(--line)] py-3 text-sm"
                    key={`${spec.groupName}-${spec.name}`}
                  >
                    <span className="text-[var(--muted)]">{spec.name}</span>
                    <strong>{spec.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
