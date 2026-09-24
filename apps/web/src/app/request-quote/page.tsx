import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { NewRfqForm, RfqListClient } from '@/components/commerce-pages';

export default function RequestQuotePage() {
  return (
    <SiteShell>
      <main className="shell page-shell">
        <NewRfqForm />
        <RfqListClient />
        <p className="form-footnote">
          <Link href="/products">
            Browse products to add items to a request.
          </Link>
        </p>
      </main>
    </SiteShell>
  );
}
