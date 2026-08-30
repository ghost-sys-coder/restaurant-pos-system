export type PerformanceOrder = {
  total: number | null;
  createdAt: Date;
  completedAt: Date | null;
};

export type DailyPerformance = {
  date: string;
  revenue: number;
  orders: number;
  averageTicket: number;
};

const dayKey = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};

export function buildDailyPerformanceTrend(
  paidOrders: PerformanceOrder[],
  startAt: Date,
  timezone: string,
  now = new Date(),
): DailyPerformance[] {
  const totals = new Map<string, { revenue: number; orders: number }>();
  for (const order of paidOrders) {
    const key = dayKey(order.completedAt || order.createdAt, timezone);
    const current = totals.get(key) || { revenue: 0, orders: 0 };
    current.revenue += order.total || 0;
    current.orders += 1;
    totals.set(key, current);
  }

  const maximumLookback = new Date(now.getTime() - 369 * 86_400_000);
  const effectiveStart = startAt > maximumLookback ? startAt : maximumLookback;
  const dayCount = Math.min(370, Math.max(1, Math.floor((now.getTime() - effectiveStart.getTime()) / 86_400_000) + 1));
  const trend: DailyPerformance[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < dayCount; index += 1) {
    const cursor = new Date(effectiveStart.getTime() + index * 86_400_000);
    const date = dayKey(cursor, timezone);
    if (seen.has(date)) continue;
    const day = totals.get(date) || { revenue: 0, orders: 0 };
    trend.push({ date, revenue: day.revenue, orders: day.orders, averageTicket: day.orders ? Math.round(day.revenue / day.orders) : 0 });
    seen.add(date);
  }
  return trend;
}
