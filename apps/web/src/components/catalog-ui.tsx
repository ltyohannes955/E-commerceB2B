'use client';

/* API-served image URLs are intentionally left unoptimized; the API already resizes and encodes them. */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Funnel, X } from '@phosphor-icons/react';
import {
  availabilityLabel,
  CatalogProduct,
  formatEtb,
  imageUrl,
} from '@/lib/catalog';

export function PriceDisplay({ product }: { product: CatalogProduct }) {
  if (product.priceVisibility === 'HIDE_PRICE' || !product.regularPrice)
    return <span className="price-request">Request a quote</span>;
  const discounted =
    product.discountPrice &&
    Number(product.discountPrice) < Number(product.regularPrice);
  return (
    <span className="price-display">
      <strong>
        {formatEtb(discounted ? product.discountPrice : product.regularPrice)}
      </strong>
      {discounted && <del>{formatEtb(product.regularPrice)}</del>}
    </span>
  );
}

export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = product.images[0];
  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-card-link">
        <div className="product-card-media">
          {image ? (
            <img
              src={imageUrl(image.src)}
              alt={image.altText || product.name}
            />
          ) : (
            <div className="product-image-empty">Image coming soon</div>
          )}
          <span className="product-card-action">
            <ArrowUpRight size={17} />
          </span>
        </div>
        <div className="product-card-body">
          <div className="product-card-meta">
            <span>{product.brand?.name || product.category.name}</span>
            <span className="availability-label">
              {availabilityLabel(product.availability)}
            </span>
          </div>
          <h3>{product.name}</h3>
          <p>{product.shortDescription}</p>
          <div className="product-card-price">
            <PriceDisplay product={product} />
            <span>
              MOQ {product.minimumOrderQuantity} {product.unit}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function FilterFields({
  searchParams,
  close,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  close?: () => void;
}) {
  const q = typeof searchParams.q === 'string' ? searchParams.q : '';
  const sort =
    typeof searchParams.sort === 'string' ? searchParams.sort : 'newest';
  const saleMode =
    typeof searchParams.saleMode === 'string' ? searchParams.saleMode : '';
  return (
    <div className="filter-fields">
      <label>
        Search
        <input
          name="q"
          defaultValue={q}
          placeholder="Product, SKU, brand"
          className="field"
        />
      </label>
      <label>
        Sort
        <select name="sort" defaultValue={sort} className="field">
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </label>
      <label>
        Buying path
        <select name="saleMode" defaultValue={saleMode} className="field">
          <option value="">All buying paths</option>
          <option value="DIRECT_PURCHASE">Direct purchase</option>
          <option value="RFQ_ONLY">Request a quote</option>
          <option value="HYBRID">Direct + quote</option>
        </select>
      </label>
      <button className="button filter-submit" type="submit" onClick={close}>
        Apply filters <ArrowRight size={16} />
      </button>
    </div>
  );
}

export function CatalogFilters({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="button button-secondary mobile-filter-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Funnel size={17} /> Filters
      </button>
      <aside className="catalog-filter-panel">
        <div className="filter-panel-heading">
          <div>
            <p className="store-kicker">Refine results</p>
            <h2>Find a fit</h2>
          </div>
          <span>Filter</span>
        </div>
        <form action="/products">
          <FilterFields searchParams={searchParams} />
        </form>
      </aside>
      {open && (
        <dialog open className="filter-dialog">
          <div className="filter-dialog-heading">
            <h2>Filters</h2>
            <button
              className="icon-button"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
            >
              <X size={20} />
            </button>
          </div>
          <form action="/products" onSubmit={() => setOpen(false)}>
            <FilterFields
              searchParams={searchParams}
              close={() => setOpen(false)}
            />
          </form>
        </dialog>
      )}
    </>
  );
}

export function ProductGallery({ product }: { product: CatalogProduct }) {
  const [selected, setSelected] = useState(product.images[0]);
  return (
    <div className="product-gallery">
      <div className="product-gallery-main">
        {selected ? (
          <img
            src={imageUrl(selected.src)}
            alt={selected.altText || product.name}
          />
        ) : (
          <div className="product-image-empty">No product photography</div>
        )}
      </div>
      <div className="product-gallery-thumbs" aria-label="Product images">
        {product.images.map((image) => (
          <button
            type="button"
            key={image.id}
            onClick={() => setSelected(image)}
            className={
              selected?.id === image.id
                ? 'gallery-thumb is-selected'
                : 'gallery-thumb'
            }
          >
            <img
              src={imageUrl(image.src)}
              alt={image.altText || product.name}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function DisabledActions({ saleMode }: { saleMode: string }) {
  return (
    <div className="product-actions">
      <button className="button" disabled>
        {saleMode !== 'RFQ_ONLY' ? 'Add to cart' : 'Cart unavailable'}
      </button>
      <button className="button button-secondary" disabled>
        {saleMode !== 'DIRECT_PURCHASE'
          ? 'Request a quote'
          : 'Quote unavailable'}
      </button>
      <small>Cart and quote actions arrive in Phase 3.</small>
    </div>
  );
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/backend/products?pageSize=4&sort=newest')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { items?: CatalogProduct[] } | null) =>
        setProducts(data?.items ?? []),
      )
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <section className="section home-featured">
      <div className="shell">
        <div className="commerce-section-heading">
          <div>
            <p className="store-kicker">Selected for the trade desk</p>
            <h2>Ready to compare</h2>
          </div>
          <Link href="/products" className="text-link">
            View all products <ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <div
            className="product-grid product-grid-skeleton"
            aria-label="Loading products"
          >
            <div />
            <div />
            <div />
            <div />
          </div>
        ) : products.length ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            The catalog is ready when you are. Browse all products to start
            sourcing.
          </div>
        )}
      </div>
    </section>
  );
}
