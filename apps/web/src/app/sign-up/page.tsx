import { AuthForm } from '@/components/auth-forms';
import { SiteShell } from '@/components/site-shell';
import { Suspense } from 'react';
export default function SignUpPage() {
  return (
    <SiteShell>
      <div className="shell form-page">
        <section className="form-card">
          <span className="eyebrow">Join the platform</span>
          <h1>Create your account</h1>
          <p>
            Start with the basics. You can add optional contact details later.
          </p>
          <Suspense fallback={null}>
            <AuthForm mode="register" />
          </Suspense>
        </section>
      </div>
    </SiteShell>
  );
}
