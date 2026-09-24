'use client';

import { toast } from 'sonner';
import { AdminCatalogError } from '@/lib/admin-catalog-api';

export function notifyAdminError(title: string, error: unknown) {
  const issues = error instanceof AdminCatalogError ? error.issues : [];
  const description = issues.length
    ? `${issues[0].message}${issues.length > 1 ? ` Plus ${issues.length - 1} more issue${issues.length === 2 ? '' : 's'} in the form.` : ''}`
    : error instanceof Error
      ? error.message
      : 'Please try again.';
  toast.error(title, { description });
}
