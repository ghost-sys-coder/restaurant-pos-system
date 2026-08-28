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
} from 'lucide-react';
import { OrderType } from '../types.ts';

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
    setPaymentModalOpen,
    isSubmitting,
  } = usePos();

  const handleSendToKitchen = async () => {
    await submitOrder();
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
      className="w-full lg:w-96 xl:w-[410px] h-full bg-white border-l border-slate-200 flex flex-col min-h-0 text-slate-900 overflow-hidden"
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
              <select
                id="select-cart-table"
                value={selectedTableId || ''}
                onChange={(e) =>
                  setSelectedTableId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="">-- Choose Table --</option>
                {tables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    {tbl.tableNumber} ({tbl.section} - {tbl.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Guests
              </label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 justify-between">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-12 bg-transparent text-right text-xs font-bold text-slate-800 focus:outline-none"
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
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
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
      <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3 shrink-0">
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
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            id="btn-send-to-kitchen"
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handleSendToKitchen}
            className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
              cartItems.length > 0 && !isSubmitting
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-indigo-600" />
            <span>Send KDS</span>
          </button>

          <button
            id="btn-pay-and-settle"
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handlePayNow}
            className={`py-3 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm ${
              cartItems.length > 0 && !isSubmitting
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay {formatCurrency(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
