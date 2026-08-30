import { useEffect, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Boxes, ChefHat, LoaderCircle, PackagePlus, Plus, RefreshCw, Save, TriangleAlert, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../context/AuthContext.tsx';
import { usePos } from '../context/PosContext.tsx';

type StockItem = { id: number; name: string; sku: string | null; unit: string; onHandMilliunits: number; reorderLevelMilliunits: number };
type Movement = { id: number; inventoryItemId: number; deltaMilliunits: number; movementType: string; reason: string; createdAt: string };

const units = ['each', 'g', 'kg', 'ml', 'l'];
const displayQuantity = (value: number) => (value / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 });
const inventoryCache = new Map<number, { items: StockItem[]; movements: Movement[] }>();

export default function InventoryView() {
  const { menuItems, showToast } = usePos();
  const { terminal } = useAuth();
  const cacheKey = terminal?.locationId ?? 0;
  const cachedInventory = inventoryCache.get(cacheKey);
  const [items, setItems] = useState<StockItem[]>(cachedInventory?.items ?? []);
  const [movements, setMovements] = useState<Movement[]>(cachedInventory?.movements ?? []);
  const [loading, setLoading] = useState(!cachedInventory);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('each');
  const [opening, setOpening] = useState('0');
  const [reorder, setReorder] = useState('0');
  const [adjustId, setAdjustId] = useState<number | null>(null);
  const [adjustment, setAdjustment] = useState('');
  const [movementType, setMovementType] = useState('receipt');
  const [reason, setReason] = useState('');
  const [recipeMenuId, setRecipeMenuId] = useState<number | null>(menuItems[0]?.id || null);
  const [recipeRows, setRecipeRows] = useState<Array<{ inventoryItemId: number; quantity: string }>>([]);

  const load = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch('/api/inventory');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setItems(body.items);
      setMovements(body.movements);
      inventoryCache.set(cacheKey, { items: body.items, movements: body.movements });
    } catch (error: any) { showToast(error.message || 'Unable to load inventory'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(!cachedInventory); }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, sku, unit, onHandMilliunits: Math.round(Number(opening) * 1000), reorderLevelMilliunits: Math.round(Number(reorder) * 1000) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setName(''); setSku(''); setOpening('0'); setReorder('0'); await load(); showToast('Inventory item created');
    } catch (error: any) { showToast(error.message); }
    finally { setBusy(false); }
  };

  const adjust = async (event: React.FormEvent) => {
    event.preventDefault(); if (!adjustId) return; setBusy(true);
    try {
      const factor = movementType === 'waste' ? -1 : 1;
      const response = await fetch(`/api/inventory/${adjustId}/adjustments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deltaMilliunits: Math.round(Math.abs(Number(adjustment)) * 1000) * factor, movementType, reason }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setAdjustId(null); setAdjustment(''); setReason(''); await load(); showToast('Stock movement recorded');
    } catch (error: any) { showToast(error.message); }
    finally { setBusy(false); }
  };

  const saveRecipe = async () => {
    if (!recipeMenuId) return; setBusy(true);
    try {
      const ingredients = recipeRows.filter(row => row.inventoryItemId && Number(row.quantity) > 0).map(row => ({ inventoryItemId: row.inventoryItemId, quantityMilliunits: Math.round(Number(row.quantity) * 1000) }));
      const response = await fetch(`/api/menu-items/${recipeMenuId}/recipe`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingredients }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      showToast('Menu recipe saved');
    } catch (error: any) { showToast(error.message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="grid flex-1 place-items-center bg-slate-50"><LoaderCircle className="size-7 animate-spin text-indigo-600" /></div>;

  const lowStockCount = items.filter(item => item.onHandMilliunits <= item.reorderLevelMilliunits).length;
  const selectedItem = items.find(item => item.id === adjustId);

  return <div className="flex-1 overflow-y-auto bg-slate-50/80 px-4 py-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200"><Boxes className="size-5" /></div><div><h1 className="text-xl font-bold tracking-tight text-slate-950">Inventory & recipes</h1><p className="mt-1 text-sm text-slate-500">Monitor stock health, record movements, and connect ingredients to menu items.</p></div></div><Button className="h-10 self-start bg-white" variant="outline" onClick={() => void load(false)}><RefreshCw />Refresh inventory</Button></header>

    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Boxes className="size-4" /></span><Badge variant="secondary">Live</Badge></div><p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{items.length}</p><p className="mt-1 text-xs font-medium text-slate-500">Tracked stock items</p></div>
      <div className={`rounded-2xl border p-4 shadow-sm ${lowStockCount ? 'border-amber-200 bg-amber-50/70 shadow-amber-100/60' : 'border-slate-200 bg-white shadow-slate-200/40'}`}><div className="flex items-center justify-between"><span className={`grid size-9 place-items-center rounded-xl ${lowStockCount ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'}`}><TriangleAlert className="size-4" /></span><span className={`text-xs font-semibold ${lowStockCount ? 'text-amber-700' : 'text-emerald-700'}`}>{lowStockCount ? 'Needs attention' : 'Healthy'}</span></div><p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{lowStockCount}</p><p className="mt-1 text-xs font-medium text-slate-500">At or below reorder level</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><Activity className="size-4" /></span><span className="text-xs font-semibold text-slate-400">Recent</span></div><p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{movements.length}</p><p className="mt-1 text-xs font-medium text-slate-500">Recorded stock movements</p></div>
    </section>

    <form onSubmit={create} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40"><div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4"><span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><PackagePlus className="size-4" /></span><div><h2 className="font-bold text-slate-900">Add inventory item</h2><p className="mt-0.5 text-xs text-slate-500">Create a trackable ingredient, supply, or packaged item.</p></div></div><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-12"><div className="space-y-2 lg:col-span-3"><Label htmlFor="inventory-name">Item name</Label><Input id="inventory-name" className="h-11 bg-white px-3" required value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Nile perch fillet" /></div><div className="space-y-2 lg:col-span-2"><Label htmlFor="inventory-sku">SKU</Label><Input id="inventory-sku" className="h-11 bg-white px-3 font-mono" value={sku} onChange={event => setSku(event.target.value)} placeholder="Optional" /></div><div className="space-y-2 lg:col-span-2"><Label>Unit</Label><Select value={unit} onValueChange={value => setUnit(value ?? 'each')}><SelectTrigger className="w-full bg-white data-[size=default]:h-11"><SelectValue /></SelectTrigger><SelectContent>{units.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2 lg:col-span-2"><Label htmlFor="opening-stock">Opening stock</Label><Input id="opening-stock" className="h-11 bg-white px-3" type="number" min="0" step="0.001" value={opening} onChange={event => setOpening(event.target.value)} /></div><div className="space-y-2 lg:col-span-2"><Label htmlFor="reorder-level">Reorder at</Label><Input id="reorder-level" className="h-11 bg-white px-3" type="number" min="0" step="0.001" value={reorder} onChange={event => setReorder(event.target.value)} /></div><div className="space-y-2 sm:col-span-2 lg:col-span-1"><Label className="invisible" aria-hidden="true">Action</Label><Button type="submit" className="h-11 w-full px-4" disabled={busy || !name.trim()} aria-label="Add inventory item" aria-busy={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Plus />}</Button></div></div></form>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">Stock overview</h2><p className="mt-0.5 text-xs text-slate-500">Current quantities and replenishment thresholds.</p></div><Badge variant="outline">{items.length} items</Badge></div>{items.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Item</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">On hand</th><th className="px-5 py-3">Reorder level</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item => { const isLow = item.onHandMilliunits <= item.reorderLevelMilliunits; return <tr key={item.id} className="transition-colors hover:bg-slate-50/70"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{item.name}</div><div className="mt-0.5 font-mono text-[11px] text-slate-400">{item.sku || 'No SKU'}</div></td><td className="px-5 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{isLow ? 'Low stock' : 'In stock'}</span></td><td className="px-5 py-4"><span className="font-mono font-semibold text-slate-900">{displayQuantity(item.onHandMilliunits)}</span> <span className="text-xs text-slate-400">{item.unit}</span></td><td className="px-5 py-4 text-slate-600">{displayQuantity(item.reorderLevelMilliunits)} <span className="text-xs text-slate-400">{item.unit}</span></td><td className="px-5 py-4 text-right"><Button size="sm" variant={adjustId === item.id ? 'secondary' : 'outline'} onClick={() => setAdjustId(item.id)}>Record movement</Button></td></tr>; })}</tbody></table></div> : <div className="grid place-items-center px-5 py-12 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Boxes className="size-5" /></span><p className="mt-3 text-sm font-semibold text-slate-700">No inventory items yet</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Add your first ingredient or supply above to begin tracking stock.</p></div>}</section>

    {adjustId && <form onSubmit={adjust} className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-md shadow-indigo-100/60"><div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/70 px-5 py-4"><div><p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Stock movement</p><h2 className="mt-0.5 font-bold text-slate-900">{selectedItem?.name || 'Selected item'}</h2></div><Button type="button" size="icon" variant="ghost" onClick={() => setAdjustId(null)} aria-label="Close movement form"><X /></Button></div><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-2"><Label>Movement type</Label><Select value={movementType} onValueChange={value => setMovementType(value ?? 'receipt')}><SelectTrigger className="w-full bg-white data-[size=default]:h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="receipt">Receipt (+)</SelectItem><SelectItem value="waste">Waste (-)</SelectItem><SelectItem value="adjustment">Adjustment (+)</SelectItem><SelectItem value="count">Count variance (+)</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="movement-quantity">Quantity</Label><Input id="movement-quantity" className="h-11 bg-white px-3" required type="number" min="0.001" step="0.001" value={adjustment} onChange={event => setAdjustment(event.target.value)} placeholder="0.000" /></div><div className="space-y-2 lg:col-span-2"><Label htmlFor="movement-reason">Reason</Label><Input id="movement-reason" className="h-11 bg-white px-3" required value={reason} onChange={event => setReason(event.target.value)} placeholder="Delivery, spoilage, stock count..." /></div></div><div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-5 py-3"><Button className="h-10 px-4" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />}Save movement</Button></div></form>}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40"><div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4"><span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><ChefHat className="size-4" /></span><div><h2 className="font-bold text-slate-900">Menu recipe</h2><p className="mt-0.5 text-xs text-slate-500">Deduct ingredients automatically when a kitchen item is served.</p></div></div><div className="p-5"><Label className="mb-2">Menu item</Label><Select value={recipeMenuId ? String(recipeMenuId) : null} onValueChange={value => { setRecipeMenuId(value ? Number(value) : null); setRecipeRows([]); }}><SelectTrigger className="h-11 w-full bg-white"><SelectValue placeholder="Select menu item" /></SelectTrigger><SelectContent>{menuItems.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select><div className="mt-4 space-y-3">{recipeRows.map((row, index) => <div key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[minmax(0,1fr)_120px_auto]"><Select value={row.inventoryItemId ? String(row.inventoryItemId) : null} onValueChange={selected => setRecipeRows(current => current.map((value, rowIndex) => rowIndex === index ? { ...value, inventoryItemId: selected ? Number(selected) : 0 } : value))}><SelectTrigger className="w-full bg-white data-[size=default]:h-10"><SelectValue placeholder="Ingredient" /></SelectTrigger><SelectContent>{items.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name} ({item.unit})</SelectItem>)}</SelectContent></Select><Input className="h-10 bg-white px-3" type="number" min="0.001" step="0.001" placeholder="Quantity" value={row.quantity} onChange={event => setRecipeRows(current => current.map((value, rowIndex) => rowIndex === index ? { ...value, quantity: event.target.value } : value))} /><Button type="button" size="icon" variant="ghost" onClick={() => setRecipeRows(current => current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove ingredient"><X /></Button></div>)}{recipeRows.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-xs text-slate-500">No ingredients added to this recipe.</div>}</div><div className="mt-4 flex flex-wrap justify-between gap-2"><Button type="button" variant="outline" onClick={() => setRecipeRows(current => [...current, { inventoryItemId: items[0]?.id || 0, quantity: '' }])} disabled={!items.length}><Plus />Add ingredient</Button><Button type="button" disabled={busy || !recipeMenuId} onClick={saveRecipe}><Save />Save recipe</Button></div></div></section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">Recent movements</h2><p className="mt-0.5 text-xs text-slate-500">Latest stock changes at this location.</p></div><Activity className="size-4 text-slate-400" /></div><div className="max-h-[430px] overflow-y-auto p-3">{movements.length ? <div className="space-y-1">{movements.slice(0, 20).map(movement => { const incoming = movement.deltaMilliunits >= 0; return <div key={movement.id} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${incoming ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{incoming ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{items.find(item => item.id === movement.inventoryItemId)?.name || 'Inventory item'}</p><p className="mt-0.5 truncate text-[11px] capitalize text-slate-500">{movement.movementType} / {movement.reason}</p></div><span className={`font-mono text-xs font-bold ${incoming ? 'text-emerald-700' : 'text-rose-600'}`}>{incoming ? '+' : ''}{displayQuantity(movement.deltaMilliunits)}</span></div>; })}</div> : <div className="grid place-items-center px-4 py-12 text-center"><Activity className="size-6 text-slate-300" /><p className="mt-2 text-xs font-medium text-slate-500">No stock movements recorded</p></div>}</div></section>
    </div>
  </div></div>;
}
