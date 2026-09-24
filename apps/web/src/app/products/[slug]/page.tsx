import Link from 'next/link';
import {
  CaretRight,
  Check,
  Cube,
  MapPin,
  Package,
  Truck,
} from '@phosphor-icons/react/dist/ssr';
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
      <div className="product-detail-page">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <CaretRight size={13} />
            <Link href="/products">Products</Link>
            <CaretRight size={13} />
            <span>{product.name}</span>
          </nav>
          <div className="product-detail-grid">
            <ProductGallery product={product} />
            <div className="product-purchase-panel">
              <div className="product-detail-meta">
                <span>{product.category.name}</span>
                {product.brand && (
                  <Link href={`/brands/${product.brand.slug}`}>
                    {product.brand.name}
                  </Link>
                )}
              </div>
              <h1>{product.name}</h1>
              <p className="product-detail-sku">SKU {product.internalSku}</p>
              <p className="product-detail-description">
                {product.shortDescription}
              </p>
              <div className="purchase-box">
                <div className="purchase-price">
                  <PriceDisplay product={product} />
                </div>
                <div className="purchase-facts">
                  <span>
                    <Package size={17} /> MOQ {product.minimumOrderQuantity}{' '}
                    {product.unit}
                  </span>
                  <span>
                    <Truck size={17} />{' '}
                    {product.leadTimeDays
                      ? `${product.leadTimeDays} day lead time`
                      : 'Lead time on request'}
                  </span>
                  <span>
                    <Check size={17} />{' '}
                    {product.availability.replaceAll('_', ' ')}
                  </span>
                </div>
                {product.priceTiers.length > 0 && (
                  <div className="tier-table">
                    <div className="tier-table-heading">
                      Volume pricing <small>Better rates at scale</small>
                    </div>
                    {product.priceTiers.map((tier) => (
                      <div key={tier.minimumQuantity}>
                        <span>{tier.minimumQuantity}+ units</span>
                        <strong>{formatEtb(tier.unitPrice)}</strong>
                      </div>
                    ))}
                  </div>
                )}
                <DisabledActions saleMode={product.saleMode} />
              </div>
              <div className="purchase-assurance">
                <div>
                  <MapPin size={18} />
                  <span>
                    <strong>Origin</strong>
                    {product.countryOfOrigin}
                  </span>
                </div>
                <div>
                  <Cube size={18} />
                  <span>
                    <strong>Buying path</strong>
                    {product.saleMode.replaceAll('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {product.variants.length > 1 && (
            <section className="detail-section">
              <div className="detail-section-heading">
                <p className="store-kicker">Configure</p>
                <h2>Choose a variant</h2>
              </div>
              <div className="variant-grid">
                {product.variants.map((variant) => (
                  <div className="variant-card" key={variant.id}>
                    <strong>{variant.name}</strong>
                    <span>{variant.sku}</span>
                    {variant.price && <b>{formatEtb(variant.price)}</b>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {product.specifications.length > 0 && (
            <section className="detail-section specifications-section">
              <div className="detail-section-heading">
                <p className="store-kicker">Product information</p>
                <h2>Specifications</h2>
              </div>
              <div className="specification-list">
                {product.specifications.map((spec) => (
                  <div key={`${spec.groupName}-${spec.name}`}>
                    <span>{spec.name}</span>
                    <strong>{spec.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
