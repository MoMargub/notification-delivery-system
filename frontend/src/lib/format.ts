export const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const formatNumber = (n: number) => n.toLocaleString('en-US');
