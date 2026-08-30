import { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { Order, ItemStatus } from '../types.ts';
import { getElapsedMinutes } from '../utils/formatters.ts';
import { Clock, Check, CheckCheck, AlertTriangle, Ban } from 'lucide-react';
import { playBeep } from '../utils/sound.ts';
import VoidOrderItemModal from './VoidOrderItemModal.tsx';

export default function KitchenTicketCard({ order }: { order: Order }) {
  const { updateOrderStatus, updateOrderItemStatus, showToast } = usePos();
  const [elapsed, setElapsed] = useState<number>(getElapsedMinutes(order.createdAt));
  const [voidTarget, setVoidTarget] = useState<NonNullable<Order['items']>[number] | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(getElapsedMinutes(order.createdAt));
    }, 15000);
    return () => clearInterval(timer);
  }, [order.createdAt]);

  const isUrgent = elapsed >= 20;
  const isWarning = elapsed >= 10 && elapsed < 20;

  const handleToggleItem = async (itemId: number, currentStatus?: ItemStatus) => {
    playBeep(800, 0.04);
    const nextStatus =
      currentStatus === 'ready'
        ? 'served'
        : currentStatus === 'preparing'
        ? 'ready'
        : 'preparing';
    await updateOrderItemStatus(itemId, nextStatus);
  };

  const handleBumpOrder = async () => {
    playBeep(900, 0.08);
    const nextOrderStatus =
      order.status === 'active'
        ? 'preparing'
        : order.status === 'preparing'
        ? 'ready'
        : 'served';
    await updateOrderStatus(order.id, nextOrderStatus);
    showToast(`Order ${order.orderNumber} bumped to ${nextOrderStatus}`);
  };

  return (
    <div
      id={`kds-ticket-${order.id}`}
      className={`rounded-xl border flex flex-col justify-between overflow-hidden shadow-xs transition-all ${
        isUrgent
          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
          : isWarning
          ? 'bg-amber-50/70 border-amber-300'
          : 'bg-white border-slate-200'
      } text-slate-800 min-h-[320px]`}
    >
      {/* Ticket Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between ${
          isUrgent
            ? 'bg-rose-100/60 border-rose-200'
            : isWarning
            ? 'bg-amber-100/60 border-amber-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-slate-900 tracking-tight">
              {order.orderNumber}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {order.orderType}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {order.table?.tableNumber ? `Table ${order.table.tableNumber}` : 'Direct Order'} ·{' '}
            {order.guestCount} {order.guestCount === 1 ? 'Guest' : 'Guests'}
          </p>
        </div>

        {/* Timer Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
            isUrgent
              ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
              : isWarning
              ? 'bg-amber-500 text-white border-amber-400'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {isUrgent ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
          <span>{elapsed}m</span>
        </div>
      </div>

      {/* Ticket Items List */}
      <div className="p-3.5 flex-1 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-200">
        {order.notes && (
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            <span className="font-bold">Ticket Note:</span> {order.notes}
          </div>
        )}

        {order.items?.map((item) => {
          const isReady = item.itemStatus === 'ready';
          const isPreparing = item.itemStatus === 'preparing';

          return (
            <div
              key={item.id}
              onClick={() => item.id && handleToggleItem(item.id, item.itemStatus)}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 ${
                isReady
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 line-through opacity-75'
                  : isPreparing
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50/70 border-slate-200 text-slate-800 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-mono font-extrabold text-slate-800 shrink-0 shadow-2xs">
                  {item.quantity}×
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">{item.name}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{(item.kitchenStation || 'main').replaceAll('_', ' ')}</p>
                  {item.selectedOptions && (
                    <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                      {item.selectedOptions}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-[11px] text-rose-600 font-medium italic mt-0.5">
                      "{item.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                {isReady ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                    <CheckCheck className="w-3 h-3" /> Ready
                  </span>
                ) : isPreparing ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                    Cooking
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">Tap when cooking</span>
                )}
                {item.id && ['sent', 'preparing'].includes(item.itemStatus || 'sent') && <button type="button" onClick={event => { event.stopPropagation(); setVoidTarget(item); }} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-100"><Ban className="size-3" />Void</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer / Bump Button */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80">
        <button
          id={`btn-bump-${order.id}`}
          onClick={handleBumpOrder}
          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
            order.status === 'ready'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : order.status === 'preparing'
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {order.status === 'ready' ? (
            <>
              <CheckCheck className="w-4 h-4" />
              <span>Mark Served / Complete</span>
            </>
          ) : order.status === 'preparing' ? (
            <>
              <Check className="w-4 h-4" />
              <span>Order Ready for Pickup</span>
            </>
          ) : (
            <>
              <span>Start Preparing Order</span>
            </>
          )}
        </button>
      </div>
      {voidTarget?.id && <VoidOrderItemModal item={voidTarget} onClose={() => setVoidTarget(null)} onVoid={reason => updateOrderItemStatus(voidTarget.id!, 'void', reason)} />}
    </div>
  );
}
