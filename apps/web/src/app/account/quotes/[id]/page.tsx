import { SiteShell } from '@/components/site-shell';
import { QuoteDetailClient } from '@/components/commerce-pages';

export default async function AccountQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SiteShell>
      <main className="shell page-shell">
        <QuoteDetailClient id={id} />
      </main>
    </SiteShell>
  );
}
