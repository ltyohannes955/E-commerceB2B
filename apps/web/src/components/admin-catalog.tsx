'use client';

import { useEffect, useState } from 'react';
import { Plus, UploadSimple } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AdminDialog } from '@/components/admin-dialog';
import {
  AdminCatalogError,
  adminCatalogRequest,
  type CatalogValidationIssue,
} from '@/lib/admin-catalog-api';
import { imageUrl } from '@/lib/catalog';
import { notifyAdminError } from '@/lib/admin-notifications';

type Category = { id: string; name: string; parentId: string | null };
type Brand = { id: string; name: string };
type ProductImage = {
  id: string;
  src?: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
};
type AdminProduct = {
  id: string;
  name: string;
  internalSku: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  saleMode: string;
  categoryId: string;
  brandId: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  unit: string;
  minimumOrderQuantity: number;
  countryOfOrigin: string;
  leadTimeDays: number | null;
  leadTimeNote: string | null;
  availability: string;
  priceVisibility: string;
  regularPrice: string | null;
  directPurchaseMaxQuantity: number | null;
  rfqThreshold: number | null;
  images: ProductImage[];
};

function sectionForIssue(field: string) {
  if (field === 'images') return 'product-images';
  if (field.startsWith('sales.') || field.startsWith('variants'))
    return 'product-sales';
  if (field === 'merchandising.leadTime') return 'product-sales';
  return 'product-identity';
}

