'use client';

import React from 'react';
import { Modal } from './modal';
import { Button, type ButtonVariant } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  confirmLabel: string;
  confirmIcon?: React.ReactNode;
  confirmVariant?: ButtonVariant;
  confirmClassName?: string;
  loading?: boolean;
  onConfirm: () => void;
  children: React.ReactNode;
}

/** Dialog konfirmasi generik (Batal / aksi). Isi pesan/peringatan lewat children. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  title,
  icon,
  confirmLabel,
  confirmIcon,
  confirmVariant = 'primary',
  confirmClassName,
  loading = false,
  onConfirm,
  children,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading} className="font-bold">
            Batal
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
            className={`font-bold gap-2 ${confirmClassName ?? ''}`}
            leftIcon={confirmIcon}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
};
