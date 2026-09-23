import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './auth-forms';

const replace = vi.fn();
const refresh = vi.fn();
let nextPath: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => ({ get: () => nextPath }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  nextPath = null;
});

function mockLogin(role: 'CUSTOMER' | 'ADMIN') {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ csrfToken: 'token' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ role }) }),
  );
}

async function submitLogin() {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'buyer@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'long-password' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: /log in|sign in to admin/i }),
  );
}

describe('AuthForm redirects', () => {
  it('returns a customer to the requested storefront page', async () => {
    nextPath = '/products?sort=newest';
    mockLogin('CUSTOMER');
    render(<AuthForm mode="login" />);
    await submitLogin();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/products?sort=newest'),
    );
  });

  it('takes an admin to the requested admin page', async () => {
    nextPath = '/admin/catalog';
    mockLogin('ADMIN');
    render(<AuthForm mode="login" audience="admin" />);
    await submitLogin();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/catalog'));
  });

  it('sends a customer using the admin form to the storefront', async () => {
    nextPath = '/admin/users';
    mockLogin('CUSTOMER');
    render(<AuthForm mode="login" audience="admin" />);
    await submitLogin();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('keeps new customer registration headed to the profile', async () => {
    mockLogin('CUSTOMER');
    render(<AuthForm mode="register" />);
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'New Buyer' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'buyer@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'long-password' },
    });
    for (const checkbox of screen.getAllByRole('checkbox'))
      fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/account/profile'),
    );
  });
});
