import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import KitchenTicketCard from './KitchenTicketCard.tsx';
import { UtensilsCrossed, Flame, CheckCircle, Clock, Volume2 } from 'lucide-react';
import { playKitchenChime } from '../utils/sound.ts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function KitchenDisplayView() {
  const { orders } = usePos();
  const [filter, setFilter] = useState<'all_active' | 'active' | 'preparing' | 'ready'>('all_active');
  const [station, setStation] = useState('all');
  const stations = Array.from(new Set(orders.flatMap(order => order.items || []).map(item => item.kitchenStation || 'main'))).sort();

  const kitchenOrders = orders.filter((o) => {
    if (o.status === 'completed' || o.status === 'cancelled') return false;
    if (station !== 'all' && !o.items?.some(item => (item.kitchenStation || 'main') === station && item.itemStatus !== 'served' && item.itemStatus !== 'void')) return false;
    if (filter === 'all_active') return true;
    return o.status === filter;
  });

  const activeCount = orders.filter((o) => o.status === 'active').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

  return (
    <div
      id="kitchen-display-view"
      className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 lg:p-6 space-y-5 text-slate-900"
    >
      {/* KDS Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Kitchen Display System (KDS)
              </h2>
              <p className="text-xs text-slate-500">
                Live line order queue with real-time timers & item status checklist
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills & Audio Test */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={station} onValueChange={value => setStation(value ?? 'all')}><SelectTrigger aria-label="Kitchen station" className="h-8 min-w-36 rounded-xl bg-white text-xs font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All stations</SelectItem>{stations.map(value => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select>
          <button
            id="kds-filter-all"
            onClick={() => setFilter('all_active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              filter === 'all_active'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Active ({activeCount + preparingCount + readyCount})
          </button>

          <button
            id="kds-filter-new"
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              filter === 'active'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white text-rose-600 border-slate-200 hover:bg-rose-50'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>New ({activeCount})</span>
          </button>

          <button
            id="kds-filter-prep"
            onClick={() => setFilter('preparing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              filter === 'preparing'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white text-amber-600 border-slate-200 hover:bg-amber-50'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Cooking ({preparingCount})</span>
          </button>

          <button
            id="kds-filter-ready"
            onClick={() => setFilter('ready')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              filter === 'ready'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-emerald-600 border-slate-200 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle className="w-3 h-3" />
            <span>Ready ({readyCount})</span>
          </button>

          <button
            id="btn-kds-test-bell"
            onClick={() => playKitchenChime()}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 border border-slate-200 transition cursor-pointer shadow-2xs"
            title="Test Kitchen Order Bell Sound"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
        {kitchenOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3 opacity-60" />
            <h3 className="text-base font-bold text-slate-700">All caught up, Chef!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              There are no pending tickets in the queue. New orders from the POS register will appear
              here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {kitchenOrders.map((order) => (
              <KitchenTicketCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
