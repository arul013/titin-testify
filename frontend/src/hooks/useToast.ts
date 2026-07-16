'use client';

import { useCallback } from 'react';
import { toast } from '../components/ui/toast';

export const useToast = () => {
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  }, []);

  return {
    toasts: [] as unknown[], // Return empty to prevent legacy inline lists from showing
    addToast,
    removeToast: useCallback(() => {}, []),
  };
};
