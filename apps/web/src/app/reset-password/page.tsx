import { Suspense } from 'react';
import ResetPasswordClient from './reset-password-client';
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="shell form-page">Loading…</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
