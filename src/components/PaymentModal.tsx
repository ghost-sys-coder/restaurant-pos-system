import { useEffect, useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import SplitBillModal from './SplitBillModal.tsx';
import { formatCurrency } from '../utils/formatters.ts';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Users,
  CheckCircle2,
  Receipt,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentMethod } from '../types.ts';

export default function PaymentModal() {
  const {
    paymentModalOpen,
    setPaymentModalOpen,
    total,
    checkoutOrder,
    processPayment,
    setActiveReceiptOrder,
    setReceiptModalOpen,
    setSplitBillModalOpen,
    isSubmitting,
  } = usePos();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [paymentKey, setPaymentKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (paymentModalOpen) {
      const alreadyPaid = checkoutOrder?.payments?.filter(payment => payment.status === 'success').reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const outstanding = checkoutOrder ? Math.max(0, checkoutOrder.total - alreadyPaid) : total;
      setPaymentKey(crypto.randomUUID());
      setPaymentError('');
      setPaymentSuccess(false);
      setCashTendered(outstanding);
    }
  }, [paymentModalOpen, checkoutOrder?.id, total]);

  if (!paymentModalOpen) return null;

  const targetOrder = checkoutOrder;

  const paidAmount = targetOrder?.payments?.filter(payment => payment.status === 'success').reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const orderTotal = targetOrder ? Math.max(0, targetOrder.total - paidAmount) : total;

  const handleProcessPayment = async () => {
    if (!targetOrder) return;
    if (paymentMethod === 'cash' && cashTendered < orderTotal) { setPaymentError('Cash tendered must cover the outstanding balance.'); return; }
    setIsProcessing(true);
    setPaymentError('');

    try {
      const updatedOrder = await processPayment(
        targetOrder.id,
        orderTotal,
        paymentMethod,
        0,
        paymentMethod === 'cash' ? cashTendered : orderTotal,
        paymentKey,
      );

      if (updatedOrder) {
        setIsProcessing(false);
        setPaymentSuccess(true);
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        setTimeout(() => {
          setPaymentModalOpen(false);
          setPaymentSuccess(false);
          setActiveReceiptOrder(updatedOrder);
          setReceiptModalOpen(true);
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setPaymentError(err?.message || 'Payment could not be processed');
      setIsProcessing(false);
    }
  };

  const changeDue = Math.max(0, cashTendered - orderTotal);

  return (
    <div
      id="payment-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Process Payment</h3>
              <p className="text-xs text-slate-500">
                Order {targetOrder?.orderNumber || '#1001'} · Total Due:{' '}
                <span className="font-bold text-indigo-600">{formatCurrency(orderTotal)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setPaymentModalOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {paymentSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">Payment Approved!</h3>
              <p className="text-xs text-slate-500 font-mono">
                {formatCurrency(orderTotal)} settled successfully · Generating Receipt...
              </p>
            </div>
          ) : (
            <>
              {/* Payment Methods Grid */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'split', label: 'Split Bill', icon: Users },
                  { id: 'mtn_momo_uganda', label: 'MTN MoMo · Soon', icon: Smartphone, disabled: true },
                  { id: 'airtel_money_uganda', label: 'Airtel · Soon', icon: Smartphone, disabled: true },
                  { id: 'card', label: 'Card · Soon', icon: CreditCard, disabled: true },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={m.disabled}
                      onClick={() => {
                        if (m.id === 'split') {
                          setSplitBillModalOpen(true);
                        } else {
                          setPaymentMethod(m.id as PaymentMethod);
                        }
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : m.disabled ? 'cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400 opacity-70' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
              {paymentError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{paymentError}</p>}

              {/* CARD SIMULATOR */}
              {paymentMethod === 'card' && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4">
                  <div className="w-20 h-28 mx-auto rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 p-3 flex flex-col justify-between text-left border border-slate-600 shadow-lg relative overflow-hidden group">
                    <div className="w-6 h-4 rounded bg-amber-400/90 border border-amber-300" />
                    <div className="space-y-1">
                      <div className="w-12 h-1.5 bg-slate-400 rounded" />
                      <div className="w-8 h-1.5 bg-slate-500 rounded" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Tap, Insert Chip, or Swipe Customer Card
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Integrated EMV / Contactless Reader Ready
                    </p>
                  </div>
                </div>
              )}

              {/* CASH TENDERED CALCULATOR */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Total Due:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(orderTotal)}
                    </span>
                  </div>

                  {/* Fast Tender Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Exact', amount: orderTotal },
                      { label: '50K', amount: 50000 },
                      { label: '100K', amount: 100000 },
                      { label: '200K', amount: 200000 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setCashTendered(btn.amount)}
                        className={`py-2 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                          cashTendered === btn.amount
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Change Due Display */}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Change Due:</span>
                    <span className="font-mono text-base font-extrabold text-emerald-600">
                      {formatCurrency(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* DIGITAL WALLET / APPLE PAY */}
              {paymentMethod === 'digital' && (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Smartphone className="w-6 h-6 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    Hold phone or smartwatch near NFC reader
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Apple Pay, Google Pay, Samsung Pay supported
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Action */}
        {!paymentSuccess && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              id="btn-confirm-terminal-payment"
              disabled={isProcessing || isSubmitting || !targetOrder || (paymentMethod === 'cash' && cashTendered < orderTotal)}
              onClick={handleProcessPayment}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-xs ${
                !isProcessing && !isSubmitting
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <span>Recording payment...</span>
              ) : (
                <>
                  <span>Charge {formatCurrency(orderTotal)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <SplitBillModal
        order={targetOrder}
        onClose={() => setSplitBillModalOpen(false)}
        onPayShare={async (amount, method, idempotencyKey) => {
          if (!targetOrder) return null;
          return processPayment(targetOrder.id, amount, method, 0, amount, idempotencyKey);
        }}
        onComplete={(updatedOrder) => {
          setPaymentModalOpen(false);
          setActiveReceiptOrder(updatedOrder);
          setReceiptModalOpen(true);
        }}
      />
    </div>
  );
}
