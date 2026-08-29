import { useState, type FormEvent } from 'react';
import { LayoutGrid, LoaderCircle, Save, X } from 'lucide-react';
import { RestaurantTable } from '../types.ts';
import { usePos } from '../context/PosContext.tsx';

export default function EditTableModal({ table, onClose }: { table: RestaurantTable; onClose: () => void }) {
  const { fetchData, showToast } = usePos();
  const [tableNumber, setTableNumber] = useState(table.tableNumber);
  const [capacity, setCapacity] = useState(table.capacity || 1);
  const [section, setSection] = useState(table.section || 'Main Dining');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`/api/tables/${table.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: tableNumber.trim(), capacity, section: section.trim() }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to update table');
      await fetchData(); showToast(`Table ${body.tableNumber} updated`); onClose();
    } catch (cause: any) { setError(cause?.message || 'Unable to update table'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl"><header className="flex items-center justify-between border-b p-5"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><LayoutGrid className="size-4" /></span><div><h2 className="text-sm font-bold">Edit table</h2><p className="text-xs text-slate-500">Status and active orders will not be changed.</p></div></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="size-4" /></button></header><div className="space-y-4 p-5"><div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Table identifier / number</label><input autoFocus required maxLength={30} value={tableNumber} onChange={event => setTableNumber(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" /></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Capacity</label><input required type="number" min={1} max={100} value={capacity} onChange={event => setCapacity(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" /></div><div><label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Section</label><input required maxLength={60} value={section} onChange={event => setSection(event.target.value)} list="table-sections" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" /><datalist id="table-sections"><option value="Main Dining" /><option value="Patio" /><option value="Bar" /><option value="VIP" /></datalist></div></div>{error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p>}<div className="flex gap-2 pt-2"><button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Cancel</button><button disabled={busy || !tableNumber.trim() || !section.trim()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{busy ? 'Saving…' : 'Save changes'}</button></div></div></form></div>;
}
