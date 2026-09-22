/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';

function fetchUsers(query: string) {
  return fetch(
    `/api/backend/admin/users?page=1&pageSize=50&search=${encodeURIComponent(query)}`,
    { credentials: 'include' },
  );
}

export default function AdminUsersPage() {
  const [data, setData] = useState<any>();
  const [query, setQuery] = useState('');
  async function load() {
    const response = await fetchUsers(query);
    if (response.ok) setData(await response.json());
  }
  useEffect(() => {
    fetchUsers('').then(async (response) => {
      if (response.ok) setData(await response.json());
    });
  }, []);
  async function toggle(user: any) {
    const csrf = await fetch('/api/backend/auth/csrf', {
      credentials: 'include',
    }).then((r) => r.json());
    await fetch(`/api/backend/admin/users/${user.id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrf.csrfToken,
      },
      body: JSON.stringify({
        status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
        reason: 'Admin review',
      }),
    });
    void load();
  }
  return (
    <SiteShell>
      <div className="shell dashboard">
        <span className="eyebrow">Operations</span>
        <h1>Customers</h1>
        <div className="dashboard-panel mt-7">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <input
              className="min-h-12 flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3"
              placeholder="Search name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
            />
            <button className="button button-small" onClick={() => void load()}>
              Search
            </button>
          </div>
          <div className="grid gap-3">
            {data?.items?.map((user: any) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 border-t border-[var(--line)] py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <strong>{user.fullName}</strong>
                  <p className="m-0 text-sm text-[var(--muted)]">
                    {user.email}
                  </p>
                </div>
                <button
                  className="button button-secondary button-small"
                  onClick={() => void toggle(user)}
                >
                  {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
