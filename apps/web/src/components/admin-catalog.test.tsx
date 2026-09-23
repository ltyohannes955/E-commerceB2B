import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { AdminCatalogList } from './admin-catalog';
import { AdminTaxonomy } from './admin-taxonomy';
import {
  AdminCatalogError,
  adminCatalogRequest,
} from '@/lib/admin-catalog-api';

vi.mock('@/lib/admin-catalog-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin-catalog-api')>()),
  adminCatalogRequest: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const request = vi.mocked(adminCatalogRequest);

afterEach(() => vi.clearAllMocks());

describe('admin catalog dialogs', () => {
  it('creates a product draft inside a dialog with its required category', async () => {
    request.mockImplementation(async (path, init) => {
      if (path === '/admin/products?pageSize=100')
        return { items: [] } as never;
      if (path === '/admin/categories')
        return [
          { id: 'category-1', name: 'Equipment', parentId: null },
        ] as never;
      if (path === '/admin/brands') return [] as never;
      if (path === '/admin/products' && init?.method === 'POST')
        return { id: 'product-1', name: 'Pump', images: [] } as never;
      if (path === '/admin/products/product-1')
        return { id: 'product-1', name: 'Pump', images: [] } as never;
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminCatalogList />);
    fireEvent.click(await screen.findByRole('button', { name: 'New product' }));
    expect(
      await screen.findByRole('dialog', { name: 'New product' }),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Pump' },
    });
    fireEvent.change(screen.getByLabelText('Internal SKU'), {
      target: { value: 'PUMP-1' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'category-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        '/admin/products',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"categoryId":"category-1"'),
        }),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Product draft created',
        expect.any(Object),
      ),
    );
  });

  it('creates categories from the dedicated admin dialog', async () => {
    request.mockImplementation(async (path, init) => {
      if (path === '/admin/categories' && init?.method === 'POST')
        return { id: 'category-1' } as never;
      if (path === '/admin/categories') return [] as never;
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminTaxonomy kind="categories" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Add category' }),
    );
    expect(screen.getByRole('dialog', { name: 'Add category' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Industrial equipment' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        '/admin/categories',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('uploads images selected while creating after the draft receives an ID', async () => {
    const image = new File(['image bytes'], 'pump.png', { type: 'image/png' });
    const saved = {
      id: 'product-1',
      name: 'Pump',
      status: 'DRAFT',
      categoryId: 'category-1',
      images: [],
    };
    request.mockImplementation(async (path, init) => {
      if (path === '/admin/products?pageSize=100')
        return { items: [] } as never;
      if (path === '/admin/categories')
        return [{ id: 'category-1', name: 'Equipment' }] as never;
      if (path === '/admin/brands') return [] as never;
      if (path === '/admin/products' && init?.method === 'POST')
        return saved as never;
      if (
        path === '/admin/products/product-1/images' &&
        init?.method === 'POST'
      )
        return { id: 'image-1' } as never;
      if (path === '/admin/products/product-1')
        return {
          ...saved,
          images: [{ id: 'image-1', altText: 'Pump', isPrimary: true }],
        } as never;
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminCatalogList />);
    fireEvent.click(await screen.findByRole('button', { name: 'New product' }));
    const fileInput = await screen.findByLabelText('Choose images');
    fireEvent.change(fileInput, { target: { files: [image] } });
    expect(screen.getByText('pump.png')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Pump' },
    });
    fireEvent.change(screen.getByLabelText('Internal SKU'), {
      target: { value: 'PUMP-1' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'category-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        '/admin/products/product-1/images',
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
      ),
    );
    const upload = request.mock.calls.find(
      ([path, init]) =>
        path === '/admin/products/product-1/images' && init?.method === 'POST',
    );
    expect((upload?.[1]?.body as FormData).get('file')).toBe(image);
    expect(await screen.findByRole('img', { name: 'Pump' })).toHaveAttribute(
      'src',
      '/api/backend/product-images/image-1',
    );
  });

  it('renders existing admin images when an older response has no src', async () => {
    request.mockImplementation(async (path) => {
      if (path === '/admin/products?pageSize=100')
        return { items: [] } as never;
      if (path === '/admin/categories')
        return [{ id: 'category-1', name: 'Equipment' }] as never;
      if (path === '/admin/brands') return [] as never;
      if (path === '/admin/products/product-1')
        return {
          id: 'product-1',
          name: 'Pump',
          status: 'DRAFT',
          categoryId: 'category-1',
          images: [{ id: 'image-1', altText: 'Pump front', isPrimary: true }],
        } as never;
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminCatalogList initialProduct="product-1" />);
    expect(
      await screen.findByRole('img', { name: 'Pump front' }),
    ).toHaveAttribute('src', '/api/backend/product-images/image-1');
  });

  it('keeps failed creation uploads available to retry without creating another product', async () => {
    let uploadAttempts = 0;
    const image = new File(['image bytes'], 'pump.png', { type: 'image/png' });
    const saved = {
      id: 'product-1',
      name: 'Pump',
      status: 'DRAFT',
      categoryId: 'category-1',
      images: [],
    };
    request.mockImplementation(async (path, init) => {
      if (path === '/admin/products?pageSize=100')
        return { items: [] } as never;
      if (path === '/admin/categories')
        return [{ id: 'category-1', name: 'Equipment' }] as never;
      if (path === '/admin/brands') return [] as never;
      if (path === '/admin/products' && init?.method === 'POST')
        return saved as never;
      if (
        path === '/admin/products/product-1/images' &&
        init?.method === 'POST'
      ) {
        uploadAttempts += 1;
        if (uploadAttempts === 1) throw new Error('Upload failed');
        return { id: 'image-1' } as never;
      }
      if (path === '/admin/products/product-1')
        return {
          ...saved,
          images:
            uploadAttempts > 1
              ? [{ id: 'image-1', altText: 'Pump', isPrimary: true }]
              : [],
        } as never;
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminCatalogList />);
    fireEvent.click(await screen.findByRole('button', { name: 'New product' }));
    fireEvent.change(await screen.findByLabelText('Choose images'), {
      target: { files: [image] },
    });
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Pump' },
    });
    fireEvent.change(screen.getByLabelText('Internal SKU'), {
      target: { value: 'PUMP-1' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'category-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry uploads' }),
    );
    expect(await screen.findByRole('img', { name: 'Pump' })).toBeVisible();
    expect(
      request.mock.calls.filter(
        ([path, init]) => path === '/admin/products' && init?.method === 'POST',
      ),
    ).toHaveLength(1);
  });

  it('saves current fields before publishing and links to validation failures', async () => {
    const draft = {
      id: 'product-1',
      name: 'Pump',
      internalSku: 'PUMP-1',
      status: 'DRAFT',
      categoryId: 'category-1',
      countryOfOrigin: 'AE',
      unit: 'piece',
      minimumOrderQuantity: 1,
      saleMode: 'RFQ_ONLY',
      priceVisibility: 'HIDE_PRICE',
      images: [],
    };
    request.mockImplementation(async (path, init) => {
      if (path === '/admin/products?pageSize=100')
        return { items: [] } as never;
      if (path === '/admin/categories')
        return [{ id: 'category-1', name: 'Equipment' }] as never;
      if (path === '/admin/brands') return [] as never;
      if (path === '/admin/products/product-1' && !init?.method)
        return draft as never;
      if (path === '/admin/products/product-1' && init?.method === 'PATCH')
        return draft as never;
      if (path === '/admin/products/product-1/status')
        throw new AdminCatalogError('Complete the highlighted sections.', [
          {
            field: 'merchandising.leadTime',
            message: 'Lead time is required.',
          },
        ]);
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminCatalogList initialProduct="product-1" />);
    expect(
      await screen.findByRole('button', { name: 'Publish' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Choose images')).toHaveClass('sr-only');
    expect(screen.getAllByText('Choose images')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Lead time (days)'), {
      target: { value: '14' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(
      await screen.findByRole('link', { name: 'Lead time is required.' }),
    ).toHaveAttribute('href', '#product-sales');
    expect(toast.error).toHaveBeenCalledWith(
      'Could not publish product',
      expect.objectContaining({ description: 'Lead time is required.' }),
    );
    const calls = request.mock.calls;
    const saveIndex = calls.findIndex(
      ([path, init]) =>
        path === '/admin/products/product-1' && init?.method === 'PATCH',
    );
    const publishIndex = calls.findIndex(
      ([path]) => path === '/admin/products/product-1/status',
    );
    expect(saveIndex).toBeGreaterThanOrEqual(0);
    expect(publishIndex).toBeGreaterThan(saveIndex);
    expect(calls[saveIndex][1]?.body).toContain('"leadTimeDays":14');
  });

  it('uses a labeled duplicate action in the product table', async () => {
    request.mockResolvedValue({
      items: [
        {
          id: 'product-1',
          name: 'Pump',
          internalSku: 'PUMP-1',
          status: 'DRAFT',
          saleMode: 'RFQ_ONLY',
        },
      ],
    } as never);
    render(<AdminCatalogList />);
    expect(
      await screen.findByRole('button', { name: 'Duplicate draft' }),
    ).toBeVisible();
  });

  it('publishes a saved draft and can return it to draft status', async () => {
    let currentStatus = 'DRAFT';
    const product = {
      id: 'product-1',
      name: 'Pump',
      internalSku: 'PUMP-1',
      categoryId: 'category-1',
      countryOfOrigin: 'AE',
      unit: 'piece',
      minimumOrderQuantity: 1,
      saleMode: 'RFQ_ONLY',
      priceVisibility: 'HIDE_PRICE',
      images: [{ id: 'image-1', altText: 'Pump', isPrimary: true }],
    };
    request.mockImplementation(async (path, init) => {
      if (path === '/admin/products?pageSize=100')
        return { items: [{ ...product, status: currentStatus }] } as never;
      if (path === '/admin/categories')
        return [{ id: 'category-1', name: 'Equipment' }] as never;
      if (path === '/admin/brands') return [] as never;
      if (path === '/admin/products/product-1')
        return { ...product, status: currentStatus } as never;
      if (path === '/admin/products/product-1/status') {
        currentStatus = JSON.parse(String(init?.body)).status as string;
        return { ...product, status: currentStatus } as never;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminCatalogList initialProduct="product-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    expect(
      await screen.findByRole('button', { name: 'Unpublish' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(
      await screen.findByRole('button', { name: 'Publish' }),
    ).toBeVisible();
    expect(
      request.mock.calls
        .filter(([path]) => path === '/admin/products/product-1/status')
        .map(([, init]) => JSON.parse(String(init?.body)).status),
    ).toEqual(['PUBLISHED', 'DRAFT']);
  });

  it('creates a new product, uploads its selected image, then publishes', async () => {
    const file = new File(['image bytes'], 'pump.png', { type: 'image/png' });
    const draft = {
      id: 'product-1',
      name: 'Pump',
      internalSku: 'PUMP-1',
      status: 'DRAFT',
      categoryId: 'category-1',
      images: [],
    };
    request.mockImplementation(async (path, init) => {
      if (path === '/admin/products?pageSize=100')
        return { items: [] } as never;
      if (path === '/admin/categories')
        return [{ id: 'category-1', name: 'Equipment' }] as never;
      if (path === '/admin/brands') return [] as never;
      if (path === '/admin/products' && init?.method === 'POST')
        return draft as never;
      if (path === '/admin/products/product-1/images')
        return { id: 'image-1' } as never;
      if (path === '/admin/products/product-1')
        return {
          ...draft,
          images: [{ id: 'image-1', altText: 'Pump', isPrimary: true }],
        } as never;
      if (path === '/admin/products/product-1/status')
        return { ...draft, status: 'PUBLISHED', images: [] } as never;
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminCatalogList />);
    fireEvent.click(await screen.findByRole('button', { name: 'New product' }));
    fireEvent.change(await screen.findByLabelText('Choose images'), {
      target: { files: [file] },
    });
    fireEvent.change(screen.getByLabelText('Product name'), {
      target: { value: 'Pump' },
    });
    fireEvent.change(screen.getByLabelText('Internal SKU'), {
      target: { value: 'PUMP-1' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'category-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(
      await screen.findByText(
        'Product published and visible in the storefront.',
      ),
    ).toBeVisible();
    expect(toast.success).toHaveBeenCalledWith(
      'Product published',
      expect.any(Object),
    );
    const paths = request.mock.calls.map(([path]) => path);
    expect(paths.indexOf('/admin/products')).toBeLessThan(
      paths.indexOf('/admin/products/product-1/images'),
    );
    expect(paths.indexOf('/admin/products/product-1/images')).toBeLessThan(
      paths.indexOf('/admin/products/product-1/status'),
    );
  });

  it('includes hybrid thresholds and visible pricing in the saved draft', async () => {
    request.mockImplementation(async (path, init) => {
      if (path === '/admin/products?pageSize=100')
        return { items: [] } as never;
      if (path === '/admin/categories')
        return [{ id: 'category-1', name: 'Equipment' }] as never;
      if (path === '/admin/brands') return [] as never;
      if (path === '/admin/products' && init?.method === 'POST')
        return {
          id: 'product-1',
          name: 'Pump',
          status: 'DRAFT',
          images: [],
        } as never;
      if (path === '/admin/products/product-1')
        return {
          id: 'product-1',
          name: 'Pump',
          status: 'DRAFT',
          images: [],
        } as never;
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminCatalogList />);
    fireEvent.click(await screen.findByRole('button', { name: 'New product' }));
    fireEvent.change(await screen.findByLabelText('Product name'), {
      target: { value: 'Pump' },
    });
    fireEvent.change(screen.getByLabelText('Internal SKU'), {
      target: { value: 'PUMP-1' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'category-1' },
    });
    fireEvent.change(screen.getByLabelText('Sale mode'), {
      target: { value: 'HYBRID' },
    });
    fireEvent.change(screen.getByLabelText('Regular price (ETB)'), {
      target: { value: '100' },
    });
    fireEvent.change(
      screen.getByLabelText('Direct-purchase maximum quantity'),
      {
        target: { value: '5' },
      },
    );
    fireEvent.change(screen.getByLabelText('Request-quote threshold'), {
      target: { value: '6' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        '/admin/products',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const create = request.mock.calls.find(
      ([path, init]) => path === '/admin/products' && init?.method === 'POST',
    );
    expect(JSON.parse(String(create?.[1]?.body))).toMatchObject({
      saleMode: 'HYBRID',
      priceVisibility: 'SHOW_PRICE',
      regularPrice: '100',
      directPurchaseMaxQuantity: 5,
      rfqThreshold: 6,
    });
  });

  it('explains a missing required field before sending a product request', async () => {
    request.mockImplementation(async (path) => {
      if (path === '/admin/products?pageSize=100')
        return { items: [] } as never;
      if (path === '/admin/categories')
        return [{ id: 'category-1', name: 'Equipment' }] as never;
      if (path === '/admin/brands') return [] as never;
      throw new Error(`Unexpected request: ${path}`);
    });
    render(<AdminCatalogList />);
    fireEvent.click(await screen.findByRole('button', { name: 'New product' }));
    fireEvent.invalid(await screen.findByLabelText('Product name'));
    expect(toast.error).toHaveBeenCalledWith(
      'Check product details',
      expect.objectContaining({
        description: expect.stringContaining('Product name needs attention'),
      }),
    );
    expect(request).not.toHaveBeenCalledWith(
      '/admin/products',
      expect.anything(),
    );
  });
});
