import { AdminTaxonomy } from '@/components/admin-taxonomy';

export default function AdminCategoriesPage() {
  return (
    <section className="section">
      <div className="shell">
        <AdminTaxonomy kind="categories" />
      </div>
    </section>
  );
}
