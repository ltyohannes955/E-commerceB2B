import { SiteShell } from '@/components/site-shell';
import { RfqListClient } from '@/components/commerce-pages';

export default function AccountRfqsPage() {
  return (
    <SiteShell>
      <main className="shell page-shell">
        <RfqListClient />
      </main>
    </SiteShell>
  );
}
