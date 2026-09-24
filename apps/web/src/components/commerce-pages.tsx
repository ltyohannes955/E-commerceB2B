'use client';

/* API-served image URLs are intentionally left unoptimized. */
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  commerceFetch,
  commerceMutate,
  imageSrc,
  Cart,
  Rfq,
  Quote,
} from '@/lib/commerce-api';
import { formatEtb } from '@/lib/catalog';

function Loading() {
  return (
    <div className="empty-state" role="status">
      Loading…
    </div>
  );
}
function ErrorState({ message }: { message: string }) {
  return (
    <div className="empty-state" role="alert">
      {message}
    </div>
  );
}

export function NewRfqForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const rfq = await commerceMutate<Rfq>('/rfqs', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim() }),
      });
      toast.success('Draft request created');
      router.push(`/account/rfqs/${rfq.id}`);
    } catch (cause) {
      toast.error('Could not create request', {
        description:
          cause instanceof Error ? cause.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="commerce-card new-rfq-card" id="new-request">
      <div>
        <span className="eyebrow">Start a request</span>
        <h2>What are you sourcing?</h2>
        <p>
          Give this draft a name so you can return to it as you collect
          products.
        </p>
      </div>
      <form className="inline-form" onSubmit={create}>
        <label className="sr-only" htmlFor="rfq-title">
          Request title
        </label>
        <input
          id="rfq-title"
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Office fit-out, Q4 packaging"
          required
          maxLength={120}
        />
        <button className="button" disabled={busy}>
          {busy ? 'Creating…' : 'Create draft'}
        </button>
      </form>
    </section>
  );
}

export function CartClient() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [moveItem, setMoveItem] = useState<string | null>(null);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  async function load() {
    try {
      setCart(await commerceFetch<Cart>('/cart'));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to load your cart.',
      );
    }
  }
  useEffect(() => {
    // Loading private data is an external synchronization effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  async function update(id: string, quantity: number) {
    setBusy(id);
    try {
      setCart(
        await commerceMutate<Cart>(`/cart/items/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity }),
        }),
      );
    } catch (cause) {
      toast.error('Cart update failed', {
        description:
          cause instanceof Error ? cause.message : 'Please try again.',
      });
    } finally {
      setBusy(null);
    }
  }
  async function remove(id: string) {
    if (!window.confirm('Remove this item from your cart?')) return;
    setBusy(id);
    try {
      setCart(
        await commerceMutate<Cart>(`/cart/items/${id}`, { method: 'DELETE' }),
      );
    } catch {
      toast.error('Could not remove item');
    } finally {
      setBusy(null);
    }
  }
  async function clear() {
    if (!window.confirm('Clear every item from your cart?')) return;
    setBusy('cart');
    try {
      setCart(await commerceMutate<Cart>('/cart', { method: 'DELETE' }));
      toast.success('Cart cleared');
    } catch (cause) {
      toast.error('Could not clear cart', {
        description:
          cause instanceof Error ? cause.message : 'Please try again.',
      });
    } finally {
      setBusy(null);
    }
  }
  async function openMove(id: string) {
    setMoveItem(id);
    try {
      const data = await commerceFetch<{ items: Rfq[] }>('/rfqs?pageSize=50');
      setRfqs(data.items.filter((item) => item.status === 'DRAFT'));
    } catch {
      setRfqs([]);
    }
  }
  async function move(id?: string) {
    if (!moveItem) return;
    setBusy(moveItem);
    try {
      setCart(
        await commerceMutate<Cart>(`/cart/items/${moveItem}/move-to-rfq`, {
          method: 'POST',
          body: JSON.stringify(
            id ? { rfqId: id } : { title: 'Cart quote request' },
          ),
        }),
      );
      setMoveItem(null);
      toast.success('Item moved to quote request');
    } catch (cause) {
      toast.error('Could not move item', {
        description:
          cause instanceof Error ? cause.message : 'Please try again.',
      });
    } finally {
      setBusy(null);
    }
  }
  if (!cart && !error) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!cart?.items.length)
    return (
      <div className="empty-state">
        <h2>Your cart is empty</h2>
        <p>Browse the catalog and add products for direct purchase.</p>
        <Link className="button" href="/products">
          Browse products
        </Link>
      </div>
    );
  return (
    <div className="commerce-workspace">
      <div className="commerce-heading">
        <div>
          <span className="eyebrow">Purchasing workspace</span>
          <h1>Your cart</h1>
          <p>{cart.itemCount} items ready for review.</p>
        </div>
        <Link className="button button-secondary" href="/products">
          Continue sourcing
        </Link>
      </div>
      <div className="commerce-grid">
        <section className="commerce-list" aria-label="Cart items">
          {cart.items.map((item) => (
            <article
              className={`commerce-line${item.available ? '' : ' is-unavailable'}`}
              key={item.id}
            >
              {imageSrc(item.imageSrc) ? (
                <img
                  src={imageSrc(item.imageSrc)!}
                  alt=""
                  width="88"
                  height="88"
                />
              ) : (
                <div className="commerce-line-image" aria-hidden="true" />
              )}
              <div className="commerce-line-main">
                <div>
                  <strong>{item.productName}</strong>
                  <span>
                    {item.variantName} · SKU {item.sku}
                  </span>
                </div>
                {item.priceChanged && (
                  <p className="inline-warning" role="alert">
                    Price changed from {formatEtb(item.previousUnitPrice)} to{' '}
                    {formatEtb(item.currentUnitPrice)}.
                  </p>
                )}
                {!item.available && (
                  <p className="inline-warning" role="alert">
                    This item is no longer available at the selected quantity.
                  </p>
                )}
                <div className="commerce-line-controls">
                  <label>
                    Quantity
                    <input
                      className="field"
                      type="number"
                      min="1"
                      value={item.quantity}
                      disabled={busy === item.id}
                      onChange={(event) =>
                        void update(
                          item.id,
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                    />
                  </label>
                  <span>
                    {formatEtb(item.currentUnitPrice ?? item.unitPriceSnapshot)}{' '}
                    / {item.unit}
                  </span>
                  <strong>{formatEtb(item.subtotal)}</strong>
                </div>
                <div className="commerce-line-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => void remove(item.id)}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => void openMove(item.id)}
                  >
                    Move to RFQ
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
        <aside className="commerce-summary">
          <span className="eyebrow">Cart summary</span>
          <div>
            <span>Subtotal</span>
            <strong>{formatEtb(cart.subtotal)}</strong>
          </div>
          <p>Delivery and checkout will be added in Phase 4.</p>
          <button
            className="text-button"
            type="button"
            disabled={busy === 'cart'}
            onClick={() => void clear()}
          >
            Clear cart
          </button>
          <button className="button button-wide" disabled>
            Checkout coming next phase
          </button>
        </aside>
      </div>
      {moveItem && (
        <dialog open className="commerce-dialog">
          <div className="dialog-heading">
            <h2>Move to a quote request</h2>
            <button
              className="icon-button"
              type="button"
              onClick={() => setMoveItem(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p>Choose an existing draft or create a new request.</p>
          <div className="rfq-draft-options">
            <button
              className="draft-option"
              type="button"
              onClick={() => void move()}
            >
              <strong>New quote request</strong>
              <span>Create a new draft from this item</span>
            </button>
            {rfqs.map((rfq) => (
              <button
                className="draft-option"
                type="button"
                key={rfq.id}
                onClick={() => void move(rfq.id)}
              >
                <strong>{rfq.title}</strong>
                <span>{rfq.reference}</span>
              </button>
            ))}
          </div>
        </dialog>
      )}
    </div>
  );
}

export function RfqListClient() {
  const [items, setItems] = useState<Rfq[] | null>(null);
  const [status, setStatus] = useState('');
  useEffect(() => {
    void commerceFetch<{ items: Rfq[] }>(
      `/rfqs?pageSize=50${status ? `&status=${status}` : ''}`,
    )
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, [status]);
  if (!items) return <Loading />;
  return (
    <div className="commerce-workspace">
      <div className="commerce-heading">
        <div>
          <span className="eyebrow">Customer workspace</span>
          <h1>Quote requests</h1>
          <p>Keep separate sourcing requests for different projects.</p>
        </div>
        <Link className="button" href="/request-quote#new-request">
          New request
        </Link>
      </div>
      <div className="filter-bar">
        <label>
          Status
          <select
            className="field"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All requests</option>
            <option value="DRAFT">Drafts</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="QUOTED">Quoted</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
      </div>
      {items.length ? (
        <div className="commerce-card-list">
          {items.map((rfq) => (
            <Link
              className="commerce-card"
              href={`/account/rfqs/${rfq.id}`}
              key={rfq.id}
            >
              <div>
                <span className="status-pill">
                  {rfq.status.replaceAll('_', ' ')}
                </span>
                <h2>{rfq.title}</h2>
                <p>
                  {rfq.reference} · {rfq.items.length} items
                </p>
              </div>
              <strong>View request →</strong>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No requests yet</h2>
          <p>Use Request a quote on a product to start one.</p>
        </div>
      )}
    </div>
  );
}

export function QuoteListClient() {
  const [items, setItems] = useState<Quote[] | null>(null);
  useEffect(() => {
    void commerceFetch<{ items: Quote[] }>('/quotes?pageSize=50')
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, []);
  if (!items) return <Loading />;
  return (
    <div className="commerce-workspace">
      <div className="commerce-heading">
        <div>
          <span className="eyebrow">Customer workspace</span>
          <h1>Quotations</h1>
          <p>Review current and past commercial offers.</p>
        </div>
        <Link className="button button-secondary" href="/account/rfqs">
          View quote requests
        </Link>
      </div>
      {items.length ? (
        <div className="commerce-card-list">
          {items.map((quote) => (
            <Link
              className="commerce-card"
              href={`/account/quotes/${quote.id}`}
              key={quote.id}
            >
              <div>
                <span className="status-pill">{quote.status}</span>
                <h2>{quote.quoteNumber}</h2>
                <p>
                  {quote.rfq?.reference} · Revision {quote.revision}
                </p>
              </div>
              <strong>{formatEtb(quote.grandTotal)} →</strong>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No quotations yet</h2>
          <p>
            Submitted quote requests will appear here when an administrator
            responds.
          </p>
        </div>
      )}
    </div>
  );
}

export function RfqDetailClient({ id }: { id: string }) {
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void commerceFetch<Rfq>(`/rfqs/${id}`)
      .then(setRfq)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : 'Unable to load request.',
        ),
      );
  }, [id]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rfq) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      setRfq(
        await commerceMutate<Rfq>(`/rfqs/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: form.get('title'),
            message: form.get('message'),
            deliveryCity: form.get('deliveryCity'),
            deliveryTimeframe: form.get('deliveryTimeframe'),
            preferredContact: form.get('preferredContact'),
            version: rfq.version,
          }),
        }),
      );
      toast.success('Request saved');
    } catch (cause) {
      toast.error('Could not save request', {
        description:
          cause instanceof Error ? cause.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!rfq) return;
    setBusy(true);
    try {
      setRfq(
        await commerceMutate<Rfq>(`/rfqs/${id}/submit`, {
          method: 'POST',
          body: JSON.stringify({ version: rfq.version }),
        }),
      );
      toast.success('Quote request submitted');
    } catch (cause) {
      toast.error('Could not submit request', {
        description:
          cause instanceof Error ? cause.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }
  if (error) return <ErrorState message={error} />;
  if (!rfq) return <Loading />;
  const editable = rfq.status === 'DRAFT';
  return (
    <div className="commerce-workspace">
      <div className="commerce-heading">
        <div>
          <span className="eyebrow">{rfq.reference}</span>
          <h1>{rfq.title}</h1>
          <span className="status-pill">{rfq.status.replaceAll('_', ' ')}</span>
        </div>
        <Link className="button button-secondary" href="/account/rfqs">
          Back to requests
        </Link>
      </div>
      <div className="commerce-grid">
        <section className="commerce-list">
          <h2>Requested items</h2>
          {rfq.items.map((item) => (
            <article className="commerce-line" key={item.id}>
              <div className="commerce-line-main">
                <strong>{item.productName}</strong>
                <span>
                  {item.variantName} · SKU {item.sku}
                </span>
                <div className="commerce-line-controls">
                  <span>
                    Requested {item.requestedQuantity} {item.unit}
                  </span>
                  {item.adjustedQuantity ? (
                    <span>
                      Adjusted {item.adjustedQuantity} {item.unit}
                    </span>
                  ) : null}
                </div>
                {item.note && <p>{item.note}</p>}
              </div>
            </article>
          ))}
          <h2>Status history</h2>
          <ol className="timeline">
            {rfq.statusHistory.map((entry, index) => (
              <li key={`${entry.createdAt}-${index}`}>
                <strong>{entry.toStatus.replaceAll('_', ' ')}</strong>
                <span>{new Date(entry.createdAt).toLocaleString()}</span>
                {entry.note && <p>{entry.note}</p>}
              </li>
            ))}
          </ol>
        </section>
        <aside className="commerce-summary">
          {editable ? (
            <form className="form-stack" onSubmit={save}>
              <label>
                Request title
                <input
                  className="field"
                  name="title"
                  defaultValue={rfq.title}
                  required
                />
              </label>
              <label>
                General message
                <textarea
                  className="field"
                  name="message"
                  defaultValue={rfq.message ?? ''}
                />
              </label>
              <label>
                Delivery city
                <input
                  className="field"
                  name="deliveryCity"
                  defaultValue={rfq.deliveryCity ?? ''}
                />
              </label>
              <label>
                Delivery timeframe
                <input
                  className="field"
                  name="deliveryTimeframe"
                  defaultValue={rfq.deliveryTimeframe ?? ''}
                />
              </label>
              <label>
                Preferred contact
                <input
                  className="field"
                  name="preferredContact"
                  defaultValue={rfq.preferredContact ?? ''}
                />
              </label>
              <button className="button button-wide" disabled={busy}>
                Save draft
              </button>
              <button
                className="button button-secondary button-wide"
                type="button"
                disabled={busy || !rfq.items.length}
                onClick={() => void submit()}
              >
                Submit request
              </button>
            </form>
          ) : (
            <p>We will update this request as it moves through review.</p>
          )}
          {rfq.quotes?.map((quote) => (
            <Link
              className="quote-callout"
              href={`/account/quotes/${quote.id}`}
              key={quote.id}
            >
              <strong>{quote.quoteNumber}</strong>
              <span>
                {quote.status} · {formatEtb(quote.grandTotal)}
              </span>
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}

export function QuoteDetailClient({ id }: { id: string }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void commerceFetch<Quote>(`/quotes/${id}`)
      .then(setQuote)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : 'Unable to load quotation.',
        ),
      );
  }, [id]);
  async function action(path: string, body?: unknown) {
    setBusy(true);
    try {
      setQuote(
        await commerceMutate<Quote>(`/quotes/${id}/${path}`, {
          method: 'POST',
          body: JSON.stringify(body ?? {}),
        }),
      );
      toast.success(
        path === 'accept' ? 'Quotation accepted' : 'Quotation updated',
      );
    } catch (cause) {
      toast.error('Quotation action failed', {
        description:
          cause instanceof Error ? cause.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }
  if (error) return <ErrorState message={error} />;
  if (!quote) return <Loading />;
  return (
    <div className="commerce-workspace">
      <div className="commerce-heading">
        <div>
          <span className="eyebrow">{quote.quoteNumber}</span>
          <h1>Quotation</h1>
          <span className="status-pill">{quote.status}</span>
        </div>
        <div className="commerce-heading-actions">
          <Link
            className="button button-secondary"
            href={`/account/quotes/${id}/print`}
          >
            Print quotation
          </Link>
          <Link className="button button-secondary" href="/account/rfqs">
            Back to requests
          </Link>
        </div>
      </div>
      <section className="quote-sheet">
        <div className="quote-lines">
          {quote.items.map((item) => (
            <div className="quote-line" key={item.id}>
              <div>
                <strong>{item.productName}</strong>
                <span>
                  {item.variantName} · {item.quantity} {item.unit}
                </span>
              </div>
              <span>{formatEtb(item.unitPrice)}</span>
              <strong>{formatEtb(item.lineSubtotal)}</strong>
            </div>
          ))}
        </div>
        <div className="quote-adjustments">
          {quote.adjustments.map((item) => (
            <div key={item.id}>
              <span>{item.label}</span>
              <span
                className={item.kind === 'DISCOUNT' ? 'price-discount' : ''}
              >
                {item.kind === 'DISCOUNT' ? '-' : '+'}
                {formatEtb(item.amount)}
              </span>
            </div>
          ))}
        </div>
        <div className="quote-total">
          <span>Total</span>
          <strong>{formatEtb(quote.grandTotal)}</strong>
        </div>
        <div className="quote-meta">
          <span>
            Lead time:{' '}
            {quote.estimatedLeadTimeDays
              ? `${quote.estimatedLeadTimeDays} days`
              : 'On request'}
          </span>
          <span>Payment terms: {quote.paymentTerms ?? 'To be confirmed'}</span>
          <span>
            Expires:{' '}
            {quote.expiresAt
              ? new Date(quote.expiresAt).toLocaleDateString()
              : 'Not set'}
          </span>
        </div>
        {quote.status === 'SENT' && (
          <div className="quote-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => void action('accept')}
            >
              Accept quotation
            </button>
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() =>
                void action('decline', {
                  reason: 'Customer declined this quotation.',
                })
              }
            >
              Decline
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
