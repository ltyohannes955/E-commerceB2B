import { SiteShell } from '@/components/site-shell';
import { ProductEditor } from '@/components/admin-catalog';
export default function NewProductPage() {
  return (
    <SiteShell>
      <section className="section">
        <div className="shell">
          <ProductEditor />
        </div>
      </section>
    </SiteShell>
  );
}
