import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('Home page', () => {
  it('renders the public storefront shell', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', {
        name: /Stock your next order with less back and forth/i,
      }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: /Browse products/i })).toBeTruthy();
  });
});
