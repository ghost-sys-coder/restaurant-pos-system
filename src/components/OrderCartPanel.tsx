import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import OrderCartItemRow from './OrderCartItemRow.tsx';
import { formatCurrency } from '../utils/formatters.ts';
import {
  Utensils,
  ShoppingBag,
  Wine,
  Truck,
  Send,
  CreditCard,
  Trash2,
  Users,
  Percent,
  Receipt,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Order, OrderType } from '../types.ts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OrderCartPanel() {
  const {
    cartItems,
    orderType,
    setOrderType,
    tables,
    selectedTableId,
    setSelectedTableId,
    guestCount,
    setGuestCount,
    customerName,
    setCustomerName,
    orderNotes,
    setOrderNotes,
    discountPercent,
    setDiscountPercent,
    tipPercent,
    setTipPercent,
    subtotal,
    tax,
    discount,
    tip,
    total,
    clearCart,
    submitOrder,
    orderConflict,
    dismissOrderConflict,
    loadLatestOrderAfterConflict,
    setPaymentModalOpen,
    isSubmitting,
    setActiveView,
  } = usePos();
  const [sentOrder, setSentOrder] = useState<Order | null>(null);
  const readyToSubmit = cartItems.length > 0 && (orderType !== 'dine-in' || Boolean(selectedTableId));

  const handleSendToKitchen = async () => {
    const created = await submitOrder();
    if (created) setSentOrder(created);
  };

  const handlePayNow = async () => {
    // If order not yet created, create it first or open payment directly
    const created = await submitOrder();
    if (created) {
      setPaymentModalOpen(true);
    }
  };

  const typeOptions: Array<{ type: OrderType; label: string; icon: any }> = [
    { type: 'dine-in', label: 'Dine-In', icon: Utensils },
    { type: 'takeout', label: 'Takeout', icon: ShoppingBag },
    { type: 'bar', label: 'Bar', icon: Wine },
    { type: 'delivery', label: 'Delivery', icon: Truck },
  ];

  return (
    <div
      id="pos-order-cart-panel"
      className="w-full lg:w-[430px] xl:w-[470px] h-full bg-white border-l border-slate-200 flex flex-col min-h-0 text-slate-900 overflow-hidden"
    >
      {/* Header & Order Type Switcher */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
              Current Ticket
            </h2>
          </div>
          {cartItems.length > 0 && (
            <button
              id="btn-clear-cart"
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Order Type Pills */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
          {typeOptions.map((t) => {
            const Icon = t.icon;
            const isSelected = orderType === t.type;
            return (
              <button
                key={t.type}
                id={`type-btn-${t.type}`}
                onClick={() => setOrderType(t.type)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mb-0.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Table & Guest Count Selector */}
        {orderType === 'dine-in' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Table
              </label>
              <Select items={tables.map(tbl => ({ value: String(tbl.id), label: `${tbl.tableNumber} (${tbl.section} - ${tbl.status})` }))} value={selectedTableId ? String(selectedTableId) : null} onValueChange={value => setSelectedTableId(value ? Number(value) : null)}>
                <SelectTrigger id="select-cart-table" className="w-full rounded-xl bg-white px-3 text-xs font-semibold data-[size=default]:h-11"><SelectValue placeholder="Choose table" /></SelectTrigger>
                <SelectContent>
                {tables.map((tbl) => (
                  <SelectItem key={tbl.id} value={String(tbl.id)}>
                    {tbl.tableNumber} ({tbl.section} - {tbl.status})
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Guests
              </label>
              <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
                  className="h-full w-16 bg-transparent text-right text-sm font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Customer Name / Phone
            </label>
            <input
              type="text"
              id="input-cart-customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. David Vance"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Cart Items List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <ShoppingBag className="w-12 h-12 stroke-[1.2] mb-2 opacity-30 text-indigo-500" />
            <p className="text-sm font-semibold text-slate-600">Order is empty</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Tap menu items from the catalog on the left to add to this ticket
            </p>
          </div>
        ) : (
          cartItems.map((item) => (
            <OrderCartItemRow key={item.cartItemId} item={item} />
          ))
        )}
      </div>

      {/* Ticket Calculations & Actions */}
      <div className="max-h-[38%] shrink-0 overflow-y-auto p-4 border-t border-slate-200 bg-slate-50/80 space-y-3 scrollbar-thin scrollbar-thumb-slate-300">
        {/* Discount & Tip Quick Presets */}
        <div className="flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Disc:</span>
            {[0, 10, 20].map((d) => (
              <button
                key={d}
                onClick={() => setDiscountPercent(d)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  discountPercent === d
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {d}%
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Tip:</span>
            {[0, 15, 18, 20].map((t) => (
              <button
                key={t}
                onClick={() => setTipPercent(t)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  tipPercent === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {t}%
              </button>
            ))}
          </div>
        </div>

        {/* Order Notes Field */}
        <input
          type="text"
          id="input-cart-order-notes"
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Ticket note (e.g., Rush, VIP guest, VIP table)"
          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
        />

        {/* Subtotal, Tax, Discount, Total */}
        <div className="space-y-1.5 text-xs pt-1 border-t border-slate-200">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-mono text-slate-800 font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount ({discountPercent}%)</span>
              <span className="font-mono">-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>Tax (8.5%)</span>
            <span className="font-mono text-slate-800 font-medium">{formatCurrency(tax)}</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between text-indigo-600">
              <span>Tip ({tipPercent}%)</span>
              <span className="font-mono">+{formatCurrency(tip)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
            <span>Total Due</span>
            <span className="text-indigo-600 font-mono text-base">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Bottom CTA Action Buttons */}
        {cartItems.length > 0 && orderType === 'dine-in' && !selectedTableId && <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold text-amber-700">Select a table to continue</p>}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            id="btn-send-to-kitchen"
            disabled={!readyToSubmit || isSubmitting}
            onClick={handleSendToKitchen}
            className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
              readyToSubmit && !isSubmitting
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-indigo-600" />
            <span>Send order</span>
          </button>

          <button
            id="btn-pay-and-settle"
            disabled={!readyToSubmit || isSubmitting}
            onClick={handlePayNow}
            className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm ${
              readyToSubmit && !isSubmitting
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Checkout {formatCurrency(total)}</span>
          </button>
        </div>
      </div>
      {sentOrder && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs"><section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"><div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-6" /></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-700">Order sent</p><h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">{sentOrder.orderNumber}</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">The ticket is saved and visible to the kitchen. Choose the next forward action.</p><button onClick={() => { setSentOrder(null); setActiveView('orders'); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700">Track this order<ArrowRight className="size-4" /></button><button onClick={() => setSentOrder(null)} className="mt-2 w-full rounded-xl py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Start next order</button></section></div>}
      {orderConflict && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"><section role="alertdialog" aria-modal="true" aria-labelledby="order-conflict-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-white text-slate-900 shadow-2xl"><header className="flex items-start gap-3 border-b border-amber-100 bg-amber-50 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><ShieldAlert className="size-5" /></span><div><p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Update conflict</p><h2 id="order-conflict-title" className="mt-0.5 text-lg font-extrabold">Review the latest order first</h2></div></header><div className="space-y-4 p-5"><p className="text-sm leading-6 text-slate-600">Another terminal saved <strong>{orderConflict.latestOrder.orderNumber}</strong> after you opened it. Your current draft is still here and has not been discarded.</p><div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your starting version</p><p className="mt-1 font-bold">Version {orderConflict.expectedVersion}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest saved version</p><p className="mt-1 font-bold text-amber-700">Version {orderConflict.actualVersion}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest items</p><p className="mt-1 font-bold">{orderConflict.latestOrder.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest total</p><p className="mt-1 font-bold">{formatCurrency(orderConflict.latestOrder.total)}</p></div></div><p className="text-xs leading-5 text-slate-500">Load the latest saved order to continue editing safely. Choose “Keep my draft” if you need to note or compare your unsaved changes first.</p><div className="grid gap-2 sm:grid-cols-2"><button onClick={dismissOrderConflict} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Keep my draft</button><button onClick={loadLatestOrderAfterConflict} className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-xs font-bold text-white hover:bg-amber-700"><RefreshCw className="size-4" />Load latest order</button></div></div></section></div>}
    </div>
  );
}
