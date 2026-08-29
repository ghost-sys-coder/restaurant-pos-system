import { createPortal } from 'react-dom';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConfirmDialog({ open, title, description, confirmLabel, busy = false, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return createPortal(<div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}><div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"><div className="mb-4 grid size-11 place-items-center rounded-full bg-rose-100 text-rose-700"><AlertTriangle className="size-5" /></div><h2 id="confirm-title" className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>{busy && <LoaderCircle className="animate-spin" />}{busy ? 'Working…' : confirmLabel}</Button></div></div></div>, document.body);
}
