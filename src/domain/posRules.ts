export type PricedLine = { price: number; quantity: number };
export type ModifierGroup = { name: string; choices: Array<{ name: string; price: number }>; minSelections: number; maxSelections: number; kitchenLabel?: string };

export function normalizeModifierGroups(value: unknown): ModifierGroup[] {
  if (value == null || value === '') return [];
  const raw = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(raw) || raw.length > 20) throw new Error('Modifier groups must be a list of at most 20 groups');
  const names = new Set<string>();
  return raw.map((candidate: any) => {
    const name = String(candidate?.name || '').trim();
    if (!name || name.length > 60 || names.has(name.toLowerCase())) throw new Error('Each modifier group needs a unique name');
    names.add(name.toLowerCase());
    if (!Array.isArray(candidate.choices) || !candidate.choices.length || candidate.choices.length > 50) throw new Error(`${name} needs between 1 and 50 choices`);
    const choiceNames = new Set<string>();
    const choices = candidate.choices.map((choice: any) => {
      const choiceName = String(choice?.name || '').trim();
      const price = Number(choice?.price);
      if (!choiceName || choiceName.length > 60 || choiceNames.has(choiceName.toLowerCase()) || !Number.isInteger(price) || price < 0 || price > 1_000_000_000) throw new Error(`${name} has an invalid or duplicate choice`);
      choiceNames.add(choiceName.toLowerCase()); return { name: choiceName, price };
    });
    const minSelections = clampInteger(candidate.minSelections ?? 0, 0, choices.length);
    const maxSelections = clampInteger(candidate.maxSelections ?? 1, 1, choices.length);
    if (minSelections > maxSelections) throw new Error(`${name} minimum selections cannot exceed its maximum`);
    return { name, choices, minSelections, maxSelections, kitchenLabel: String(candidate.kitchenLabel || '').trim().slice(0, 60) || undefined };
  });
}

export function priceModifierSelections(groupsInput: unknown, selectedOptions?: string) {
  const groups = normalizeModifierGroups(groupsInput);
  const selections = selectedOptions ? selectedOptions.split(',').map(value => value.trim()).filter(Boolean) : [];
  const byGroup = new Map<string, string[]>();
  for (const selection of selections) {
    const separator = selection.indexOf(':');
    if (separator < 1) throw new Error('Selected modifier format is invalid');
    const groupName = selection.slice(0, separator).trim();
    const choiceName = selection.slice(separator + 1).trim();
    byGroup.set(groupName, [...(byGroup.get(groupName) || []), choiceName]);
  }
  let total = 0;
  for (const group of groups) {
    const selected = byGroup.get(group.name) || [];
    if (selected.length < group.minSelections || selected.length > group.maxSelections) throw new Error(`${group.name} requires ${group.minSelections === group.maxSelections ? group.minSelections : `${group.minSelections} to ${group.maxSelections}`} selection(s)`);
    if (new Set(selected).size !== selected.length) throw new Error(`${group.name} contains a duplicate selection`);
    for (const choiceName of selected) {
      const choice = group.choices.find(value => value.name === choiceName);
      if (!choice) throw new Error(`Modifier ${group.name}: ${choiceName} is unavailable`);
      total += choice.price;
    }
    byGroup.delete(group.name);
  }
  if (byGroup.size) throw new Error(`Unknown modifier group: ${byGroup.keys().next().value}`);
  return total;
}

export function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) throw new Error('A numeric value is required');
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function normalizeCurrency(value: string) {
  const currency = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter ISO code');
  return currency;
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
