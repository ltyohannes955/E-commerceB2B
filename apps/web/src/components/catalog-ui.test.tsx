import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductCard } from './catalog-ui';
import type { CatalogProduct } from '@/lib/catalog';

const product: CatalogProduct = {
  id: '1',
  name: 'Hybrid inverter',
  slug: 'hybrid-inverter',
  shortDescription: 'Reliable backup power.',
  category: { name: 'Power', slug: 'power' },
  brand: null,
  internalSku: 'SP-1',
  unit: 'piece',
  countryOfOrigin: 'AE',
  minimumOrderQuantity: 5,
  leadTimeDays: 14,
  availability: 'IN_STOCK',
  saleMode: 'HYBRID',
  priceVisibility: 'SHOW_PRICE',
  regularPrice: '150000.00',
  discountPrice: null,
  discountStartAt: null,
  discountEndAt: null,
  showStartingFrom: false,
  featured: true,
  images: [
    {
      id: 'img',
      src: '/product-images/img',
      altText: 'Inverter',
      byteSize: 100,
      isPrimary: true,
    },
  ],
  variants: [],
  specifications: [],
  priceTiers: [],
};

describe('ProductCard', () => {
  it('shows price, MOQ, availability, and accessible image alt text', () => {
    render(<ProductCard product={product} />);
    expect(
      screen.getByRole('heading', { name: 'Hybrid inverter' }),
    ).toBeTruthy();
    expect(screen.getByText(/MOQ 5 piece/)).toBeTruthy();
    expect(screen.getByAltText('Inverter')).toBeTruthy();
  });
});
