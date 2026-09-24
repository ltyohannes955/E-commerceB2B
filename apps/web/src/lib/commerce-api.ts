import { csrfFetch } from '@/components/auth-forms';

export type CartItem = {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  unit: string;
  imageSrc: string | null;
  quantity: number;
  unitPriceSnapshot: string;
  currentUnitPrice: string | null;
  previousUnitPrice: string | null;
  priceChanged: boolean;
  subtotal: string;
  available: boolean;
};

export type Cart = {
  id: string;
  items: CartItem[];
  subtotal: string;
  currency: string;
  itemCount: number;
};
export type RfqItem = {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  unit: string;
  imageSrc: string | null;
  requestedQuantity: number;
  adjustedQuantity: number | null;
  adjustmentReason: string | null;
  note: string | null;
};
export type Rfq = {
  id: string;
  reference: string;
  title: string;
  status: string;
  version: number;
  message: string | null;
  deliveryTimeframe: string | null;
  deliveryCity: string | null;
  preferredContact: string | null;
  items: RfqItem[];
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
  quotes: Array<{
    id: string;
    quoteNumber: string;
    revision: number;
    status: string;
    grandTotal: string;
    expiresAt: string | null;
  }>;
};
export type Quote = {
  id: string;
  quoteNumber: string;
  revision: number;
  version: number;
  status: string;
  currency: string;
  subtotal: string;
  adjustmentTotal: string;
  grandTotal: string;
  estimatedLeadTimeDays: number | null;
  paymentTerms: string | null;
  expiresAt: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
  items: Array<{
    id: string;
    rfqItemId?: string | null;
    productName: string;
    variantName: string;
    sku: string;
    unit: string;
    quantity: number;
    unitPrice: string;
    lineSubtotal: string;
  }>;
  adjustments: Array<{
    id: string;
    kind: string;
    label: string;
    amount: string;
    sortOrder: number;
  }>;
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
  rfq?: {
    id: string;
    reference: string;
    title: string;
    user?: { fullName: string; email: string; phone: string | null };
  };
};

async function parse(response: Response) {
  if (response.ok) return response.status === 204 ? null : response.json();
  const data = await response.json().catch(() => null);
  const error = new Error(
    data?.detail ?? 'The request could not be completed.',
  ) as Error & {
    code?: string;
    issues?: Array<{ field: string; message: string }>;
  };
  error.code = data?.code;
  error.issues = data?.errors;
  throw error;
}

async function refreshSession() {
  const refreshed = await csrfFetch('/auth/refresh', {
    method: 'POST',
    body: '{}',
  });
  return refreshed.ok;
}

export async function commerceFetch<T>(path: string, init?: RequestInit) {
  let response = await fetch(`/api/backend${path}`, {
    ...init,
    credentials: 'include',
  });
  if (response.status === 401 && init?.method !== 'POST') {
    if (await refreshSession())
      response = await fetch(`/api/backend${path}`, {
        ...init,
        credentials: 'include',
      });
  }
  return (await parse(response)) as T;
}

export async function commerceMutate<T>(path: string, init: RequestInit = {}) {
  let response = await csrfFetch(path, init);
  if (response.status === 401 && path !== '/auth/refresh') {
    if (await refreshSession()) response = await csrfFetch(path, init);
  }
  return (await parse(response)) as T;
}

export function imageSrc(src: string | null) {
  return src ? `/api/backend${src.replace(/^\/api/, '')}` : null;
}
