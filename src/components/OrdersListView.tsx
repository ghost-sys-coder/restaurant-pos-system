import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import {
  ReceiptText,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ShoppingBag,
  RotateCcw,
  XCircle,
  CreditCard,
} from 'lucide-react';
import { Order, OrderStatus } from '../types.ts';
import ConfirmDialog from './ConfirmDialog.tsx';

export default function OrdersListView() {
  const { orders, setActiveReceiptOrder, setReceiptModalOpen, updateOrderStatus, loadOrderToCart, openOrderForPayment } =
    usePos();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [search, setSearch] = useState<string>('');
  const [voidTarget, setVoidTarget] = useState<Order | null>(null);
  const [voidBusy, setVoidBusy] = useState(false);

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active' && (o.status === 'completed' || o.status === 'cancelled')) return false;
    if (filter === 'completed' && o.status !== 'completed') return false;
    if (filter === 'cancelled' && o.status !== 'cancelled') return false;

    if (search.trim() !== '') {
      const q = search.toLowerCase();
      const matchNum = o.orderNumber.toLowerCase().includes(q);
      const matchCustomer = o.customerName && o.customerName.toLowerCase().includes(q);
      const matchTable = o.table?.tableNumber && o.table.tableNumber.toLowerCase().includes(q);
      return matchNum || matchCustomer || matchTable;
    }
    return true;
  });

  const handleOpenReceipt = (order: Order) => {
    setActiveReceiptOrder(order);
    setReceiptModalOpen(true);
  };

  const handleVoidOrder = async () => {
    if (!voidTarget) return; setVoidBusy(true);
    try { await updateOrderStatus(voidTarget.id, 'cancelled'); setVoidTarget(null); } finally { setVoidBusy(false); }
  };

  return (
    <div
      id="orders-list-view"
      className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 lg:p-6 space-y-5 text-slate-900"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Order History & Transactions
              </h2>
              <p className="text-xs text-slate-500">
                View completed bills, receipts, active tabs, and audit records
              </p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-orders-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, table..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'active', label: 'Active / Unsettled' },
          { id: 'completed', label: 'Completed & Paid' },
          { id: 'cancelled', label: 'Voided / Cancelled' },
        ].map((tab) => {
          const isSelected = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Orders Table Container */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xs scrollbar-thin scrollbar-thumb-slate-200">
        {filteredOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
            <ShoppingBag className="w-10 h-10 opacity-30 text-indigo-500 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No orders found</p>
            <p className="text-xs text-slate-400">Try changing your search term or filter tab.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Type / Table</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Items Summary</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const isPaid = order.paymentStatus === 'paid';
                const isCancelled = order.status === 'cancelled';

                return (
                  <tr
                    key={order.id}
                    id={`order-row-${order.id}`}
                    className="hover:bg-slate-50/80 transition"
                  >
                    {/* Order # */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                      {order.orderNumber}
                    </td>

                    {/* Table / Type */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700 uppercase text-[11px]">
                          {order.orderType}
                        </span>
                        {order.table?.tableNumber && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">
                            {order.table.tableNumber}
                          </span>
                        )}
                      </div>
                      {order.customerName && (
                        <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {order.customerName}
                        </p>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {formatDate(order.createdAt)}
                    </td>

                    {/* Items */}
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="font-semibold">{order.items?.length || 0} items</span>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {order.items?.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          order.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : order.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isCancelled
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {order.paymentStatus}{' '}
                        {order.paymentMethod ? `(${order.paymentMethod})` : ''}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm text-slate-900">
                      {formatCurrency(order.total)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenReceipt(order)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                          title="Print / View Receipt"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                        </button>

                        {!isPaid && !isCancelled && (
                          <>
                            <button onClick={() => openOrderForPayment(order)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700" title="Continue directly to payment"><CreditCard className="w-3.5 h-3.5" />Pay</button>
                            {order.status === 'active' && <button
                              onClick={() => loadOrderToCart(order)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                              title="Edit order items"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                            </button>}
                            <button
                              onClick={() => setVoidTarget(order)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Void / Cancel Order"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmDialog open={Boolean(voidTarget)} title="Cancel this order?" description={`Order ${voidTarget?.orderNumber || ''} will be voided and its table released. This action is recorded in the audit trail.`} confirmLabel="Cancel order" busy={voidBusy} onCancel={() => setVoidTarget(null)} onConfirm={handleVoidOrder} />
    </div>
  );
}
