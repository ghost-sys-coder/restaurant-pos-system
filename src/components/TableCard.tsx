import { usePos } from '../context/PosContext.tsx';
import { RestaurantTable, TableStatus } from '../types.ts';
import { formatCurrency, getElapsedMinutes } from '../utils/formatters.ts';
import { Users, Clock, Receipt, CheckCircle, RefreshCw } from 'lucide-react';

const STATUS_CONFIG: Record<
  TableStatus,
  { label: string; bg: string; border: string; text: string; dot: string; badgeBg: string }
> = {
  available: {
    label: 'Available',
    bg: 'bg-white',
    border: 'border-slate-200 hover:border-emerald-400',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 border-emerald-200',
  },
  occupied: {
    label: 'Occupied',
    bg: 'bg-white',
    border: 'border-amber-200 hover:border-amber-400 shadow-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500 animate-pulse',
    badgeBg: 'bg-amber-50 border-amber-200',
  },
  billing: {
    label: 'Billing',
    bg: 'bg-white',
    border: 'border-indigo-200 hover:border-indigo-400 shadow-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
    badgeBg: 'bg-indigo-50 border-indigo-200',
  },
  reserved: {
    label: 'Reserved',
    bg: 'bg-white',
    border: 'border-purple-200 hover:border-purple-400',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
    badgeBg: 'bg-purple-50 border-purple-200',
  },
  cleaning: {
    label: 'Cleaning',
    bg: 'bg-slate-50',
    border: 'border-slate-200 hover:border-slate-300',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    badgeBg: 'bg-slate-100 border-slate-200',
  },
};

export default function TableCard({ table }: { table: RestaurantTable }) {
  const {
    orders,
    setSelectedTableId,
    setActiveView,
    setOrderType,
    loadOrderToCart,
    showToast,
    fetchData,
  } = usePos();

  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;

  // Find active order for this table
  const activeOrder = orders.find(
    (o) =>
      o.tableId === table.id &&
      o.status !== 'completed' &&
      o.status !== 'cancelled'
  );

  const elapsedMins = activeOrder ? getElapsedMinutes(activeOrder.createdAt) : 0;

  const handleStartOrder = () => {
    setSelectedTableId(table.id);
    setOrderType('dine-in');
    setActiveView('register');
  };

  const handleOpenActiveOrder = () => {
    if (activeOrder) {
      loadOrderToCart(activeOrder);
    }
  };

  const handleStatusChange = async (newStatus: TableStatus) => {
    try {
      const res = await fetch(`/api/tables/${table.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Table ${table.tableNumber} set to ${newStatus}`);
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      id={`table-card-${table.tableNumber}`}
      className={`rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${cfg.bg} ${cfg.border} text-slate-800 min-h-[170px]`}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              {table.tableNumber}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100">
              {table.section}
            </span>
          </div>

          {/* Status Badge */}
          <div
            className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeBg} ${cfg.text}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <span>{cfg.label}</span>
          </div>
        </div>

        {/* Capacity & Timer */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{table.capacity} Seats</span>
          </div>
          {activeOrder && (
            <div className="flex items-center gap-1 text-amber-600 font-mono font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>{elapsedMins}m active</span>
            </div>
          )}
        </div>

        {/* Active Order Preview */}
        {activeOrder && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-3 space-y-1">
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-bold text-indigo-600">{activeOrder.orderNumber}</span>
              <span className="font-mono font-extrabold text-slate-900">
                {formatCurrency(activeOrder.total)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {activeOrder.items?.length || 0} items · {activeOrder.guestCount} guests
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        {table.status === 'available' && (
          <button
            id={`btn-seat-table-${table.id}`}
            onClick={handleStartOrder}
            className="w-full py-2 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Seat & Take Order</span>
          </button>
        )}

        {table.status === 'occupied' && (
          <div className="w-full grid grid-cols-2 gap-1.5">
            <button
              onClick={handleOpenActiveOrder}
              className="py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
            >
              <Receipt className="w-3 h-3" />
              <span>Order</span>
            </button>
            <button
              onClick={() => handleStatusChange('billing')}
              className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Set Billing
            </button>
          </div>
        )}

        {table.status === 'billing' && (
          <div className="w-full grid grid-cols-2 gap-1.5">
            <button
              onClick={handleOpenActiveOrder}
              className="py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
            >
              <Receipt className="w-3 h-3" />
              <span>Checkout</span>
            </button>
            <button
              onClick={() => handleStatusChange('cleaning')}
              className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Paid / Bus
            </button>
          </div>
        )}

        {table.status === 'cleaning' && (
          <button
            onClick={() => handleStatusChange('available')}
            className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mark Clean & Ready</span>
          </button>
        )}

        {table.status === 'reserved' && (
          <button
            onClick={handleStartOrder}
            className="w-full py-2 rounded-lg bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 text-xs font-bold transition cursor-pointer"
          >
            Arrive & Open Ticket
          </button>
        )}
      </div>
    </div>
  );
}
