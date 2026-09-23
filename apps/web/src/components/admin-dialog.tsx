'use client';

import { X } from '@phosphor-icons/react';
import { useEffect, useId, useRef } from 'react';
import { AdminToaster } from '@/components/admin-toaster';

export function AdminDialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // React Strict Mode replays effects in development. Calling close() during
    // cleanup emits a close event that would dismiss the newly opened dialog.
    if (!dialog.open) {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }, []);

  return (
    <dialog
      ref={ref}
      className={`admin-dialog${wide ? ' admin-dialog-wide' : ''}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <AdminToaster />
      <div className="admin-dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="admin-dialog-body">{children}</div>
    </dialog>
  );
}
