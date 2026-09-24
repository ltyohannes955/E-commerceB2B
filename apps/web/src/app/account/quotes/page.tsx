import { SiteShell } from '@/components/site-shell';
import { QuoteListClient } from '@/components/commerce-pages';

export default function AccountQuotesPage() {
  return (
    <SiteShell>
      <main className="shell page-shell">
        <QuoteListClient />
      </main>
    </SiteShell>
  );
}
