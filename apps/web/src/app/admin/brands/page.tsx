import { AdminTaxonomy } from '@/components/admin-taxonomy';

export default function AdminBrandsPage() {
  return (
    <section className="section">
      <div className="shell">
        <AdminTaxonomy kind="brands" />
      </div>
    </section>
  );
}
