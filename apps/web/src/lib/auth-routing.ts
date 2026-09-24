export type AccountRole = 'CUSTOMER' | 'ADMIN';

export function safeReturnPath(
  value: string | null | undefined,
  role: AccountRole,
): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\u0000-\u001f]/.test(value) || /%(?:2f|5c)/i.test(value)) return null;

  try {
    const url = new URL(value, 'http://local.invalid');
    if (url.origin !== 'http://local.invalid') return null;
    const path = url.pathname;
    if (role === 'ADMIN') {
      if (
        !/^\/admin(?:\/|$)/.test(path) ||
        /^\/admin\/login(?:\/|$)/.test(path)
      )
        return null;
    } else if (/^\/(?:admin|api|login|sign-up)(?:\/|$)/.test(path)) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function afterLoginPath(
  role: AccountRole,
  requestedPath: string | null | undefined,
) {
  return (
    safeReturnPath(requestedPath, role) ?? (role === 'ADMIN' ? '/admin' : '/')
  );
}
