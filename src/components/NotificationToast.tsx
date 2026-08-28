import { usePos } from '../context/PosContext.tsx';
import { CheckCircle2 } from 'lucide-react';

export default function NotificationToast() {
  const { toastMessage } = usePos();

  if (!toastMessage) return null;

  return (
    <div
      id="pos-toast-notification"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="text-sm font-medium tracking-wide">{toastMessage}</span>
    </div>
  );
}
