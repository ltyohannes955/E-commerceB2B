import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

vi.mock('next/navigation', () => ({
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
        name: /Find the next thing your business needs/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Explore categories/i }),
    ).toBeTruthy();
  });
});
