'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { SiteShell } from '@/components/site-shell';
import { csrfFetch, PasswordField } from '@/components/auth-forms';

export default function ResetPasswordClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get('password');
    const response = await csrfFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: params.get('token'), password }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.detail ?? 'This reset link is invalid or expired.');
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/login'), 1200);
  }
  return (
    <SiteShell>
      <div className="shell form-page">
        <section className="form-card">
          <span className="eyebrow">Account recovery</span>
          <h1>Choose a new password</h1>
          <p>
            Use at least 8 characters. You’ll need to log in again after
            resetting it.
          </p>
          {done ? (
            <p className="form-success" role="status">
              Password updated. Redirecting to log in…
            </p>
          ) : (
            <form onSubmit={submit} className="form-stack">
              <PasswordField
                label="New password"
                name="password"
                minLength={8}
                autoComplete="new-password"
                hint="At least 8 characters."
              />
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="button button-wide">Update password</button>
            </form>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
