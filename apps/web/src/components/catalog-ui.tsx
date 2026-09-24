'use client';

/* API-served image URLs are intentionally left unoptimized; the API already resizes and encodes them. */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, ArrowUpRight, Funnel, X } from '@phosphor-icons/react';
import {
  availabilityLabel,
  CatalogProduct,
  formatEtb,
  imageUrl,
} from '@/lib/catalog';
import { commerceFetch, commerceMutate, Rfq, Cart } from '@/lib/commerce-api';

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

export function ProductActions({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(product.minimumOrderQuantity);
  const [busy, setBusy] = useState(false);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [rfqOpen, setRfqOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(`Quote request for ${product.name}`);
  const variant =
    product.variants.find((item) => item.id === variantId) ??
    product.variants[0];
  const canCart =
    product.saleMode !== 'RFQ_ONLY' &&
    (!product.directPurchaseMaxQuantity ||
      quantity <= product.directPurchaseMaxQuantity) &&
    (!product.rfqThreshold || quantity < product.rfqThreshold);
  const canRfq =
    product.saleMode !== 'DIRECT_PURCHASE' || product.allowRfqAtAnyQuantity;

  useEffect(() => {
    // Restore the requested action after the login flow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchParams.get('intent') === 'quote') setRfqOpen(true);
  }, [searchParams]);

  async function requireAuth(intent: 'cart' | 'quote') {
    const response = await fetch('/api/backend/users/me', {
      credentials: 'include',
    });
    if (!response.ok) {
      const next = `${pathname}${window.location.search}`;
      router.push(
        `/login?next=${encodeURIComponent(`${next}${next.includes('?') ? '&' : '?'}intent=${intent}`)}`,
      );
      return false;
    }
    return true;
  }

  async function addCart() {
    if (!variant || !canCart || !(await requireAuth('cart'))) return;
    setBusy(true);
    try {
      await commerceMutate<Cart>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ variantId: variant.id, quantity }),
      });
      toast.success('Added to cart', {
        description: `${quantity} ${product.unit} of ${product.name}`,
      });
    } catch (error) {
      toast.error('Could not add to cart', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function openQuote() {
    if (!(await requireAuth('quote'))) return;
    setBusy(true);
    try {
      const data = await commerceFetch<{ items: Rfq[] }>('/rfqs?pageSize=50');
      setRfqs(data.items.filter((item) => item.status === 'DRAFT'));
      setRfqOpen(true);
    } catch (error) {
      toast.error('Could not load quote drafts', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function addToQuote(rfqId?: string) {
    if (!variant) return;
    setBusy(true);
    try {
      if (rfqId)
        await commerceMutate(`/rfqs/${rfqId}/items`, {
          method: 'POST',
          body: JSON.stringify({ variantId: variant.id, quantity }),
        });
      else
        await commerceMutate('/rfqs', {
          method: 'POST',
          body: JSON.stringify({
            title: newTitle,
            variantId: variant.id,
            quantity,
          }),
        });
      setRfqOpen(false);
      toast.success('Added to quote request');
    } catch (error) {
      toast.error('Could not add to quote request', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="product-actions">
      {product.variants.length > 1 && (
        <label>
          Variant
          <select
            className="field"
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
          >
            {product.variants.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.sku}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Quantity
        <input
          className="field"
          type="number"
          min={product.minimumOrderQuantity}
          value={quantity}
          onChange={(event) =>
            setQuantity(
              Math.max(
                product.minimumOrderQuantity,
                Number(event.target.value) || product.minimumOrderQuantity,
              ),
            )
          }
        />
      </label>
      <div className="product-action-row">
        <button
          className="button"
          type="button"
          disabled={busy || !canCart}
          onClick={addCart}
        >
          {busy
            ? 'Working…'
            : canCart
              ? 'Add to cart'
              : 'Request a quote for this quantity'}
        </button>
        {canRfq && (
          <button
            className="button button-secondary"
            type="button"
            disabled={busy}
            onClick={openQuote}
          >
            Request a quote
          </button>
        )}
      </div>
      {!canCart && product.rfqThreshold ? (
        <small>Quantities of {product.rfqThreshold}+ require a quote.</small>
      ) : null}
      {rfqOpen && (
        <dialog open className="commerce-dialog">
          <div className="dialog-heading">
            <div>
              <span className="eyebrow">Request a quote</span>
              <h2>Choose a draft</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setRfqOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="rfq-draft-options">
            <button
              type="button"
              className="draft-option"
              onClick={() => addToQuote()}
            >
              <strong>New request</strong>
              <span>{newTitle}</span>
            </button>
            {rfqs.map((rfq) => (
              <button
                type="button"
                className="draft-option"
                key={rfq.id}
                onClick={() => addToQuote(rfq.id)}
              >
                <strong>{rfq.title}</strong>
                <span>
                  {rfq.reference} · {rfq.items.length} items
                </span>
              </button>
            ))}
          </div>
          <label>
            New request title
            <input
              className="field"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
            />
          </label>
        </dialog>
      )}
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
