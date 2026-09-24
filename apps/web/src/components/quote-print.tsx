'use client';

import { useEffect, useState } from 'react';
import { Quote, commerceFetch } from '@/lib/commerce-api';
import { formatEtb } from '@/lib/catalog';

export function QuotePrintClient({ id }: { id: string }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  useEffect(() => {
    void commerceFetch<Quote>(`/quotes/${id}`).then(setQuote);
  }, [id]);
  if (!quote)
    return <main className="quote-print-page">Loading quotation…</main>;
  return (
    <main className="quote-print-page">
      <div className="quote-print-toolbar">
        <button className="button" type="button" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>
      <header>
        <span className="eyebrow">E-commerce B2B</span>
        <h1>Quotation {quote.quoteNumber}</h1>
        <p>{quote.rfq?.reference}</p>
      </header>
      <section>
        <div className="quote-print-lines">
          {quote.items.map((item) => (
            <div key={item.id}>
              <span>
                <strong>{item.productName}</strong>
                <small>
                  {item.variantName} · {item.quantity} {item.unit}
                </small>
              </span>
              <span>{formatEtb(item.lineSubtotal)}</span>
            </div>
          ))}
        </div>
        {quote.adjustments.map((item) => (
          <div className="quote-print-adjustment" key={item.id}>
            <span>{item.label}</span>
            <span>
              {item.kind === 'DISCOUNT' ? '-' : '+'}
              {formatEtb(item.amount)}
            </span>
          </div>
        ))}
        <div className="quote-print-total">
          <strong>Total</strong>
          <strong>{formatEtb(quote.grandTotal)}</strong>
        </div>
      </section>
      <footer>
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
      </footer>
    </main>
  );
}
