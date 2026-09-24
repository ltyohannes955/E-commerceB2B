import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminShell } from './admin-shell';

const replace = vi.fn();
let pathname = '/admin';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace, refresh: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  pathname = '/admin';
});

describe('AdminShell', () => {
  it('shows the admin navigation after verifying an administrator', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: '1',
          fullName: 'Platform Admin',
          role: 'ADMIN',
        }),
      }),
    );
    render(
      <AdminShell>
        <h1>Admin overview</h1>
      </AdminShell>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Admin overview' }),
    ).toBeVisible();
    expect(
      screen.getByRole('navigation', { name: 'Admin navigation' }),
    ).toHaveTextContent('Products');
    expect(
      screen.getByRole('navigation', { name: 'Admin navigation' }),
    ).toHaveTextContent('Customers');
  });

  it('sends signed-out visitors to the admin login', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ status: 401 })
        .mockResolvedValueOnce({ json: async () => ({ csrfToken: 'token' }) })
        .mockResolvedValueOnce({ ok: false }),
    );
    render(
      <AdminShell>
        <h1>Protected</h1>
      </AdminShell>,
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/admin/login?next=%2Fadmin'),
    );
    expect(screen.queryByRole('heading', { name: 'Protected' })).toBeNull();
  });

  it('shows a permission state for a customer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '2', fullName: 'Customer', role: 'CUSTOMER' }),
      }),
    );
    render(
      <AdminShell>
        <h1>Protected</h1>
      </AdminShell>,
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Administrator access required',
      }),
    ).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Protected' })).toBeNull();
  });

  it('renders the separate login page without an admin check', () => {
    pathname = '/admin/login';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(
      <AdminShell>
        <h1>Admin sign in</h1>
      </AdminShell>,
    );
    expect(
      screen.getByRole('heading', { name: 'Admin sign in' }),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
