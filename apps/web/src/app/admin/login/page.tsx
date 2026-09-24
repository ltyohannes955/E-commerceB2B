import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { AuthForm } from '@/components/auth-forms';

export default function AdminLoginPage() {
  return (
    <main className="admin-login-page">
      <div className="admin-login-brand">
        <Link href="/" className="wordmark" aria-label="E-commerce B2B home">
          <span className="wordmark-mark" aria-hidden="true">
            e
          </span>
          <span className="wordmark-copy">
            <strong>E-commerce</strong>
            <small>Operations</small>
          </span>
        </Link>
        <Link href="/" className="admin-login-back">
          <ArrowLeft size={17} aria-hidden="true" /> Back to storefront
        </Link>
      </div>
      <div className="admin-login-content">
        <div className="admin-login-intro">
          <span className="admin-login-emblem">
            <ShieldCheck size={26} aria-hidden="true" />
          </span>
          <p className="eyebrow">Operations access</p>
          <h1>Admin sign in</h1>
          <p>
            Manage the catalog, customer accounts, and activity from one
            workspace.
          </p>
        </div>
        <div className="admin-login-card">
          <h2>Welcome back</h2>
          <p>Use your administrator account to continue.</p>
          <Suspense fallback={null}>
            <AuthForm mode="login" audience="admin" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
