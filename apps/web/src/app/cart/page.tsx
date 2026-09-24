import { SiteShell } from '@/components/site-shell';
import { CartClient } from '@/components/commerce-pages';

export default function CartPage() {
  return (
    <SiteShell>
      <main className="shell page-shell">
        <CartClient />
      </main>
    </SiteShell>
  );
}
