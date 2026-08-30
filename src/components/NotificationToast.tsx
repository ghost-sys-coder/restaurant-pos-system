import { usePos } from '../context/PosContext.tsx';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export default function NotificationToast() {
  const { toastMessage, toastKind, dismissToast } = usePos();

  if (!toastMessage) return null;

  return (
    <div
      id="pos-toast-notification"
      role={toastKind === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-6 right-6 z-[90] flex max-w-md items-start gap-3 rounded-xl border px-5 py-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200 ${toastKind === 'error' ? 'border-rose-300 bg-rose-950 text-white' : 'border-slate-700 bg-slate-900 text-white'}`}
    >
      {toastKind === 'error' ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" /> : toastKind === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" /> : <Info className="mt-0.5 size-4 shrink-0 text-sky-300" />}
      <span className="text-sm font-medium tracking-wide">{toastMessage}</span>
      <button type="button" onClick={dismissToast} aria-label="Dismiss notification" className="-mr-2 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
    </div>
  );
}
