'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Plus, UploadSimple } from '@phosphor-icons/react';
import type { CatalogProduct } from '@/lib/catalog';

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (response.status === 403) throw new Error('FORBIDDEN');
  if (!response.ok) throw new Error('REQUEST_FAILED');
  return response.json();
}

export function AdminCatalogList() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    adminFetch<{ items: CatalogProduct[] }>('/admin/products')
      .then((data) => {
        setProducts(data.items);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);
  if (state === 'loading')
    return <div className="empty-state">Loading catalog…</div>;
  if (state === 'error')
    return (
      <div className="empty-state">
        <h2>Catalog access unavailable</h2>
        <p>Sign in with an administrator account to manage products.</p>
        <Link className="button" href="/login">
          Go to login
        </Link>
      </div>
    );
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Products</p>
          <h1>Catalog control room</h1>
        </div>
        <Link className="button" href="/admin/catalog/products/new">
          <Plus size={17} /> New product
        </Link>
      </div>
      {products.length === 0 ? (
        <div className="empty-state">No products yet. Start with a draft.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="p-4">Product</th>
                <th className="p-4">Status</th>
                <th className="p-4">Buying path</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  className="border-b border-[var(--line)] last:border-0"
                  key={product.id}
                >
                  <td className="p-4">
                    <Link
                      className="font-semibold"
                      href={`/admin/catalog/products/${product.id}`}
                    >
                      {product.name}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">
                      {product.internalSku}
                    </div>
                  </td>
                  <td className="p-4">{product.status}</td>
                  <td className="p-4">{product.saleMode}</td>
                  <td className="p-4 text-right">
                    <Link
                      className="underline"
                      href={`/admin/catalog/products/${product.id}`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ProductEditor({ productId }: { productId?: string }) {
  const [product, setProduct] = useState<Partial<CatalogProduct>>({});
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (productId)
      adminFetch<CatalogProduct>(`/admin/products/${productId}`)
        .then(setProduct)
        .catch(() => setStatus('Unable to load this product.'));
  }, [productId]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get('name'),
      shortDescription: form.get('shortDescription'),
      internalSku: form.get('internalSku'),
      unit: form.get('unit'),
      minimumOrderQuantity: Number(form.get('minimumOrderQuantity') || 1),
      countryOfOrigin: form.get('countryOfOrigin'),
      saleMode: form.get('saleMode'),
    };
    try {
      const saved = await adminFetch<CatalogProduct>(
        productId ? `/admin/products/${productId}` : '/admin/products',
        { method: productId ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      );
      setProduct(saved);
      setStatus('Draft saved.');
    } catch {
      setStatus('Save failed. Check required fields and try again.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="grid gap-8" onSubmit={save}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Product editor</p>
          <h1>{productId ? 'Edit product' : 'Create a product draft'}</h1>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {productId && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                setStatus('Preview is protected until this draft is saved.')
              }
            >
              Preview
            </button>
          )}
        </div>
      </div>
      {status && (
        <div
          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
          role="status"
        >
          {status}
        </div>
      )}
      <section className="editor-section">
        <p className="eyebrow">01 · Identity</p>
        <h2>What is this product?</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Product name
            <input
              className="field"
              name="name"
              required
              defaultValue={product.name ?? ''}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Internal SKU
            <input
              className="field"
              name="internalSku"
              required
              defaultValue={product.internalSku ?? ''}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">
            Short description
            <textarea
              className="field min-h-24"
              name="shortDescription"
              defaultValue={product.shortDescription ?? ''}
            />
          </label>
        </div>
      </section>
      <section className="editor-section">
        <p className="eyebrow">02 · Sales & pricing</p>
        <h2>How should buyers source it?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold">
            Sale mode
            <select
              className="field"
              name="saleMode"
              defaultValue={product.saleMode ?? 'RFQ_ONLY'}
            >
              <option value="RFQ_ONLY">Request a quote</option>
              <option value="DIRECT_PURCHASE">Direct purchase</option>
              <option value="HYBRID">Direct + quote</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Unit
            <input
              className="field"
              name="unit"
              defaultValue={product.unit ?? 'piece'}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            MOQ
            <input
              className="field"
              name="minimumOrderQuantity"
              type="number"
              min="1"
              defaultValue={product.minimumOrderQuantity ?? 1}
            />
          </label>
        </div>
      </section>
      <section className="editor-section">
        <p className="eyebrow">03 · Images</p>
        <h2>Give buyers confidence</h2>
        <label className="flex min-h-28 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] text-sm font-semibold">
          <UploadSimple size={20} /> Upload up to six images
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </label>
      </section>
      <section className="editor-section">
        <p className="eyebrow">04 · Publication</p>
        <h2>Review before publishing</h2>
        <p className="text-sm text-[var(--muted)]">
          Drafts are private. Publishing will check required merchandising
          fields, pricing, tiers, and a primary image.
        </p>
        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            setStatus(
              'Publish validation will be available after the draft has a category, price, and primary image.',
            )
          }
        >
          <Check size={17} /> Validate publication
        </button>
      </section>
    </form>
  );
}
