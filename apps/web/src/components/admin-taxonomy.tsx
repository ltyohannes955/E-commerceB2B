'use client';

import { useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { AdminDialog } from '@/components/admin-dialog';
import { adminCatalogRequest } from '@/lib/admin-catalog-api';
import { notifyAdminError } from '@/lib/admin-notifications';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  children: { id: string }[];
  _count: { products: number };
};
type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { products: number };
};
type Kind = 'categories' | 'brands';

export function AdminTaxonomy({ kind }: { kind: Kind }) {
  const [items, setItems] = useState<(Category | Brand)[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [editing, setEditing] = useState<Category | Brand | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | Brand | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isCategory = kind === 'categories';
  const noun = isCategory ? 'category' : 'brand';

  async function reload() {
    try {
      const result = await adminCatalogRequest<(Category | Brand)[]>(
        `/admin/${kind}`,
      );
      setItems(result);
      setState('ready');
    } catch {
      setState('error');
    }
  }

  useEffect(() => {
    let active = true;
    adminCatalogRequest<(Category | Brand)[]>(`/admin/${kind}`)
      .then((result) => {
        if (!active) return;
        setItems(result);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [kind]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = editing && editing !== 'new' ? editing.id : null;
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      ...(isCategory ? { parentId: form.get('parentId') || null } : {}),
    };
    setBusy(true);
    setMessage('');
    try {
      await adminCatalogRequest(`/admin/${kind}${id ? `/${id}` : ''}`, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      setEditing(null);
      setMessage(
        `${isCategory ? 'Category' : 'Brand'} ${id ? 'updated' : 'created'}.`,
      );
      toast.success(
        `${isCategory ? 'Category' : 'Brand'} ${id ? 'updated' : 'created'}`,
      );
      await reload();
    } catch (error) {
      setMessage((error as Error).message);
      notifyAdminError(`Could not save ${noun}`, error);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setMessage('');
    try {
      await adminCatalogRequest(`/admin/${kind}/${deleting.id}`, {
        method: 'DELETE',
      });
      setDeleting(null);
      setMessage(`${isCategory ? 'Category' : 'Brand'} deleted.`);
      toast.success(`${isCategory ? 'Category' : 'Brand'} deleted`);
      await reload();
    } catch (error) {
      setMessage((error as Error).message);
      notifyAdminError(`Could not delete ${noun}`, error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalog / {kind}</p>
          <h1>{isCategory ? 'Categories' : 'Brands'}</h1>
          <p className="text-sm text-[var(--muted)]">
            {isCategory
              ? 'Organize products into browsable departments and subcategories.'
              : 'Keep maker names consistent across the catalog.'}
          </p>
        </div>
        <button
          className="button"
          type="button"
          onClick={() => setEditing('new')}
        >
          <Plus size={17} aria-hidden="true" /> Add {noun}
        </button>
      </div>
      {message && (
        <p className="admin-feedback" role="status">
          {message}
        </p>
      )}
      {state === 'loading' ? (
        <div className="empty-state" role="status">
          Loading {kind}…
        </div>
      ) : state === 'error' ? (
        <div className="empty-state" role="alert">
          <h2>Could not load {kind}</h2>
          <button
            className="button button-secondary"
            type="button"
            onClick={reload}
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h2>No {kind} yet</h2>
          <p>Add your first {noun} to organize the storefront.</p>
          <button
            className="button"
            type="button"
            onClick={() => setEditing('new')}
          >
            Add {noun}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="p-4">Name</th>
                <th className="p-4">Slug</th>
                {isCategory && <th className="p-4">Parent</th>}
                <th className="p-4">Products</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const category = isCategory ? (item as Category) : null;
                const parent = category?.parentId
                  ? items.find((entry) => entry.id === category.parentId)
                  : null;
                const canDelete =
                  item._count.products === 0 &&
                  (!category || category.children.length === 0);
                return (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <td className="p-4 font-semibold">{item.name}</td>
                    <td className="p-4 text-[var(--muted)]">{item.slug}</td>
                    {isCategory && (
                      <td className="p-4">{parent?.name ?? 'Top level'}</td>
                    )}
                    <td className="p-4">{item._count.products}</td>
                    <td className="p-4">
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => setEditing(item)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={!canDelete}
                          title={
                            !canDelete
                              ? 'Remove products and child categories first'
                              : undefined
                          }
                          onClick={() => setDeleting(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <AdminDialog
          title={`${editing === 'new' ? 'Add' : 'Edit'} ${noun}`}
          onClose={() => setEditing(null)}
        >
          <form
            className="admin-taxonomy-form"
            onSubmit={save}
            onInvalidCapture={(event) => {
              if (
                event.currentTarget.querySelector(':invalid') !== event.target
              )
                return;
              toast.error(`Check ${noun} details`, {
                description: 'Enter a name with at least two characters.',
                id: 'taxonomy-form-invalid',
              });
            }}
          >
            {message && (
              <p className="admin-feedback" role="status">
                {message}
              </p>
            )}
            <label>
              Name
              <input
                className="field"
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={editing === 'new' ? '' : editing.name}
                autoFocus
              />
            </label>
            <label>
              Description
              <textarea
                className="field"
                name="description"
                rows={3}
                maxLength={500}
                defaultValue={
                  editing === 'new' ? '' : (editing.description ?? '')
                }
              />
            </label>
            {isCategory && (
              <label>
                Parent category
                <select
                  className="field"
                  name="parentId"
                  defaultValue={
                    editing === 'new'
                      ? ''
                      : ((editing as Category).parentId ?? '')
                  }
                >
                  <option value="">Top level</option>
                  {items
                    .filter(
                      (item) => editing === 'new' || item.id !== editing.id,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <p className="admin-dialog-intro">
              The URL slug is generated from the name automatically.
            </p>
            <div className="admin-dialog-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="button" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
      {deleting && (
        <AdminDialog
          title={`Delete ${noun}?`}
          onClose={() => setDeleting(null)}
        >
          <p>Delete “{deleting.name}”? This cannot be undone.</p>
          <div className="admin-dialog-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={remove}
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
