/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export default function AdminPage() {
  const [stats, setStats] = useState<any>();
  useEffect(() => {
    fetch('/api/backend/admin/users?page=1&pageSize=1', {
      credentials: 'include',
    }).then(async (r) => {
      if (r.ok) setStats(await r.json());
    });
  }, []);
  return (
    <div className="shell dashboard">
      <span className="eyebrow">Operations</span>
      <h1>Admin overview</h1>
      <p className="text-[var(--muted)]">
        A lightweight view of account health while the marketplace foundation
        takes shape.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="dashboard-panel">
          <p className="text-sm text-[var(--muted)]">Customers</p>
          <strong className="text-3xl">{stats?.total ?? '—'}</strong>
        </div>
        <Link href="/admin/users" className="dashboard-panel">
          <p className="text-sm text-[var(--muted)]">Manage users</p>
          <strong className="text-lg">Open directory →</strong>
        </Link>
        <Link href="/admin/audit" className="dashboard-panel">
          <p className="text-sm text-[var(--muted)]">Audit history</p>
          <strong className="text-lg">Review activity →</strong>
        </Link>
      </div>
    </div>
  );
}
