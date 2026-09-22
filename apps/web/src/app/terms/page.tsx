import { SiteShell } from '@/components/site-shell';
export default function TermsPage() {
  return (
    <SiteShell>
      <div className="shell section">
        <article className="dashboard-panel max-w-3xl">
          <span className="eyebrow">Draft policy</span>
          <h1>Terms of use</h1>
          <p className="text-[var(--muted)]">
            This Phase 1 page is a development placeholder. Replace it with
            reviewed legal terms before public launch.
          </p>
          <h2>Using the platform</h2>
          <p className="text-[var(--muted)]">
            Use this account to access the platform’s early buying experience.
            Do not use it for unlawful activity or to misrepresent another
            person or business.
          </p>
          <h2>Contact</h2>
          <p className="text-[var(--muted)]">
            The platform owner will publish support and dispute details before
            launch.
          </p>
        </article>
      </div>
    </SiteShell>
  );
}
