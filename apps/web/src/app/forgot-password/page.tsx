import { PasswordResetForm } from '@/components/auth-forms';
import { SiteShell } from '@/components/site-shell';
export default function ForgotPasswordPage() {
  return (
    <SiteShell>
      <div className="shell form-page">
        <section className="form-card">
          <span className="eyebrow">Account recovery</span>
          <h1>Reset your password</h1>
          <p>Enter your email and we’ll help you get back into your account.</p>
          <PasswordResetForm />
        </section>
      </div>
    </SiteShell>
  );
}
