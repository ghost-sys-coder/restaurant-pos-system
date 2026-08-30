import { ArrowRight, LoaderCircle, X } from 'lucide-react';
import { useState } from 'react';
import type { Order, RestaurantTable } from '../types.ts';
import { usePos } from '../context/PosContext.tsx';

export default function TransferTableModal({ order, source, onClose }: { order: Order; source: RestaurantTable; onClose: () => void }) {
  const { tables, fetchData, showToast } = usePos();
  const targets = tables.filter(table => table.id !== source.id && !table.currentOrderId && ['available', 'reserved'].includes(table.status));
  const [targetId, setTargetId] = useState<number | null>(targets[0]?.id ?? null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    if (!targetId) return; setBusy(true); setError('');
    try {
      const response = await fetch(`/api/orders/${order.id}/transfer-table`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetTableId: targetId }) });
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Unable to transfer table');
      const target = tables.find(table => table.id === targetId); await fetchData(); showToast(`${order.orderNumber} moved to ${target?.tableNumber || 'the new table'}`); onClose();
    } catch (cause: any) { setError(cause?.message || 'Unable to transfer table'); } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="transfer-title" className="w-full max-w-md rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-5"><div><h2 id="transfer-title" className="font-bold">Transfer active order</h2><p className="text-xs text-slate-500">Move {order.orderNumber} from {source.tableNumber} without recreating it.</p></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="size-4" /></button></header><div className="space-y-4 p-5"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold"><span>{source.tableNumber}</span><ArrowRight className="size-4 text-indigo-600" /><select value={targetId ?? ''} onChange={event => setTargetId(Number(event.target.value))} className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2"><option value="" disabled>Select destination</option>{targets.map(table => <option key={table.id} value={table.id}>{table.tableNumber} · {table.section}{table.status === 'reserved' ? ' (reserved)' : ''}</option>)}</select></div>{!targets.length && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">There are no available destination tables.</p>}{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}<div className="flex gap-2"><button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold">Cancel</button><button onClick={submit} disabled={!targetId || busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy && <LoaderCircle className="size-4 animate-spin" />}Transfer order</button></div></div></section></div>;
}
