'use client';

import React from 'react';
import { useIdleTimeout } from './useIdleTimeout';
import { SessionTimeoutModal } from './SessionTimeoutModal';

interface Props {
  /** Aktif hanya saat ada user login. */
  enabled: boolean;
  onLogout: () => void;
}

/** Pemasang idle-timeout + modal peringatan. Dirender di dalam AuthProvider. */
export const SessionGuard: React.FC<Props> = ({ enabled, onLogout }) => {
  const { warningSeconds, staySignedIn } = useIdleTimeout(enabled, onLogout);
  if (!enabled || warningSeconds == null) return null;
  return (
    <SessionTimeoutModal seconds={warningSeconds} onStay={staySignedIn} onLogout={onLogout} />
  );
};
