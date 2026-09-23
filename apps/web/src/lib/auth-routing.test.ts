import { describe, expect, it } from 'vitest';
import { afterLoginPath, safeReturnPath } from './auth-routing';

describe('login destinations', () => {
  it('returns customers to a local storefront route or the home page', () => {
    expect(afterLoginPath('CUSTOMER', '/products?q=lighting')).toBe(
      '/products?q=lighting',
    );
    expect(afterLoginPath('CUSTOMER', null)).toBe('/');
    expect(afterLoginPath('CUSTOMER', '/admin/catalog')).toBe('/');
  });

  it('returns administrators to a protected admin route or the overview', () => {
    expect(afterLoginPath('ADMIN', '/admin/catalog/products/new')).toBe(
      '/admin/catalog/products/new',
    );
    expect(afterLoginPath('ADMIN', '/products')).toBe('/admin');
    expect(afterLoginPath('ADMIN', '/admin/login')).toBe('/admin');
  });

  it.each([
    'https://outside.example',
    '//outside.example',
    '/\\outside.example',
    'javascript:alert(1)',
    '/%5coutside.example',
  ])('rejects an unsafe return URL: %s', (destination) =>
    expect(safeReturnPath(destination, 'CUSTOMER')).toBeNull(),
  );
});
