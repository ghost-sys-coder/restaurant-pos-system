import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { formatCurrency } from '../utils/formatters.ts';
import { X, Users, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';
import { Order } from '../types.ts';

export default function SplitBillModal({
  order,
  onClose,
  onPaidShare,
}: {
  order: Order | null;
  onClose: () => void;
  onPaidShare?: () => void;
}) {
  const { splitBillModalOpen, setSplitBillModalOpen, total, showToast } = usePos();
  const [splitCount, setSplitCount] = useState<number>(2);
  const [paidShares, setPaidShares] = useState<number[]>([]);

  if (!splitBillModalOpen) return null;

  const targetTotal = order ? order.total : total;
  const perPersonAmount = Math.ceil(targetTotal / splitCount);

  const handlePayShare = (index: number, method: string) => {
    if (!paidShares.includes(index)) {
      setPaidShares((prev) => [...prev, index]);
      showToast(`Guest #${index + 1} paid ${formatCurrency(perPersonAmount)} via ${method}`);
    }
  };

  const handleAllPaid = () => {
    showToast('All split shares have been fully settled!');
    setSplitBillModalOpen(false);
    if (onPaidShare) onPaidShare();
    onClose();
  };

  const isComplete = paidShares.length === splitCount;

  return (
    <div
      id="split-bill-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Split Bill by Guests</h3>
              <p className="text-xs text-slate-500">Total Check: {formatCurrency(targetTotal)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Split Count Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Number of Ways to Split:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setSplitCount(num);
                    setPaidShares([]);
                  }}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center ${
                    splitCount === num
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  <span className="text-sm">{num}</span>
                  <span className="text-[10px] opacity-80">Guests</span>
                </button>
              ))}
            </div>
          </div>

          {/* Per Person Amount Callout */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Each Guest Pays:</span>
            <span className="text-lg font-extrabold font-mono text-indigo-600">
              {formatCurrency(perPersonAmount)}
            </span>
          </div>

          {/* Individual Shares List */}
          <div className="space-y-2.5 pt-2">
            {Array.from({ length: splitCount }).map((_, idx) => {
              const isPaid = paidShares.includes(idx);
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isPaid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isPaid
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold">Guest {idx + 1}</p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {formatCurrency(perPersonAmount)}
                      </p>
                    </div>
                  </div>

                  {isPaid ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settled</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePayShare(idx, 'card')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-200"
                      >
                        <CreditCard className="w-3 h-3 text-indigo-600" />
                        <span>Card</span>
                      </button>
                      <button
                        onClick={() => handlePayShare(idx, 'cash')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-200"
                      >
                        <Banknote className="w-3 h-3 text-emerald-600" />
                        <span>Cash</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-3">
          <span className="text-xs text-slate-500">
            {paidShares.length} of {splitCount} shares paid
          </span>

          <button
            disabled={!isComplete}
            onClick={handleAllPaid}
            className={`py-2.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
              isComplete
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Complete All Splits
          </button>
        </div>
      </div>
    </div>
  );
}
