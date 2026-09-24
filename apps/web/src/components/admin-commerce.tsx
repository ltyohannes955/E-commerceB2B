'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { commerceFetch, commerceMutate, Quote, Rfq } from '@/lib/commerce-api';
import { formatEtb } from '@/lib/catalog';

type AdminRfq = Rfq & {
  user?: { fullName: string; email: string };
  assignedAdmin?: { fullName: string } | null;
};

function moneyCents(value: string | number | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function AdminRfqList() {
  const [items, setItems] = useState<AdminRfq[] | null>(null);
  useEffect(() => {
    void commerceFetch<{ items: AdminRfq[] }>('/admin/rfqs?pageSize=50')
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, []);
  if (!items) return <div className="admin-gate">Loading RFQs…</div>;
  return (
    <section className="admin-section">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">Commerce / requests</span>
          <h1>Quote requests</h1>
          <p>Review customer sourcing requests and prepare quotations.</p>
        </div>
      </div>
      <div className="admin-data-list">
        {items.length ? (
          items.map((rfq) => (
            <Link
              className="admin-data-row"
              href={`/admin/rfqs/${rfq.id}`}
              key={rfq.id}
            >
              <div>
                <strong>{rfq.reference}</strong>
                <span>{rfq.title}</span>
              </div>
              <div>
                <span>{rfq.user?.fullName}</span>
                <small>{rfq.status.replaceAll('_', ' ')}</small>
              </div>
            </Link>
          ))
        ) : (
          <div className="empty-state">No quote requests yet.</div>
        )}
      </div>
    </section>
  );
}

export function AdminRfqDetail({ id }: { id: string }) {
  const [rfq, setRfq] = useState<AdminRfq | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void commerceFetch<AdminRfq>(`/admin/rfqs/${id}`)
      .then(setRfq)
      .catch(() => undefined);
  }, [id]);
  if (!rfq) return <div className="admin-gate">Loading request…</div>;
  const currentRfq = rfq;
  async function prepareQuote() {
    setBusy(true);
    try {
      const created = await commerceMutate<Quote>(`/admin/rfqs/${id}/quotes`, {
        method: 'POST',
        body: JSON.stringify({
          items: currentRfq.items.map((item) => ({
            rfqItemId: item.id,
            quantity: item.adjustedQuantity ?? item.requestedQuantity,
            unitPrice: '0.00',
          })),
          estimatedLeadTimeDays: 14,
          paymentTerms: 'To be confirmed',
          expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        }),
      });
      setQuote(created);
      toast.success('Draft quotation created');
    } catch (cause) {
      toast.error('Could not create quotation', {
        description:
          cause instanceof Error
            ? cause.message
            : 'Complete the request first.',
      });
    } finally {
      setBusy(false);
    }
  }
  async function updateStatus(status: string) {
    setBusy(true);
    try {
      setRfq(
        await commerceMutate<AdminRfq>(`/admin/rfqs/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, version: currentRfq.version }),
        }),
      );
      toast.success('Request status updated');
    } catch (cause) {
      toast.error('Status update failed', {
        description:
          cause instanceof Error
            ? cause.message
            : 'Please refresh and try again.',
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-section">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">{rfq.reference}</span>
          <h1>{rfq.title}</h1>
          <p>
            {rfq.user?.fullName} · {rfq.user?.email}
          </p>
        </div>
        <Link className="button button-secondary" href="/admin/rfqs">
          Back to RFQs
        </Link>
      </div>
      <div className="admin-commerce-grid">
        <div className="admin-card">
          <h2>Requested items</h2>
          {rfq.items.map((item) => (
            <div className="admin-data-row" key={item.id}>
              <div>
                <strong>{item.productName}</strong>
                <span>
                  {item.variantName} · {item.sku}
                </span>
              </div>
              <div>
                <span>
                  {item.adjustedQuantity ?? item.requestedQuantity} {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
        <aside className="admin-card">
          <span className="status-pill">{rfq.status.replaceAll('_', ' ')}</span>
          <label>
            Status
            <select
              className="field"
              value={rfq.status}
              disabled={busy}
              onChange={(event) => void updateStatus(event.target.value)}
            >
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="QUOTED">Quoted</option>
            </select>
          </label>
          <button
            className="button button-wide"
            disabled={busy || rfq.status === 'CANCELLED'}
            onClick={() => void prepareQuote()}
          >
            Prepare quotation
          </button>
          {quote && (
            <Link className="quote-callout" href={`/admin/quotes/${quote.id}`}>
              <strong>{quote.quoteNumber}</strong>
              <span>Draft · {formatEtb(quote.grandTotal)}</span>
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}

export function AdminQuoteList() {
  const [items, setItems] = useState<Quote[] | null>(null);
  useEffect(() => {
    void commerceFetch<{ items: Quote[] }>('/admin/quotes?pageSize=50')
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, []);
  if (!items) return <div className="admin-gate">Loading quotations…</div>;
  return (
    <section className="admin-section">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">Commerce / quotations</span>
          <h1>Quotations</h1>
          <p>Track drafts, sent revisions, and customer decisions.</p>
        </div>
      </div>
      <div className="admin-data-list">
        {items.length ? (
          items.map((quote) => (
            <Link
              className="admin-data-row"
              href={`/admin/quotes/${quote.id}`}
              key={quote.id}
            >
              <div>
                <strong>{quote.quoteNumber}</strong>
                <span>{quote.rfq?.reference}</span>
              </div>
              <div>
                <span>{formatEtb(quote.grandTotal)}</span>
                <small>{quote.status}</small>
              </div>
            </Link>
          ))
        ) : (
          <div className="empty-state">No quotations yet.</div>
        )}
      </div>
    </section>
  );
}

export function AdminQuoteDetail({ id }: { id: string }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState('');
  useEffect(() => {
    void commerceFetch<Quote>(`/admin/quotes/${id}`)
      .then((data) => {
        setQuote(data);
        setPrices(
          Object.fromEntries(
            data.items.map((item) => [item.id, item.unitPrice]),
          ),
        );
      })
      .catch(() => undefined);
  }, [id]);
  if (!quote) return <div className="admin-gate">Loading quotation…</div>;
  const draftSubtotalCents = quote.items.reduce(
    (total, item) =>
      total +
      moneyCents(prices[item.id] ?? item.unitPrice) *
        Math.max(item.quantity, 0),
    0,
  );
  const draftAdjustmentCents = quote.adjustments.reduce((total, adjustment) => {
    const amount = moneyCents(adjustment.amount);
    return total + (adjustment.kind === 'DISCOUNT' ? -amount : amount);
  }, 0);
  const draftGrandTotal = (draftSubtotalCents + draftAdjustmentCents) / 100;

  async function persistDraft() {
    if (!quote) return null;
    const next = await commerceMutate<Quote>(`/admin/quotes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        version: quote.version,
        items: quote.items.map((item) => ({
          rfqItemId: item.rfqItemId,
          quantity: item.quantity,
          unitPrice: prices[item.id] ?? item.unitPrice,
        })),
        adjustments: quote.adjustments.map((item) => ({
          kind: item.kind,
          label: item.label,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
        estimatedLeadTimeDays: quote.estimatedLeadTimeDays,
        paymentTerms: quote.paymentTerms,
        expiresAt: quote.expiresAt,
        customerNotes: quote.customerNotes,
        internalNotes: quote.internalNotes,
      }),
    });
    setQuote(next);
    setPrices(
      Object.fromEntries(next.items.map((item) => [item.id, item.unitPrice])),
    );
    return next;
  }

  async function send() {
    if (!quote) return;
    const missingPrice = quote.items.some(
      (item) => Number(prices[item.id] ?? item.unitPrice) <= 0,
    );
    if (missingPrice) {
      setValidationError(
        'Enter a positive unit price for every line before sending the quotation.',
      );
      toast.error('Quotation is missing prices', {
        description: 'Review the highlighted unit price fields.',
      });
      return;
    }
    setValidationError('');
    setBusy(true);
    try {
      // Persist the values currently in the form before sending. This keeps
      // the send action safe even when the admin skips the separate Save draft
      // button.
      const saved = await persistDraft();
      if (!saved) return;
      const sent = await commerceMutate<Quote>(`/admin/quotes/${id}/send`, {
        method: 'POST',
      });
      setQuote(sent);
      setPrices(
        Object.fromEntries(sent.items.map((item) => [item.id, item.unitPrice])),
      );
      toast.success('Quotation sent');
    } catch (cause) {
      const error = cause as Error & {
        issues?: Array<{ field: string; message: string }>;
      };
      const detail = error.issues?.map((issue) => issue.message).join(' ');
      setValidationError(
        detail || error.message || 'Check the required fields.',
      );
      toast.error('Could not send quotation', {
        description: detail || error.message || 'Check the required fields.',
      });
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!quote) return;
    setValidationError('');
    setBusy(true);
    try {
      await persistDraft();
      toast.success('Quotation draft saved');
    } catch (cause) {
      toast.error('Could not save quotation', {
        description:
          cause instanceof Error ? cause.message : 'Refresh and try again.',
      });
    } finally {
      setBusy(false);
    }
  }
  async function revise() {
    setBusy(true);
    try {
      setQuote(
        await commerceMutate<Quote>(`/admin/quotes/${id}/revise`, {
          method: 'POST',
        }),
      );
      toast.success('Revision draft created');
    } catch {
      toast.error('Could not create revision');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-section">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">{quote.quoteNumber}</span>
          <h1>Quotation builder</h1>
          <p>
            {quote.rfq?.reference} · {quote.rfq?.user?.fullName}
          </p>
        </div>
        <Link className="button button-secondary" href="/admin/quotes">
          Back to quotations
        </Link>
      </div>
      <div className="admin-card admin-quote-sheet">
        {validationError && (
          <p className="form-error" role="alert">
            {validationError}
          </p>
        )}
        <div className="admin-quote-lines">
          {quote.items.map((item) => (
            <div className="admin-data-row" key={item.id}>
              <div>
                <strong>{item.productName}</strong>
                <span>
                  {item.variantName} · {item.quantity} {item.unit}
                </span>
              </div>
              {quote.status === 'DRAFT' ? (
                <label>
                  Unit price
                  <input
                    className={`field${Number(prices[item.id] ?? item.unitPrice) <= 0 ? ' field-error' : ''}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices[item.id] ?? item.unitPrice}
                    aria-invalid={
                      Number(prices[item.id] ?? item.unitPrice) <= 0
                    }
                    onChange={(event) =>
                      setPrices((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : (
                <strong>{formatEtb(item.lineSubtotal)}</strong>
              )}
            </div>
          ))}
        </div>
        <div className="quote-total">
          <span>Total</span>
          <strong>{formatEtb(draftGrandTotal)}</strong>
        </div>
        <div className="admin-action-row">
          {quote.status === 'DRAFT' && (
            <>
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() => void save()}
              >
                Save draft
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => void send()}
              >
                Send quotation
              </button>
            </>
          )}
          {['SENT', 'DECLINED', 'EXPIRED'].includes(quote.status) && (
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => void revise()}
            >
              Create revision
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
