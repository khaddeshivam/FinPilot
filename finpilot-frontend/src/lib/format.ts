export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSigned(amount: number, type?: 'INCOME' | 'EXPENSE'): string {
  const value = formatCurrency(Math.abs(amount));
  if (type === 'INCOME') return `+${value}`;
  if (type === 'EXPENSE') return `-${value}`;
  return amount >= 0 ? `+${value}` : `-${value}`;
}

export function monthName(date = new Date()): string {
  return date.toLocaleDateString('en-IN', { month: 'long' });
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateLong(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthShort(period: string): string {
  const date = new Date(`${period.slice(0, 7)}-01T00:00:00`);
  return date.toLocaleDateString('en-IN', { month: 'short' });
}

export function initials(name: string | undefined): string {
  if (!name) return 'FP';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function percent(value: number): string {
  return `${Math.round(value)}%`;
}
