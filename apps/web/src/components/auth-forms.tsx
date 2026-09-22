/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export async function csrfFetch(path: string, init: RequestInit = {}) {
  const csrf = await fetch('/api/backend/auth/csrf', {
    credentials: 'include',
  }).then((r) => r.json());
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  headers.set('x-csrf-token', csrf.csrfToken);
  return fetch(`/api/backend${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
}

type PasswordFieldProps = {
  label: string;
  name: string;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
  hint?: string;
};

export function PasswordField({
  label,
  name,
  autoComplete,
  minLength = 8,
  required = true,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <label>
      {label}
      <span className="password-input">
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeSlash size={19} aria-hidden="true" />
          ) : (
            <Eye size={19} aria-hidden="true" />
          )}
        </button>
      </span>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const body: any =
      mode === 'register'
        ? {
            fullName: form.get('fullName'),
            email: form.get('email'),
            password: form.get('password'),
            termsAccepted: form.get('terms') === 'on',
            privacyAccepted: form.get('privacy') === 'on',
          }
        : { email: form.get('email'), password: form.get('password') };
    try {
      const response = await csrfFetch(
        `/auth/${mode === 'register' ? 'register' : 'login'}`,
        { method: 'POST', body: JSON.stringify(body) },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail ?? 'Unable to complete request.');
      }
      router.push('/account/profile');
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to complete request.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      {mode === 'register' && (
        <label>
          Full name
          <input name="fullName" required minLength={2} autoComplete="name" />
        </label>
      )}
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <PasswordField
        label="Password"
        name="password"
        minLength={8}
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        hint="At least 8 characters."
      />
      {mode === 'register' && (
        <div className="consent-stack">
          <label className="checkbox-label">
            <input name="terms" type="checkbox" required />{' '}
            <span>
              I accept the <a href="/terms">draft Terms</a>.
            </span>
          </label>
          <label className="checkbox-label">
            <input name="privacy" type="checkbox" required />{' '}
            <span>
              I accept the <a href="/privacy">draft Privacy notice</a>.
            </span>
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button button-wide" disabled={busy}>
        {busy ? 'Working…' : mode === 'register' ? 'Create account' : 'Log in'}
      </button>
      {mode === 'login' ? (
        <p className="form-footnote">
          <a href="/forgot-password">Forgot your password?</a>
        </p>
      ) : (
        <p className="form-footnote">
          Already have an account? <a href="/login">Log in</a>
        </p>
      )}
    </form>
  );
}

export function PasswordResetForm() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const email = new FormData(event.currentTarget).get('email');
    const response = await csrfFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (!response.ok) setError('Unable to request a reset right now.');
    else setMessage('If an account exists, reset instructions will be sent.');
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-wide">Send reset link</button>
    </form>
  );
}
