import { SiteShell } from '@/components/site-shell';
import { RfqDetailClient } from '@/components/commerce-pages';

export default async function AccountRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SiteShell>
      <main className="shell page-shell">
        <RfqDetailClient id={id} />
      </main>
    </SiteShell>
  );
}
