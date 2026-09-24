import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminCatalogError, adminCatalogRequest } from './admin-catalog-api';

afterEach(() => vi.unstubAllGlobals());

describe('adminCatalogRequest', () => {
  it('keeps section-addressable publication errors from the API', async () => {
    const issues = [
      { field: 'images', message: 'A primary image is required.' },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'Complete the highlighted sections.',
          errors: issues,
        }),
      }),
    );

    await expect(
      adminCatalogRequest('/admin/products/product-1'),
    ).rejects.toMatchObject({
      message: 'Complete the highlighted sections.',
      issues,
    } satisfies Partial<AdminCatalogError>);
  });
});
