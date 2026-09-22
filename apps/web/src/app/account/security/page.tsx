'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { csrfFetch, PasswordField } from '@/components/auth-forms';

export default function SecurityPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const response = await csrfFetch('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({
        currentPassword: form.get('currentPassword'),
        newPassword: form.get('newPassword'),
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.detail ?? 'Could not update password.');
      return;
    }
    setError('');
    setMessage('Password updated. All other sessions were signed out.');
    (e.target as HTMLFormElement).reset();
  }
  async function logout() {
    await csrfFetch('/auth/logout', { method: 'POST', body: '{}' });
    router.push('/login');
  }
  return (
    <SiteShell>
      <div className="shell dashboard">
        <div className="mb-8">
          <span className="eyebrow">Your account</span>
          <h1>Security</h1>
          <p className="text-[var(--muted)]">
            Update your password or end this session.
          </p>
        </div>
        <section className="dashboard-panel max-w-2xl">
          <form className="form-stack" onSubmit={submit}>
            <PasswordField
              label="Current password"
              name="currentPassword"
              autoComplete="current-password"
            />
            <PasswordField
              label="New password"
              name="newPassword"
              minLength={8}
              autoComplete="new-password"
              hint="At least 8 characters."
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="form-success" role="status">
                {message}
              </p>
            )}
            <button className="button">Change password</button>
          </form>
          <hr className="my-7 border-[var(--line)]" />
          <button
            type="button"
            className="button button-secondary"
            onClick={logout}
          >
            Log out
          </button>
        </section>
        <Link
          href="/account/profile"
          className="mt-5 inline-block text-sm text-[var(--muted)]"
        >
          ← Back to profile
        </Link>
      </div>
    </SiteShell>
  );
}
