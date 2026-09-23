'use client';

import {
  ArrowSquareOut,
  Buildings,
  ChartBar,
  ClockCounterClockwise,
  List,
  Package,
  SquaresFour,
  SignOut,
  Users,
  X,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { csrfFetch } from '@/components/auth-forms';
import { AdminToaster } from '@/components/admin-toaster';

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
};
type AccessState = 'loading' | 'ready' | 'denied' | 'error';

const sections = [
  { href: '/admin', label: 'Overview', icon: ChartBar },
  { href: '/admin/catalog', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: SquaresFour },
  { href: '/admin/brands', label: 'Brands', icon: Buildings },
  { href: '/admin/users', label: 'Customers', icon: Users },
  { href: '/admin/audit', label: 'Audit history', icon: ClockCounterClockwise },
];

async function currentUser(): Promise<Response> {
  let response = await fetch('/api/backend/users/me', {
    credentials: 'include',
  });
  if (response.status === 401) {
    try {
      const refreshed = await csrfFetch('/auth/refresh', {
        method: 'POST',
        body: '{}',
      });
      if (refreshed.ok) {
        response = await fetch('/api/backend/users/me', {
          credentials: 'include',
        });
      }
    } catch {
      // An unavailable API is handled by the error state below.
    }
  }
  return response;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const isLogin = pathname === '/admin/login';

  function closeMenu(restoreFocus = false) {
    setMenuOpen(false);
    if (restoreFocus) menuButton.current?.focus();
  }

  useEffect(() => {
    if (isLogin) return;
    let active = true;
    currentUser()
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          const requested = `${pathname}${window.location.search}`;
          router.replace(`/admin/login?next=${encodeURIComponent(requested)}`);
          return;
        }
        if (!response.ok) {
          setAccess('error');
          return;
        }
        const account = (await response.json()) as AdminUser;
        if (!active) return;
        if (account.role !== 'ADMIN') {
          setAccess('denied');
          return;
        }
        setUser(account);
        setAccess('ready');
      })
      .catch(() => {
        if (active) setAccess('error');
      });
    return () => {
      active = false;
    };
  }, [isLogin, pathname, router]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  async function logout() {
    setLoggingOut(true);
    try {
      await csrfFetch('/auth/logout', { method: 'POST', body: '{}' });
    } finally {
      setLoggingOut(false);
      router.replace('/admin/login');
      router.refresh();
    }
  }

  if (isLogin) return children;
  if (access === 'loading')
    return (
      <main className="admin-gate" role="status">
        Checking administrator access…
      </main>
    );
  if (access === 'denied')
    return (
      <main className="admin-gate">
        <span className="eyebrow">Access denied</span>
        <h1>Administrator access required</h1>
        <p>
          This account does not have permission to open the admin workspace.
        </p>
        <Link className="button" href="/">
          Return to storefront
        </Link>
      </main>
    );
  if (access === 'error')
    return (
      <main className="admin-gate" role="alert">
        <span className="eyebrow">Connection unavailable</span>
        <h1>Could not check access</h1>
        <p>Check that the API is running, then try again.</p>
        <button
          className="button"
          type="button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </main>
    );

  const activeSection =
    sections.find((section) => section.href === pathname) ??
    (pathname.startsWith('/admin/catalog/') ? sections[1] : sections[0]);

  return (
    <div className="admin-app">
      <AdminToaster />
      {menuOpen && (
        <button
          className="admin-scrim"
          aria-label="Close navigation"
          onClick={() => closeMenu(true)}
        />
      )}
      <aside
        className={`admin-sidebar${menuOpen ? ' is-open' : ''}`}
        aria-label="Admin sidebar"
      >
        <div className="admin-sidebar-heading">
          <Link
            href="/admin"
            className="admin-brand"
            onClick={() => closeMenu()}
          >
            <span className="wordmark-mark" aria-hidden="true">
              e
            </span>
            <span>
              <strong>E-commerce</strong>
              <small>Admin workspace</small>
            </span>
          </Link>
          <button
            className="admin-mobile-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => closeMenu(true)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="admin-sidebar-group-label">Workspace</div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {sections.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/admin/catalog'
                ? pathname.startsWith(href)
                : pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={() => closeMenu()}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/" onClick={() => closeMenu()}>
            <ArrowSquareOut size={18} aria-hidden="true" /> View storefront
          </Link>
          <button type="button" onClick={logout} disabled={loggingOut}>
            <SignOut size={18} aria-hidden="true" />{' '}
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              ref={menuButton}
              className="admin-menu-toggle"
              type="button"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <List size={21} />
            </button>
            <div>
              <span>Operations / {activeSection.label}</span>
              <strong>{activeSection.label}</strong>
            </div>
          </div>
          <div className="admin-user">
            <span aria-hidden="true">
              {user?.fullName?.charAt(0).toUpperCase() ?? 'A'}
            </span>
            <div>
              <strong>{user?.fullName}</strong>
              <small>Administrator</small>
            </div>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
