export type PricedLine = { price: number; quantity: number };

export function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) throw new Error('A numeric value is required');
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function calculateOrderTotals(lines: PricedLine[], discountPercent: number, taxRateBps: number) {
  const normalizedDiscount = clampInteger(discountPercent, 0, 100);
  const normalizedTax = clampInteger(taxRateBps, 0, 10_000);
  const subtotal = lines.reduce((sum, line) => sum + clampInteger(line.price, 0, 1_000_000_000) * clampInteger(line.quantity, 1, 99), 0);
  const discount = Math.round(subtotal * normalizedDiscount / 100);
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * normalizedTax / 10_000);
  return { subtotal, discount, tax, total: taxable + tax };
}

const ORDER_TRANSITIONS: Record<string, string[]> = { active: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['served', 'cancelled'], served: ['completed'] };
const ITEM_TRANSITIONS: Record<string, string[]> = { sent: ['preparing', 'void'], preparing: ['ready', 'void'], ready: ['served'], served: [], void: [] };
const TABLE_TRANSITIONS: Record<string, string[]> = { available: ['reserved'], reserved: ['available'], occupied: ['billing'], billing: [], cleaning: ['available'] };

export function canTransitionOrder(from: string, to: string) { return Boolean(ORDER_TRANSITIONS[from]?.includes(to)); }
export function canTransitionItem(from: string, to: string) { return Boolean(ITEM_TRANSITIONS[from]?.includes(to)); }
export function canTransitionTable(from: string, to: string) { return Boolean(TABLE_TRANSITIONS[from]?.includes(to)); }

export function paymentState(total: number, paid: number): 'unpaid' | 'partially_paid' | 'paid' {
  if (paid <= 0) return 'unpaid';
  if (paid < total) return 'partially_paid';
  if (paid === total) return 'paid';
  throw new Error('Payment exceeds the outstanding balance');
}

export function splitAmounts(total: number, count: number) {
  const safeTotal = clampInteger(total, 1, 1_000_000_000);
  const safeCount = clampInteger(count, 2, 20);
  const base = Math.floor(safeTotal / safeCount);
  return Array.from({ length: safeCount }, (_, index) => base + (index < safeTotal % safeCount ? 1 : 0));
}
