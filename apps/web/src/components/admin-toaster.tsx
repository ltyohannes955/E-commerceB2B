'use client';

import { Toaster } from 'sonner';

export function AdminToaster() {
  return (
    <Toaster
      position="top-right"
      theme="light"
      richColors
      closeButton
      visibleToasts={3}
      duration={5500}
      offset={20}
      mobileOffset={12}
      toastOptions={{ className: 'admin-toast' }}
    />
  );
}
