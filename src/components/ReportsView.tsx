import { useEffect, useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCurrency } from '../utils/formatters.ts';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  Receipt,
  Users,
  Award,
  Calendar,
  Printer,
  Utensils,
  ShoppingBag,
  Wine,
  Truck,
} from 'lucide-react';

type DailyPerformance = { date: string; revenue: number; orders: number; averageTicket: number };
type PerformanceResponse = { dailyTrend: DailyPerformance[]; timezone: string };
const performanceCache = new Map<number, PerformanceResponse>();

const shortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const compactNumber = (value: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export default function ReportsView() {
  const { orders } = usePos();
  const { terminal } = useAuth();
  const cacheKey = terminal?.locationId ?? 0;
  const cachedPerformance = performanceCache.get(cacheKey);
  const [performance, setPerformance] = useState<PerformanceResponse | null>(cachedPerformance ?? null);
  const [performanceLoading, setPerformanceLoading] = useState(!cachedPerformance);
  const [performanceError, setPerformanceError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const loadPerformance = async () => {
      if (!cachedPerformance) setPerformanceLoading(true);
      setPerformanceError('');
      try {
        const start = new Date();
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        const response = await fetch(`/api/analytics?start=${encodeURIComponent(start.toISOString())}`, { signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Unable to load performance history');
        const next = { dailyTrend: body.dailyTrend || [], timezone: body.timezone || 'UTC' };
        performanceCache.set(cacheKey, next);
        setPerformance(next);
      } catch (error: any) {
        if (error?.name !== 'AbortError') setPerformanceError(error?.message || 'Unable to load performance history');
      } finally { setPerformanceLoading(false); }
    };
    void loadPerformance();
    return () => controller.abort();
  }, [cacheKey]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const completedOrders = orders.filter((o) => o.status === 'completed' && new Date(o.completedAt || o.createdAt) >= todayStart);

  const totalGross = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalTax = completedOrders.reduce((sum, o) => sum + o.tax, 0);
  const totalTips = completedOrders.reduce((sum, o) => sum + (o.tip || 0), 0);
  const totalNet = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const avgTicket = completedOrders.length > 0 ? Math.round(totalGross / completedOrders.length) : 0;

  // Breakdown by payment method
  const cardSales = completedOrders
    .filter((o) => o.paymentMethod === 'card' || !o.paymentMethod)
    .reduce((sum, o) => sum + o.total, 0);
  const cashSales = completedOrders
    .filter((o) => o.paymentMethod === 'cash')
    .reduce((sum, o) => sum + o.total, 0);
  const digitalSales = completedOrders
    .filter((o) => o.paymentMethod === 'digital')
    .reduce((sum, o) => sum + o.total, 0);

  // Breakdown by order type (using ALL orders, not just completed, for coverage)
  const orderTypeConfig = [
    {
      key: 'dine-in' as const,
      label: 'Dine-In',
      icon: Utensils,
      color: 'text-indigo-600',
      bar: 'bg-indigo-500',
      badge: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    },
    {
      key: 'takeout' as const,
      label: 'Takeout',
      icon: ShoppingBag,
      color: 'text-amber-600',
      bar: 'bg-amber-500',
      badge: 'bg-amber-50 border-amber-200 text-amber-700',
    },
    {
      key: 'bar' as const,
      label: 'Bar',
      icon: Wine,
      color: 'text-purple-600',
      bar: 'bg-purple-500',
      badge: 'bg-purple-50 border-purple-200 text-purple-700',
    },
    {
      key: 'delivery' as const,
      label: 'Delivery',
      icon: Truck,
      color: 'text-emerald-600',
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
  ];

  const orderTypeStats = orderTypeConfig.map((cfg) => {
    const typeOrders = completedOrders.filter((o) => o.orderType === cfg.key);
    return {
      ...cfg,
      count: typeOrders.length,
      revenue: typeOrders.reduce((sum, o) => sum + o.total, 0),
    };
  });

  const maxTypeRevenue = Math.max(...orderTypeStats.map((s) => s.revenue), 1);

  // Top selling menu items count
  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  completedOrders.forEach((o) => {
    o.items?.forEach((it) => {
      if (!itemCounts[it.name]) {
        itemCounts[it.name] = { name: it.name, count: 0, revenue: 0 };
      }
      itemCounts[it.name].count += it.quantity;
      itemCounts[it.name].revenue += it.price * it.quantity;
    });
  });

  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const performanceDays = performance?.dailyTrend ?? [];
  const periodRevenue = performanceDays.reduce((sum, day) => sum + day.revenue, 0);
  const periodOrders = performanceDays.reduce((sum, day) => sum + day.orders, 0);
  const periodAverageTicket = periodOrders ? Math.round(periodRevenue / periodOrders) : 0;
  const recentSevenDayRevenue = performanceDays.slice(-7).reduce((sum, day) => sum + day.revenue, 0);
  const previousSevenDayRevenue = performanceDays.slice(-14, -7).reduce((sum, day) => sum + day.revenue, 0);
  const weeklyRevenueChange = previousSevenDayRevenue > 0 ? Math.round(((recentSevenDayRevenue - previousSevenDayRevenue) / previousSevenDayRevenue) * 100) : null;

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div
      id="reports-analytics-view"
      className="flex-1 h-full overflow-y-auto bg-slate-50 p-4 lg:p-6 text-slate-900"
    >
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Daily Sales & Register Z-Report
              </h2>
              <p className="text-xs text-slate-500">
                End-of-day reconciliation, shift totals, and menu performance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Today's Business Date</span>
          </div>
          <button
            id="btn-print-zreport"
            onClick={handlePrintZReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Z-Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 shrink-0">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase">Gross Sales</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono mt-2">
            {formatCurrency(totalGross)}
          </p>
          <span className="text-[10px] text-emerald-600 mt-1">Includes tax & tips</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase">Net Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-600 font-mono mt-2">
            {formatCurrency(totalNet)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1">Food & beverage sales</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tax Collected</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-800 font-mono mt-2">
            {formatCurrency(totalTax)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1">Sales tax payable</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase">Staff Tips</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-extrabold text-indigo-600 font-mono mt-2">
            {formatCurrency(totalTips)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1">Server pool tip share</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase">Avg Ticket</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono mt-2">
            {formatCurrency(avgTicket)}
          </p>
          <span className="text-[10px] text-slate-500 mt-1">
            Across {completedOrders.length} checks
          </span>
        </div>
      </div>

      {/* Order Channel Breakdown */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Sales by Order Channel
          </h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {orderTypeStats.map((stat) => {
            const Icon = stat.icon;
            const pct = totalGross > 0 ? Math.round((stat.revenue / totalGross) * 100) : 0;
            return (
              <div
                key={stat.key}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                {/* Label row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs font-bold text-slate-700">{stat.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${stat.badge}`}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Revenue */}
                <p className="text-base font-extrabold font-mono text-slate-900">
                  {formatCurrency(stat.revenue)}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`${stat.bar} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${(stat.revenue / maxTypeRevenue) * 100}%` }}
                  />
                </div>

                {/* Count */}
                <p className="text-[11px] text-slate-400">
                  {stat.count} {stat.count === 1 ? 'order' : 'orders'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content: Payment Mix & Top Selling Menu Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment Tender Breakdown */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Tender Mix Breakdown
            </h3>
          </div>

          <div className="space-y-3 flex-1">
            {/* Card row */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">Credit / Debit Card</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(cardSales)}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{
                    width: totalGross > 0 ? `${(cardSales / totalGross) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>

            {/* Cash row */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">Cash In Drawer</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(cashSales)}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{
                    width: totalGross > 0 ? `${(cashSales / totalGross) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>

            {/* Digital row */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-slate-800">Digital Wallets / Other</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(digitalSales)}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full"
                  style={{
                    width: totalGross > 0 ? `${(digitalSales / totalGross) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Top Selling Menu Items
            </h3>
          </div>

          <div className="space-y-2.5 flex-1">
            {topItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Complete a few orders to see item sales ranking.
              </div>
            ) : (
              topItems.map((item, idx) => (
                <div
                  key={item.name}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.count} portions sold</p>
                    </div>
                  </div>

                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><TrendingUp className="size-4 text-indigo-600" /><h3 className="font-bold text-slate-900">Business performance over time</h3></div>
            <p className="mt-1 text-xs text-slate-500">Paid orders for the last 30 business days in {performance?.timezone || 'the location timezone'}.</p>
          </div>
          {weeklyRevenueChange !== null && <div className="rounded-xl bg-indigo-50 px-3 py-2 text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">7-day revenue change</p><p className="mt-0.5 font-mono text-sm font-bold text-indigo-800">{weeklyRevenueChange > 0 ? '+' : ''}{weeklyRevenueChange}%</p></div>}
        </div>

        <div className="grid gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-3">
          <div className="bg-white px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">30-day revenue</p><p className="mt-1 font-mono text-lg font-bold text-slate-900">{formatCurrency(periodRevenue)}</p></div>
          <div className="bg-white px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed orders</p><p className="mt-1 font-mono text-lg font-bold text-slate-900">{periodOrders.toLocaleString()}</p></div>
          <div className="bg-white px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average ticket</p><p className="mt-1 font-mono text-lg font-bold text-slate-900">{formatCurrency(periodAverageTicket)}</p></div>
        </div>

        <div className="p-5">
          {performanceLoading && !performance ? <div className="grid gap-5 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-xl bg-slate-100" /><div className="h-80 animate-pulse rounded-xl bg-slate-100" /></div> : performanceError && !performance ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{performanceError}</div> : performanceDays.length ? <div className="grid gap-6 lg:grid-cols-2">
            <article className="min-w-0"><div><h4 className="text-sm font-bold text-slate-800">Daily revenue</h4><p className="mt-0.5 text-xs text-slate-500">Gross revenue from paid orders, including zero-sales days.</p></div><div className="mt-4 h-72 w-full" aria-label="Daily revenue chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={performanceDays} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} minTickGap={24} /><YAxis width={54} tickFormatter={compactNumber} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} /><Tooltip labelFormatter={label => shortDate(String(label))} formatter={value => [formatCurrency(Number(value)), 'Revenue']} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', boxShadow: '0 8px 24px rgb(15 23 42 / 0.08)' }} /><Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="#e0e7ff" fillOpacity={0.8} activeDot={{ r: 4, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div></article>
            <article className="min-w-0"><div><h4 className="text-sm font-bold text-slate-800">Completed order volume</h4><p className="mt-0.5 text-xs text-slate-500">Number of paid checks completed each business day.</p></div><div className="mt-4 h-72 w-full" aria-label="Completed order volume chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={performanceDays} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} minTickGap={24} /><YAxis width={34} allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} /><Tooltip labelFormatter={label => shortDate(String(label))} formatter={value => [Number(value).toLocaleString(), 'Orders']} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', boxShadow: '0 8px 24px rgb(15 23 42 / 0.08)' }} /><Bar dataKey="orders" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={18} /></BarChart></ResponsiveContainer></div></article>
          </div> : <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-12 text-center"><BarChart3 className="size-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No performance history yet</p><p className="mt-1 text-xs text-slate-500">Completed paid orders will appear here over time.</p></div>}
        </div>
      </section>
      </div>
    </div>
  );
}
