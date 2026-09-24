export type CatalogImage = {
  id: string;
  src: string;
  altText: string;
  byteSize: number;
  isPrimary: boolean;
};
export type CatalogTier = { minimumQuantity: number; unitPrice: string };
export type CatalogVariant = {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  priceMode: string;
  price: string | null;
  availability: string;
  priceTiers: CatalogTier[];
  image?: CatalogImage | null;
  availableQuantity?: number | null;
};
export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  category: { name: string; slug: string };
  brand: { name: string; slug: string } | null;
  internalSku: string;
  unit: string;
  countryOfOrigin: string;
  minimumOrderQuantity: number;
  leadTimeDays: number | null;
  availability: string;
  saleMode: string;
  priceVisibility: string;
  regularPrice: string | null;
  discountPrice: string | null;
  discountStartAt: string | null;
  discountEndAt: string | null;
  showStartingFrom: boolean;
  featured: boolean;
  status?: string;
  images: CatalogImage[];
  variants: CatalogVariant[];
  specifications: { groupName: string; name: string; value: string }[];
  priceTiers: CatalogTier[];
  allowRfqAtAnyQuantity?: boolean;
  directPurchaseMaxQuantity?: number | null;
  rfqThreshold?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};
export type CatalogPage = {
  items: CatalogProduct[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }>;
};
const apiOrigin = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';
export async function catalogFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiOrigin}/api${path}`, {
    ...init,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`CATALOG_${response.status}`);
  return response.json() as Promise<T>;
}
export function imageUrl(src: string) {
  return src.startsWith('http')
    ? src
    : `/api/backend${src.replace(/^\/api/, '')}`;
}
export function formatEtb(value: string | number | null) {
  if (value === null || value === undefined) return 'Price on request';
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(Number(value));
}
export function availabilityLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}
