import { AuthForm } from '@/components/auth-forms';
import { SiteShell } from '@/components/site-shell';
import { Suspense } from 'react';
export default function LoginPage() {
  return (
    <SiteShell>
      <div className="shell form-page">
        <section className="form-card">
          <span className="eyebrow">Welcome back</span>
          <h1>Log in</h1>
          <p>Pick up where you left off with your buying workspace.</p>
          <Suspense fallback={null}>
            <AuthForm mode="login" />
          </Suspense>
        </section>
      </div>
    </SiteShell>
  );
}
