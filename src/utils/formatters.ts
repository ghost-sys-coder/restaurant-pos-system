export function formatCurrency(cents: number | undefined | null): string {
  if (cents === undefined || cents === null || isNaN(cents)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatTime(dateString: string | undefined | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

export function getElapsedMinutes(dateString: string | undefined | null): number {
  if (!dateString) return 0;
  const start = new Date(dateString).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / (1000 * 60)));
}
