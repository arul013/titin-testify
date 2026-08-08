import type { BadgeVariant } from '@/components/ui/badge';

// ─── Taksonomi Masukan & Perbaikan (label ID + gaya badge) ───────────────────

export type Category = 'bug' | 'logic' | 'feature' | 'ui' | 'other';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Status = 'open' | 'in_progress' | 'done' | 'rejected';

export const CATEGORY_META: Record<Category, { label: string; emoji: string; variant: BadgeVariant }> = {
  bug: { label: 'Bug/Perbaikan', emoji: '🐛', variant: 'danger' },
  logic: { label: 'Perubahan Logic', emoji: '🔧', variant: 'warning' },
  feature: { label: 'Fitur Baru', emoji: '✨', variant: 'info' },
  ui: { label: 'UI/UX', emoji: '🎨', variant: 'info' },
  other: { label: 'Lainnya', emoji: '📝', variant: 'neutral' },
};

export const PRIORITY_META: Record<Priority, { label: string; variant: BadgeVariant }> = {
  critical: { label: 'Kritis', variant: 'danger' },
  high: { label: 'Tinggi', variant: 'warning' },
  medium: { label: 'Sedang', variant: 'info' },
  low: { label: 'Rendah', variant: 'neutral' },
};

export const STATUS_META: Record<Status, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Terbuka', variant: 'neutral' },
  in_progress: { label: 'Dikerjakan', variant: 'warning' },
  done: { label: 'Selesai', variant: 'success' },
  rejected: { label: 'Ditolak/Ditunda', variant: 'danger' },
};

export const CATEGORY_ORDER: Category[] = ['bug', 'logic', 'feature', 'ui', 'other'];
export const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low'];
export const STATUS_ORDER: Status[] = ['open', 'in_progress', 'done', 'rejected'];
