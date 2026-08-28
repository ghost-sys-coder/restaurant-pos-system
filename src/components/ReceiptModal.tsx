import { usePos } from '../context/PosContext.tsx';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import { X, Printer, CheckCircle2, Flame } from 'lucide-react';

export default function ReceiptModal() {
  const { receiptModalOpen, setReceiptModalOpen, activeReceiptOrder, setActiveReceiptOrder } =
    usePos();

  if (!receiptModalOpen || !activeReceiptOrder) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    setReceiptModalOpen(false);
    setActiveReceiptOrder(null);
  };

  return (
    <div
      id="receipt-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 flex flex-col max-h-[90vh]">
        {/* Modal Top Actions */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Order Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-print-receipt"
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer border border-slate-200 shadow-2xs"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              id="btn-close-receipt"
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Thermal Receipt Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-white font-mono text-slate-700 text-xs space-y-4">
          {/* Header */}
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
            <div className="flex justify-center mb-1">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 tracking-widest uppercase">
              VC POS
            </h3>
            <p className="text-[10px] text-slate-500">1204 Grand Avenue, Suite 400</p>
            <p className="text-[10px] text-slate-500">Tel: (555) 849-2041</p>
          </div>

          {/* Meta Info */}
          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 text-[11px]">
            <div className="flex justify-between">
              <span>Order:</span>
              <span className="font-bold text-slate-900">{activeReceiptOrder.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Type / Table:</span>
              <span>
                {activeReceiptOrder.orderType.toUpperCase()}{' '}
                {activeReceiptOrder.table?.tableNumber && `· ${activeReceiptOrder.table.tableNumber}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(activeReceiptOrder.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Server:</span>
              <span>{activeReceiptOrder.serverName || 'Staff'}</span>
            </div>
            {activeReceiptOrder.customerName && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{activeReceiptOrder.customerName}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-4">
            {activeReceiptOrder.items?.map((it, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between text-slate-800">
                  <span className="truncate pr-2">
                    {it.quantity}x {it.name}
                  </span>
                  <span className="font-bold text-slate-900 shrink-0">
                    {formatCurrency(it.price * it.quantity)}
                  </span>
                </div>
                {it.selectedOptions && (
                  <p className="text-[10px] text-slate-500 pl-4">+{it.selectedOptions}</p>
                )}
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-4 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(activeReceiptOrder.subtotal)}</span>
            </div>
            {activeReceiptOrder.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount:</span>
                <span>-{formatCurrency(activeReceiptOrder.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax (8.5%):</span>
              <span>{formatCurrency(activeReceiptOrder.tax)}</span>
            </div>
            {activeReceiptOrder.tip > 0 && (
              <div className="flex justify-between text-indigo-600 font-semibold">
                <span>Tip:</span>
                <span>+{formatCurrency(activeReceiptOrder.tip)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1">
              <span>TOTAL:</span>
              <span className="text-indigo-600">{formatCurrency(activeReceiptOrder.total)}</span>
            </div>
          </div>

          {/* Payment Info & Barcode */}
          <div className="text-center space-y-2 pt-1 text-[11px]">
            <p className="font-semibold text-emerald-600">
              PAID VIA {(activeReceiptOrder.paymentMethod || 'CARD').toUpperCase()}
            </p>
            <p className="text-[10px] text-slate-500">Thank you for dining with us!</p>

            {/* Simulated barcode */}
            <div className="pt-2 flex flex-col items-center">
              <div className="h-8 w-44 bg-slate-100 border border-slate-200 flex items-center justify-around px-2 rounded">
                {[4, 2, 6, 1, 3, 5, 2, 4, 1, 5, 3, 2, 6, 4, 2, 5].map((w, i) => (
                  <div
                    key={i}
                    className="h-full bg-slate-800"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              <span className="text-[9px] tracking-widest text-slate-400 mt-1">
                {activeReceiptOrder.orderNumber}-POS-TXN
              </span>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