export function AdminCatalogList({
  initialProduct,
}: {
  initialProduct?: string;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [active, setActive] = useState<string | null>(initialProduct ?? null);
  const [message, setMessage] = useState('');

  async function reload() {
    try {
      const data = await adminCatalogRequest<{ items: AdminProduct[] }>(
        '/admin/products?pageSize=100',
      );
      setProducts(data.items);
      setState('ready');
    } catch {
      setState('error');
    }
  }

  useEffect(() => {
    let active = true;
    adminCatalogRequest<{ items: AdminProduct[] }>(
      '/admin/products?pageSize=100',
    )
      .then((data) => {
        if (!active) return;
        setProducts(data.items);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  function close() {
    setActive(null);
    if (initialProduct) router.replace('/admin/catalog');
  }

  async function duplicate(id: string) {
    try {
      const copy = await adminCatalogRequest<AdminProduct>(
        `/admin/products/${id}/duplicate`,
        { method: 'POST' },
      );
      await reload();
      setActive(copy.id);
      setMessage('Draft copy created.');
      toast.success('Draft copy created', {
        description: 'The duplicate is private until you publish it.',
      });
    } catch (error) {
      setMessage((error as Error).message);
      notifyAdminError('Could not duplicate product', error);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalog / Products</p>
          <h1>Products</h1>
          <p className="text-sm text-[var(--muted)]">
            Create drafts, refine details, then publish when ready.
          </p>
        </div>
        <button
          className="button"
          type="button"
          onClick={() => setActive('new')}
        >
          <Plus size={17} aria-hidden="true" /> New product
        </button>
      </div>
      {message && (
        <p role="status" className="admin-feedback">
          {message}
        </p>
      )}
      {state === 'loading' ? (
        <div className="empty-state" role="status">
          Loading catalog…
        </div>
      ) : state === 'error' ? (
        <div className="empty-state" role="alert">
          <h2>Could not load products</h2>
          <button
            className="button button-secondary"
            type="button"
            onClick={reload}
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h2>No products yet</h2>
          <p>Create a category first, then add your first product draft.</p>
          <button
            className="button"
            type="button"
            onClick={() => setActive('new')}
          >
            Add product
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="p-4">Product</th>
                <th className="p-4">Status</th>
                <th className="p-4">Buying path</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  className="border-b border-[var(--line)] last:border-0"
                  key={product.id}
                >
                  <td className="p-4">
                    <strong>{product.name}</strong>
                    <div className="text-xs text-[var(--muted)]">
                      {product.internalSku}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="admin-status">
                      {product.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    {product.saleMode.replaceAll('_', ' ').toLowerCase()}
                  </td>
                  <td className="p-4">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        onClick={() => setActive(product.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicate(product.id)}
                      >
                        Duplicate draft
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {active && (
        <AdminDialog
          title={active === 'new' ? 'New product' : 'Edit product'}
          onClose={close}
          wide
        >
          <ProductEditor
            productId={active === 'new' ? undefined : active}
            onSaved={(saved) => {
              void reload();
              setActive(saved.id);
              setMessage(
                saved.status === 'PUBLISHED'
                  ? 'Product published.'
                  : saved.status === 'ARCHIVED'
                    ? 'Product archived.'
                    : 'Product saved.',
              );
            }}
            onClose={close}
          />
        </AdminDialog>
      )}
    </div>
  );
}

export function ProductEditor({
  productId,
  onSaved,
  onClose,
}: {
  productId?: string;
  onSaved: (product: AdminProduct) => void;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [issues, setIssues] = useState<CatalogValidationIssue[]>([]);
  const [saleMode, setSaleMode] = useState('RFQ_ONLY');
  const [priceVisibility, setPriceVisibility] = useState('HIDE_PRICE');
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminCatalogRequest<Category[]>('/admin/categories'),
      adminCatalogRequest<Brand[]>('/admin/brands'),
      productId
        ? adminCatalogRequest<AdminProduct>(`/admin/products/${productId}`)
        : Promise.resolve(null),
    ])
      .then(([loadedCategories, loadedBrands, loadedProduct]) => {
        if (!active) return;
        setCategories(loadedCategories);
        setBrands(loadedBrands);
        setProduct(loadedProduct);
        setSaleMode(loadedProduct?.saleMode ?? 'RFQ_ONLY');
        setPriceVisibility(loadedProduct?.priceVisibility ?? 'HIDE_PRICE');
        setLoading(false);
      })
      .catch((error) => {
        if (active) {
          setStatus('Could not load catalog options.');
          setLoading(false);
          notifyAdminError('Could not load product editor', error);
        }
      });
    return () => {
      active = false;
    };
  }, [productId]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const publish =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute(
        'data-intent',
      ) === 'publish';
    const isNew = !productId;
    let draftSaved = false;
    setBusy(true);
    setStatus('');
    setIssues([]);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      internalSku: String(form.get('internalSku') ?? '').trim(),
      categoryId: String(form.get('categoryId') ?? ''),
      brandId: form.get('brandId') || null,
      shortDescription: String(form.get('shortDescription') ?? ''),
      fullDescription: String(form.get('fullDescription') ?? ''),
      unit: String(form.get('unit') ?? 'piece'),
      countryOfOrigin: String(form.get('countryOfOrigin') ?? '').toUpperCase(),
      leadTimeDays: form.get('leadTimeDays')
        ? Number(form.get('leadTimeDays'))
        : null,
      leadTimeNote: String(form.get('leadTimeNote') ?? '').trim(),
      minimumOrderQuantity: Number(form.get('minimumOrderQuantity')),
      availability: String(form.get('availability') ?? ''),
      saleMode: String(form.get('saleMode') ?? ''),
      priceVisibility: String(form.get('priceVisibility') ?? ''),
      regularPrice: form.get('regularPrice') || undefined,
      directPurchaseMaxQuantity: form.get('directPurchaseMaxQuantity')
        ? Number(form.get('directPurchaseMaxQuantity'))
        : null,
      rfqThreshold: form.get('rfqThreshold')
        ? Number(form.get('rfqThreshold'))
        : null,
    };
    try {
      const saved = await adminCatalogRequest<AdminProduct>(
        productId ? `/admin/products/${productId}` : '/admin/products',
        { method: productId ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      );
      setProduct(saved);
      onSaved(saved);
      draftSaved = true;
      const failedUploads = pendingImages.length
        ? await uploadBatch(saved.id, pendingImages, saved.name)
        : 0;
      if (publish) {
        if (failedUploads) {
          setStatus('Draft saved. Retry the failed images before publishing.');
          toast.error('Product saved, but not published', {
            description:
              'Some images failed to upload. Retry them before publishing.',
          });
          return;
        }
        const published = await adminCatalogRequest<AdminProduct>(
          `/admin/products/${saved.id}/status`,
          { method: 'PATCH', body: JSON.stringify({ status: 'PUBLISHED' }) },
        );
        setProduct(published);
        onSaved(published);
        setStatus('Product published and visible in the storefront.');
        toast.success('Product published', {
          description: 'It is now visible in the storefront.',
        });
      } else if (failedUploads) {
        toast.error('Draft saved with image errors', {
          description: `${failedUploads} image${failedUploads === 1 ? '' : 's'} failed to upload. Retry below.`,
        });
      } else {
        const title =
          saved.status === 'PUBLISHED'
            ? 'Product changes saved'
            : isNew
              ? 'Product draft created'
              : 'Draft saved';
        if (!pendingImages.length)
          setStatus(
            saved.status === 'PUBLISHED' ? 'Changes saved.' : 'Draft saved.',
          );
        toast.success(title, {
          description: isNew
            ? 'You can continue editing before publishing.'
            : undefined,
        });
      }
    } catch (error) {
      setStatus((error as Error).message);
      if (error instanceof AdminCatalogError) setIssues(error.issues);
      notifyAdminError(
        publish && draftSaved
          ? 'Could not publish product'
          : 'Could not save product',
        error,
      );
    } finally {
      setBusy(false);
    }
  }

  function stageImages(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const valid = selected.filter(
      (file) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) &&
        file.size <= 3 * 1024 * 1024,
    );
    const capacity = Math.max(
      0,
      6 - (product?.images.length ?? 0) - pendingImages.length,
    );
    setPendingImages((current) => [...current, ...valid.slice(0, capacity)]);
    if (valid.length !== selected.length) {
      setStatus('Some files were skipped. Use JPEG, PNG, or WebP under 3 MB.');
      toast.error('Some images were skipped', {
        description: 'Use JPEG, PNG, or WebP files under 3 MB.',
      });
    } else if (valid.length > capacity) {
      setStatus('A product can have at most six images.');
      toast.error('Image limit reached', {
        description: 'A product can have at most six images.',
      });
    } else setStatus('Images selected. Save the draft to upload them.');
  }

  async function uploadBatch(id: string, files: File[], name: string) {
    const failed: File[] = [];
    let uploaded = 0;
    for (const [index, file] of files.entries()) {
      setStatus(`Uploading image ${index + 1} of ${files.length}…`);
      const body = new FormData();
      body.set('file', file);
      body.set('altText', name);
      try {
        await adminCatalogRequest<ProductImage>(
          `/admin/products/${id}/images`,
          {
            method: 'POST',
            body,
          },
        );
        uploaded += 1;
      } catch {
        failed.push(file);
      }
    }
    setPendingImages(failed);
    try {
      const updated = await adminCatalogRequest<AdminProduct>(
        `/admin/products/${id}`,
      );
      setProduct(updated);
      onSaved(updated);
    } catch {
      setStatus(
        'Draft saved, but images could not be refreshed. Reopen the editor to check them.',
      );
      return Math.max(failed.length, 1);
    }
    setStatus(
      failed.length
        ? `${uploaded} image${uploaded === 1 ? '' : 's'} uploaded; ${failed.length} failed. Retry the remaining images below.`
        : `Draft saved. ${uploaded} image${uploaded === 1 ? '' : 's'} uploaded.`,
    );
    return failed.length;
  }

  async function upload(file: File | undefined) {
    if (!file || !productId) return;
    if (file.size > 3 * 1024 * 1024) {
      setStatus('Images must be 3 MB or smaller.');
      toast.error('Image is too large', {
        description: 'Choose an image no larger than 3 MB.',
      });
      return;
    }
    const body = new FormData();
    body.set('file', file);
    body.set('altText', product?.name ?? file.name);
    setBusy(true);
    try {
      await adminCatalogRequest<ProductImage>(
        `/admin/products/${productId}/images`,
        { method: 'POST', body },
      );
      const updated = await adminCatalogRequest<AdminProduct>(
        `/admin/products/${productId}`,
      );
      setProduct(updated);
      setStatus('Image uploaded.');
      onSaved(updated);
      toast.success('Image uploaded');
    } catch (error) {
      setStatus((error as Error).message);
      notifyAdminError('Could not upload image', error);
    } finally {
      setBusy(false);
    }
  }

  async function retryImages() {
    if (!productId || !pendingImages.length) return;
    setBusy(true);
    try {
      const failed = await uploadBatch(
        productId,
        pendingImages,
        product?.name ?? 'Product image',
      );
      if (failed)
        toast.error('Some images still need attention', {
          description: `${failed} image${failed === 1 ? '' : 's'} could not be uploaded. Retry below.`,
        });
      else toast.success('Images uploaded');
    } finally {
      setBusy(false);
    }
  }

  async function updateImages(images: ProductImage[], primaryImageId: string) {
    if (!productId) return;
    setBusy(true);
    try {
      const updated = await adminCatalogRequest<AdminProduct>(
        `/admin/products/${productId}/images/order`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            imageIds: images.map((image) => image.id),
            primaryImageId,
          }),
        },
      );
      setProduct(updated);
      onSaved(updated);
      setStatus('Image order updated.');
      toast.success('Image order updated');
    } catch (error) {
      setStatus((error as Error).message);
      notifyAdminError('Could not update images', error);
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(imageId: string) {
    if (!productId) return;
    setBusy(true);
    try {
      const updated = await adminCatalogRequest<AdminProduct>(
        `/admin/products/${productId}/images/${imageId}`,
        { method: 'DELETE' },
      );
      setProduct(updated);
      onSaved(updated);
      setStatus('Image removed.');
      toast.success('Image removed');
    } catch (error) {
      setStatus((error as Error).message);
      notifyAdminError('Could not remove image', error);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: AdminProduct['status']) {
    if (!productId) return;
    setBusy(true);
    setIssues([]);
    try {
      const updated = await adminCatalogRequest<AdminProduct>(
        `/admin/products/${productId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: next }) },
      );
      setProduct(updated);
      setStatus(
        next === 'DRAFT'
          ? product?.status === 'PUBLISHED'
            ? 'Product unpublished and returned to draft.'
            : 'Draft restored.'
          : `Product ${next.toLowerCase()}.`,
      );
      onSaved(updated);
      toast.success(
        next === 'DRAFT'
          ? product?.status === 'PUBLISHED'
            ? 'Product unpublished'
            : 'Draft restored'
          : 'Product archived',
      );
    } catch (error) {
      setStatus((error as Error).message);
      if (error instanceof AdminCatalogError) setIssues(error.issues);
      notifyAdminError('Could not change product status', error);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p role="status">Loading product editor…</p>;
  if (!categories.length)
    return (
      <div className="grid gap-4">
        <p role="alert">Create a category before adding products.</p>
        <Link className="button" href="/admin/categories">
          Manage categories
        </Link>
      </div>
    );

  return (
    <form
      className="admin-product-form"
      onSubmit={save}
      onInvalidCapture={(event) => {
        if (event.currentTarget.querySelector(':invalid') !== event.target)
          return;
        const field = event.target as HTMLInputElement | HTMLSelectElement;
        const label =
          field.labels?.[0]?.textContent?.trim() ?? 'A required field';
        const message = `${label} needs attention. Check the highlighted field and try again.`;
        setStatus(message);
        toast.error('Check product details', {
          id: 'product-form-invalid',
          description: message,
        });
      }}
      key={product?.id ?? 'new'}
    >
      <p className="admin-dialog-intro">
        {productId
          ? 'Update product details and manage its images before publication.'
          : 'Save a private draft first. Selected images upload automatically when the draft is created.'}
      </p>
      {status && (
        <p className="admin-feedback" role="status">
          {status}
        </p>
      )}
      {issues.length > 0 && (
        <div className="admin-validation" role="alert">
          <strong>Before publishing, fix these items:</strong>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.field}-${index}`}>
                <a href={`#${sectionForIssue(issue.field)}`}>{issue.message}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <section
        className="admin-form-section"
        id="product-identity"
        tabIndex={-1}
      >
        <h3>Identity</h3>
        <div className="admin-form-grid">
          <label>
            Product name
            <input
              className="field"
              name="name"
              required
              minLength={2}
              defaultValue={product?.name ?? ''}
            />
          </label>
          <label>
            Internal SKU
            <input
              className="field"
              name="internalSku"
              required
              defaultValue={product?.internalSku ?? ''}
            />
          </label>
          <label>
            Category
            <select
              className="field"
              name="categoryId"
              required
              defaultValue={product?.categoryId ?? ''}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Brand
            <select
              className="field"
              name="brandId"
              defaultValue={product?.brandId ?? ''}
            >
              <option value="">No brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-form-span">
            Short description
            <textarea
              className="field"
              name="shortDescription"
              rows={2}
              defaultValue={product?.shortDescription ?? ''}
            />
          </label>
          <label className="admin-form-span">
            Full description
            <textarea
              className="field"
              name="fullDescription"
              rows={3}
              defaultValue={product?.fullDescription ?? ''}
            />
          </label>
        </div>
      </section>
      <section className="admin-form-section" id="product-sales" tabIndex={-1}>
        <h3>Sales &amp; availability</h3>
        <div className="admin-form-grid">
          <label>
            Sale mode
            <select
              className="field"
              name="saleMode"
              value={saleMode}
              onChange={(event) => {
                const next = event.target.value;
                setSaleMode(next);
                if (next !== 'RFQ_ONLY') setPriceVisibility('SHOW_PRICE');
              }}
            >
              <option value="RFQ_ONLY">Quote only</option>
              <option value="DIRECT_PURCHASE">Direct purchase</option>
              <option value="HYBRID">Direct + quote</option>
            </select>
          </label>
          <label>
            Availability
            <select
              className="field"
              name="availability"
              defaultValue={product?.availability ?? 'AVAILABLE_TO_ORDER'}
            >
              <option value="AVAILABLE_TO_ORDER">Available to order</option>
              <option value="IN_STOCK">In stock</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
              <option value="DISCONTINUED">Discontinued</option>
            </select>
          </label>
          <label>
            Unit
            <input
              className="field"
              name="unit"
              required
              defaultValue={product?.unit ?? 'piece'}
            />
          </label>
          <label>
            Minimum quantity
            <input
              className="field"
              name="minimumOrderQuantity"
              type="number"
              min="1"
              required
              defaultValue={product?.minimumOrderQuantity ?? 1}
            />
          </label>
          <label>
            Origin (two-letter code)
            <input
              className="field"
              name="countryOfOrigin"
              required
              pattern="[A-Za-z]{2}"
              maxLength={2}
              defaultValue={product?.countryOfOrigin ?? 'AE'}
            />
          </label>
          <label>
            Price visibility
            <select
              className="field"
              name="priceVisibility"
              value={priceVisibility}
              onChange={(event) => setPriceVisibility(event.target.value)}
            >
              <option value="HIDE_PRICE">Price on request</option>
              <option value="SHOW_PRICE">Show price</option>
            </select>
          </label>
          <label>
            Regular price (ETB)
            <input
              className="field"
              name="regularPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product?.regularPrice ?? ''}
            />
          </label>
          <label>
            Lead time (days)
            <input
              className="field"
              name="leadTimeDays"
              type="number"
              min="0"
              defaultValue={product?.leadTimeDays ?? ''}
            />
          </label>
          <label>
            Lead time note
            <input
              className="field"
              name="leadTimeNote"
              placeholder="e.g. Confirmed after order"
              defaultValue={product?.leadTimeNote ?? ''}
            />
          </label>
          {saleMode === 'HYBRID' && (
            <>
              <label>
                Direct-purchase maximum quantity
                <input
                  className="field"
                  name="directPurchaseMaxQuantity"
                  type="number"
                  min="1"
                  defaultValue={product?.directPurchaseMaxQuantity ?? ''}
                />
              </label>
              <label>
                Request-quote threshold
                <input
                  className="field"
                  name="rfqThreshold"
                  type="number"
                  min="1"
                  defaultValue={product?.rfqThreshold ?? ''}
                />
              </label>
              <p className="admin-dialog-intro admin-form-span">
                The quote threshold must be one more than the direct-purchase
                maximum.
              </p>
            </>
          )}
        </div>
      </section>
      <section className="admin-form-section" id="product-images" tabIndex={-1}>
        <h3>Images</h3>
        <p className="admin-dialog-intro">
          JPEG, PNG, or WebP, up to 3 MB each. Six images maximum.
          {!productId &&
            ' Choose images now; they will upload after Save draft.'}
        </p>
        <label
          className={`admin-upload${busy || (product?.images.length ?? 0) + pendingImages.length >= 6 ? ' is-disabled' : ''}`}
        >
          <UploadSimple size={20} aria-hidden="true" /> Choose images
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={!productId}
            disabled={
              busy || (product?.images.length ?? 0) + pendingImages.length >= 6
            }
            onChange={(event) => {
              if (productId) void upload(event.target.files?.[0]);
              else stageImages(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        {pendingImages.length > 0 && (
          <div className="admin-pending-images">
            <strong>Ready to upload</strong>
            <ul>
              {pendingImages.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <span>{file.name}</span>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setPendingImages((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {productId && (
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={retryImages}
              >
                Retry uploads
              </button>
            )}
          </div>
        )}
        {(product?.images ?? []).length > 0 && (
          <ul className="admin-image-list">
            {product?.images.map((image, index) => (
              <li key={image.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(image.src ?? `/product-images/${image.id}`)}
                  alt={image.altText}
                  width="72"
                  height="72"
                />
                <span>
                  {image.altText || `Image ${index + 1}`}
                  {image.isPrimary ? ' · Primary' : ''}
                </span>
                <div className="admin-row-actions">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => {
                      const images = [...(product.images ?? [])];
                      [images[index - 1], images[index]] = [
                        images[index],
                        images[index - 1],
                      ];
                      void updateImages(
                        images,
                        product.images.find((entry) => entry.isPrimary)?.id ??
                          image.id,
                      );
                    }}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === product.images.length - 1}
                    onClick={() => {
                      const images = [...product.images];
                      [images[index], images[index + 1]] = [
                        images[index + 1],
                        images[index],
                      ];
                      void updateImages(
                        images,
                        product.images.find((entry) => entry.isPrimary)?.id ??
                          image.id,
                      );
                    }}
                  >
                    Down
                  </button>
                  {!image.isPrimary && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateImages(product.images, image.id)}
                    >
                      Make primary
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeImage(image.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {productId && (
        <section className="admin-form-section">
          <h3>Publication</h3>
          <p className="admin-dialog-intro">
            Publishing requires descriptions, lead time, and a primary image.
            Direct-purchase products also need a visible price.
          </p>
          <div className="admin-dialog-actions">
            {product?.status === 'PUBLISHED' && (
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => changeStatus('DRAFT')}
              >
                Unpublish
              </button>
            )}
            {product?.status === 'ARCHIVED' && (
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => changeStatus('DRAFT')}
              >
                Restore draft
              </button>
            )}
            {product?.status !== 'ARCHIVED' && (
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => changeStatus('ARCHIVED')}
              >
                Archive
              </button>
            )}
          </div>
        </section>
      )}
      <div className="admin-dialog-actions admin-dialog-actions-sticky">
        <button
          className="button button-secondary"
          type="button"
          onClick={onClose}
        >
          Close
        </button>
        <button
          className="button button-secondary"
          type="submit"
          disabled={busy}
        >
          {busy
            ? 'Saving…'
            : !product || product.status === 'DRAFT'
              ? 'Save draft'
              : 'Save changes'}
        </button>
        {product?.status !== 'PUBLISHED' && product?.status !== 'ARCHIVED' && (
          <button
            className="button"
            type="submit"
            data-intent="publish"
            disabled={busy}
          >
            {busy ? 'Publishing…' : 'Publish'}
          </button>
        )}
      </div>
    </form>
  );
}
