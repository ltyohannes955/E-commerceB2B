'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteShell } from '@/components/site-shell';
import { csrfFetch, PasswordField } from '@/components/auth-forms';

type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
};
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch('/api/backend/users/me', { credentials: 'include' }).then(
      async (r) => {
        if (!r.ok) {
          router.replace('/login?next=%2Faccount%2Fprofile');
          return;
        }
        setUser(await r.json());
      },
    );
  }, [router]);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const response = await csrfFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: form.get('fullName'),
        phone: form.get('phone') || null,
        email: form.get('email'),
        currentPassword: form.get('currentPassword') || undefined,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.detail ?? 'Could not save profile.');
      return;
    }
    setUser(await response.json());
    setSaved(true);
    setError('');
  }
  return (
    <SiteShell>
      <div className="shell dashboard">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">Your account</span>
            <h1>Profile</h1>
            <p className="text-[var(--muted)]">Keep your essentials current.</p>
          </div>
          <Link
            className="button button-secondary button-small"
            href="/account/security"
          >
            Security
          </Link>
        </div>
        {user && (
          <section className="dashboard-panel max-w-2xl">
            <form className="form-stack" onSubmit={save}>
              <label>
                Full name
                <input name="fullName" defaultValue={user.fullName} required />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  required
                />
                <span className="field-hint">
                  Changing email requires your current password.
                </span>
              </label>
              <label>
                Phone (optional)
                <input
                  name="phone"
                  defaultValue={user.phone ?? ''}
                  placeholder="+251…"
                />
              </label>
              <PasswordField
                label="Current password"
                name="currentPassword"
                autoComplete="current-password"
                required={false}
              />
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {saved && (
                <p className="form-success" role="status">
                  Profile saved.
                </p>
              )}
              <button className="button">Save changes</button>
            </form>
          </section>
        )}
      </div>
    </SiteShell>
  );
}
