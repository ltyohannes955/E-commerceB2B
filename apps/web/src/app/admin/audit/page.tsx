/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
'use client';
import { useEffect, useState } from 'react';
import { SiteShell } from '@/components/site-shell';
export default function AdminAuditPage() {
  const [data, setData] = useState<any>();
  useEffect(() => {
    fetch('/api/backend/admin/audit-logs?page=1&pageSize=50', {
      credentials: 'include',
    }).then(async (r) => {
      if (r.ok) setData(await r.json());
    });
  }, []);
  return (
    <SiteShell>
      <div className="shell dashboard">
        <span className="eyebrow">Operations</span>
        <h1>Audit history</h1>
        <div className="dashboard-panel mt-7 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="pb-3">Action</th>
                <th className="pb-3">Target</th>
                <th className="pb-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((log: any) => (
                <tr key={log.id} className="border-b border-[var(--line)]">
                  <td className="py-3">{log.action}</td>
                  <td className="py-3">{log.targetUserId ?? '—'}</td>
                  <td className="py-3">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SiteShell>
  );
}
