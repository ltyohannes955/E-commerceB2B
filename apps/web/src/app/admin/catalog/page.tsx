import { SiteShell } from '@/components/site-shell';
import { AdminCatalogList } from '@/components/admin-catalog';
export default function AdminCatalogPage() {
  return (
    <SiteShell>
      <section className="section">
        <div className="shell">
          <AdminCatalogList />
        </div>
      </section>
    </SiteShell>
  );
}
