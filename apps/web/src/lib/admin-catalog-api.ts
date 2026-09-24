'use client';

export type CatalogValidationIssue = { field: string; message: string };

export class AdminCatalogError extends Error {
  constructor(
    message: string,
    readonly issues: CatalogValidationIssue[] = [],
  ) {
    super(message);
  }
}

export async function adminCatalogRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== 'GET') {
    const csrf = await fetch('/api/backend/auth/csrf', {
      credentials: 'include',
    }).then((response) => response.json() as Promise<{ csrfToken: string }>);
    headers.set('x-csrf-token', csrf.csrfToken);
  }
  if (init.body && !(init.body instanceof FormData))
    headers.set('content-type', 'application/json');
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail ?? body?.message;
    const issues: CatalogValidationIssue[] = Array.isArray(body?.errors)
      ? body.errors.filter(
          (issue: unknown): issue is CatalogValidationIssue =>
            typeof issue === 'object' &&
            issue !== null &&
            'field' in issue &&
            'message' in issue &&
            typeof issue.field === 'string' &&
            typeof issue.message === 'string',
        )
      : [];
    throw new AdminCatalogError(
      typeof detail === 'string'
        ? detail
        : `Request failed (${response.status})`,
      issues,
    );
  }
  return response.json() as Promise<T>;
}
