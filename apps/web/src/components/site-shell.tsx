'use client';

import {
  ArrowUpRight,
  CaretDown,
  List,
  SignOut,
  UserCircle,
  X,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function SiteShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    fetch('/api/backend/users/me', { credentials: 'include' })
      .then((response) => {
        if (active) setIsAuthenticated(response.ok);
      })
      .catch(() => {
        if (active) setIsAuthenticated(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      const csrf = await fetch('/api/backend/auth/csrf', {
        credentials: 'include',
      }).then((response) => response.json());

      await fetch('/api/backend/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrf.csrfToken,
        },
        body: '{}',
      });
    } finally {
      setIsAuthenticated(false);
      setLoggingOut(false);
      router.replace('/login');
      router.refresh();
    }
  }

  function renderAccountActions(mobile: boolean) {
    if (isAuthenticated === null) return null;

    if (!isAuthenticated) {
      return (
        <>
          <Link href="/login">Log in</Link>
          <Link
            href="/sign-up"
            className={mobile ? 'button' : 'button button-small'}
          >
            Create account <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </>
      );
    }

    return (
      <details className={mobile ? 'w-full' : 'relative'}>
        <summary
          className={[
            'flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-[0.65rem] px-3 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--panel)]',
            '[&::-webkit-details-marker]:hidden',
            mobile ? 'w-full justify-between' : '',
          ].join(' ')}
        >
          <span className="flex items-center gap-2">
            <UserCircle size={19} aria-hidden="true" />
            My account
          </span>
          <CaretDown size={14} aria-hidden="true" />
        </summary>

        <div
          className={
            mobile
              ? 'mt-2 grid gap-1 rounded-[0.8rem] border border-[var(--line)] bg-[var(--panel)] p-2'
              : 'absolute right-0 top-[calc(100%+0.5rem)] z-40 grid w-48 gap-1 rounded-[0.8rem] border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_18px_45px_#0b1f331a]'
          }
        >
          <Link
            href="/account/profile"
            className="flex min-h-11 items-center gap-2 rounded-[0.6rem] px-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)]"
          >
            <UserCircle size={18} aria-hidden="true" />
            Profile
          </Link>
          <button
            type="button"
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[0.6rem] border-0 bg-transparent px-3 text-left text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)] disabled:cursor-wait disabled:opacity-60"
            disabled={loggingOut}
            onClick={logout}
          >
            <SignOut size={18} aria-hidden="true" />
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </details>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <header className="site-header">
        <div className="shell flex h-20 items-center justify-between">
          <Link href="/" className="wordmark">
            <span className="wordmark-mark" aria-hidden="true">
              e
            </span>
            <span>E-commerce B2B</span>
          </Link>

          <nav
            className="site-nav hidden items-center md:flex"
            aria-label="Primary navigation"
          >
            <Link href="/#explore">Explore products</Link>
            <Link href="/how-it-works">How it works</Link>
            {renderAccountActions(false)}
          </nav>

          <details className="mobile-menu md:hidden">
            <summary
              className="icon-button"
              aria-label="Open menu"
              aria-controls="mobile-navigation"
            >
              <List className="menu-open-icon" size={20} aria-hidden="true" />
              <X className="menu-close-icon" size={20} aria-hidden="true" />
            </summary>
            <div id="mobile-navigation" className="mobile-nav">
              <nav
                className="shell mobile-nav-links"
                aria-label="Mobile navigation"
              >
                <Link href="/#explore">Explore products</Link>
                <Link href="/how-it-works">How it works</Link>
                {renderAccountActions(true)}
              </nav>
            </div>
          </details>
        </div>
      </header>

      <main>{children}</main>
      <footer className="border-t border-[var(--line)] py-8">
        <div className="shell flex flex-col gap-4 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>Built for confident cross-border buying.</span>
          <div className="flex gap-5">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
