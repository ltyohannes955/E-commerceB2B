'use client';

import {
  ArrowRight,
  CaretDown,
  MagnifyingGlass,
  ShoppingBagOpen,
  SignOut,
  UserCircle,
  List,
  X,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function SiteShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(pathname || '/')}`;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function openLogin(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const current = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?next=${encodeURIComponent(current)}`);
  }

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

  function accountActions(mobile = false) {
    if (isAuthenticated === null) return null;
    if (!isAuthenticated) {
      return (
        <div
          className={
            mobile ? 'mobile-account-actions' : 'header-account-actions'
          }
        >
          <Link href={loginHref} onClick={openLogin} className="header-login">
            Log in
          </Link>
          <Link href="/sign-up" className="button button-small">
            Create account <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      );
    }
    return (
      <details
        className={mobile ? 'mobile-account-details' : 'account-details'}
      >
        <summary className="account-summary">
          <UserCircle size={19} aria-hidden="true" />
          <span>My account</span>
          <CaretDown size={14} aria-hidden="true" />
        </summary>
        <div className="account-menu">
          <Link href="/account/profile">
            <UserCircle size={17} aria-hidden="true" /> Profile
          </Link>
          <button type="button" onClick={logout} disabled={loggingOut}>
            <SignOut size={17} aria-hidden="true" />{' '}
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </details>
    );
  }

  return (
    <div className="storefront-app">
      <header className="site-header commerce-header">
        <div className="shell commerce-header-main">
          <Link href="/" className="wordmark" aria-label="E-commerce B2B home">
            <span className="wordmark-mark" aria-hidden="true">
              e
            </span>
            <span className="wordmark-copy">
              <strong>E-commerce</strong>
              <small>B2B sourcing</small>
            </span>
          </Link>
          <form className="header-search" action="/search" role="search">
            <MagnifyingGlass size={19} aria-hidden="true" />
            <input
              name="q"
              placeholder="Search products, brands, or SKUs"
              aria-label="Search catalog"
            />
            <kbd>/</kbd>
          </form>
          <div className="header-actions">
            {accountActions()}
            <button
              className="bag-button"
              type="button"
              disabled
              title="Cart arrives in Phase 3"
            >
              <ShoppingBagOpen size={20} aria-hidden="true" />
              <span>Cart</span>
              <em>Phase 3</em>
            </button>
          </div>
          <details className="mobile-menu">
            <summary
              className="icon-button"
              aria-label="Open menu"
              aria-controls="mobile-navigation"
            >
              <List className="menu-open-icon" size={21} aria-hidden="true" />
              <X className="menu-close-icon" size={21} aria-hidden="true" />
            </summary>
            <div id="mobile-navigation" className="mobile-nav">
              <form className="mobile-search" action="/search" role="search">
                <MagnifyingGlass size={18} aria-hidden="true" />
                <input
                  name="q"
                  placeholder="Search the catalog"
                  aria-label="Search catalog"
                />
              </form>
              <nav className="mobile-nav-links" aria-label="Mobile navigation">
                <Link href="/products">All products</Link>
                <Link href="/categories/industrial-equipment">Categories</Link>
                <Link href="/brands/lumaforge">Brands</Link>
                <Link href="/how-it-works">How it works</Link>
                {accountActions(true)}
              </nav>
            </div>
          </details>
        </div>
        <nav className="shell commerce-nav" aria-label="Primary navigation">
          <Link href="/products">All products</Link>
          <Link href="/categories/industrial-equipment">
            Industrial equipment
          </Link>
          <Link href="/categories/lighting-electrical">
            Lighting & electrical
          </Link>
          <Link href="/categories/office-retail">Office & retail</Link>
          <Link href="/categories/hospitality-essentials">
            Hospitality essentials
          </Link>
          <Link href="/brands/lumaforge">Browse brands</Link>
          <Link href="/how-it-works" className="nav-secondary">
            How it works
          </Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="storefront-footer">
        <div className="shell footer-grid">
          <div>
            <Link href="/" className="wordmark">
              <span className="wordmark-mark" aria-hidden="true">
                e
              </span>
              <span className="wordmark-copy">
                <strong>E-commerce</strong>
                <small>B2B sourcing</small>
              </span>
            </Link>
            <p>
              Clearer purchasing for businesses importing from Dubai to
              Ethiopia.
            </p>
          </div>
          <div>
            <strong>Catalog</strong>
            <Link href="/products">All products</Link>
            <Link href="/search">Search</Link>
            <Link href="/how-it-works">How it works</Link>
          </div>
          <div>
            <strong>Account</strong>
            <Link href={loginHref} onClick={openLogin}>
              Log in
            </Link>
            <Link href="/sign-up">Create account</Link>
            <Link href="/terms">Terms & privacy</Link>
            <Link href="/admin/login">Admin sign in</Link>
          </div>
        </div>
        <div className="shell footer-bottom">
          <span>Built for confident cross-border buying.</span>
          <span>© {new Date().getFullYear()} E-commerce B2B</span>
        </div>
      </footer>
    </div>
  );
}
