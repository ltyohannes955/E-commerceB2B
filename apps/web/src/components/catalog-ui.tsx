'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Funnel, X } from '@phosphor-icons/react';
import {
  availabilityLabel,
  CatalogProduct,
  formatEtb,
  imageUrl,
} from '@/lib/catalog';

export function PriceDisplay({ product }: { product: CatalogProduct }) {
  if (product.priceVisibility === 'HIDE_PRICE' || !product.regularPrice)
    return (
      <span className="font-semibold text-[var(--emerald)]">
        Request a quote
      </span>
    );
  const discounted =
    product.discountPrice &&
    Number(product.discountPrice) < Number(product.regularPrice);
  return (
    <span className="flex flex-wrap items-baseline gap-2">
      <strong>
        {formatEtb(discounted ? product.discountPrice : product.regularPrice)}
      </strong>
      {discounted && (
        <del className="text-xs text-[var(--muted)]">
          {formatEtb(product.regularPrice)}
        </del>
      )}
    </span>
  );
}

export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = product.images[0];
  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_#0b1f3314]">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--sand)]">
          {image ? (
            <img
              src={imageUrl(image.src)}
              alt={image.altText || product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-[var(--muted)]">
              Image coming soon
            </div>
          )}
        </div>
        <div className="grid gap-3 p-5">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            <span>{product.category.name}</span>
            <span>{availabilityLabel(product.availability)}</span>
          </div>
          <h3 className="m-0 text-lg font-semibold leading-tight">
            {product.name}
          </h3>
          <p className="m-0 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
            {product.shortDescription}
          </p>
          <div className="flex items-center justify-between gap-3 text-sm">
            <PriceDisplay product={product} />
            <span className="text-[var(--muted)]">
              MOQ {product.minimumOrderQuantity} {product.unit}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function CatalogFilters({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const q = typeof searchParams.q === 'string' ? searchParams.q : '';
  const sort =
    typeof searchParams.sort === 'string' ? searchParams.sort : 'newest';
  const content = (
    <div className="grid gap-5">
      <label className="grid gap-2 text-sm font-semibold">
        Search
        <input
          name="q"
          defaultValue={q}
          placeholder="Product, SKU, brand"
          className="field"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Sort
        <select name="sort" defaultValue={sort} className="field">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Sale mode
        <select name="saleMode" className="field">
          <option value="">All buying paths</option>
          <option value="DIRECT_PURCHASE">Direct purchase</option>
          <option value="RFQ_ONLY">Request a quote</option>
          <option value="HYBRID">Direct + quote</option>
        </select>
      </label>
      <button className="button" type="submit" onClick={() => setOpen(false)}>
        Apply filters <ArrowRight size={16} />
      </button>
    </div>
  );
  return (
    <>
      <button
        className="button button-secondary md:hidden"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Funnel size={17} /> Filters
      </button>
      <aside className="hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 md:block">
        <p className="eyebrow">Refine</p>
        <form action="/products" className="mt-4">
          {content}
        </form>
      </aside>
      {open && (
        <dialog
          open
          className="fixed inset-0 z-50 m-0 h-full w-full max-w-none bg-[var(--surface)] p-6 md:hidden"
        >
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-xl">Filters</h2>
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
            >
              <X size={20} />
            </button>
          </div>
          <form
            action="/products"
            className="mt-8"
            onSubmit={() => setOpen(false)}
          >
            {content}
          </form>
        </dialog>
      )}
    </>
  );
}

export function ProductGallery({ product }: { product: CatalogProduct }) {
  const [selected, setSelected] = useState(product.images[0]);
  return (
    <div className="grid gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--sand)]">
        {selected ? (
          <img
            src={imageUrl(selected.src)}
            alt={selected.altText || product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-[var(--muted)]">
            No product photography
          </div>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto" aria-label="Product images">
        {product.images.map((image) => (
          <button
            type="button"
            key={image.id}
            onClick={() => setSelected(image)}
            className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${selected?.id === image.id ? 'border-[var(--emerald)]' : 'border-transparent'}`}
          >
            <img
              src={imageUrl(image.src)}
              alt={image.altText || product.name}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function DisabledActions({ saleMode }: { saleMode: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button className="button" disabled>
        {saleMode !== 'RFQ_ONLY'
          ? 'Add to cart · Phase 3'
          : 'Add to cart unavailable'}
      </button>
      <button className="button button-secondary" disabled>
        {saleMode !== 'DIRECT_PURCHASE'
          ? 'Request quote · Phase 3'
          : 'Quote unavailable'}
      </button>
    </div>
  );
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  useEffect(() => {
    fetch('/api/backend/products?pageSize=4&sort=newest')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { items?: CatalogProduct[] } | null) =>
        setProducts(data?.items ?? []),
      )
      .catch(() => setProducts([]));
  }, []);
  if (!products.length) return null;
  return (
    <section className="section pt-0">
      <div className="shell">
        <div className="section-heading section-heading-wide">
          <span className="eyebrow">Featured sourcing lanes</span>
          <h2>Useful products, ready to explore.</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
