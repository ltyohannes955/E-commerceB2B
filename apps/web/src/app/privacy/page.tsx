import { SiteShell } from '@/components/site-shell';
export default function PrivacyPage() {
  return (
    <SiteShell>
      <div className="shell section">
        <article className="dashboard-panel max-w-3xl">
          <span className="eyebrow">Draft policy</span>
          <h1>Privacy notice</h1>
          <p className="text-[var(--muted)]">
            This Phase 1 page is a development placeholder. Replace it with
            reviewed privacy language before public launch.
          </p>
          <h2>Information we use</h2>
          <p className="text-[var(--muted)]">
            The account foundation stores your name, email, optional phone
            number, security records, and activity needed to operate and protect
            the platform.
          </p>
          <h2>Your choices</h2>
          <p className="text-[var(--muted)]">
            You can update your profile and password from your account area.
            Final retention, deletion, and support procedures will be published
            before launch.
          </p>
        </article>
      </div>
    </SiteShell>
  );
}
