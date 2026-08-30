import { useEffect, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, Coins, Globe2, LoaderCircle, MapPin, Percent, Plus, ReceiptText, Save, Settings, ShieldCheck, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import PrintOperationsPanel from './PrintOperationsPanel.tsx';

type RestaurantSettings = { receiptName: string; currency: string; taxRateBps: number; timezone: string; inactivityTimeoutMinutes: number };
type AuditEvent = { id: number; action: string; entityType: string | null; entityId: string | null; actorStaffId: number | null; createdAt: string; metadata?: { amount?: number; currency?: string; extras?: Array<{ name: string; price: number; quantity: number }> } | null };
type Location = { id: number; name: string; timezone: string };
type SettingsCache = { settings: RestaurantSettings; events: AuditEvent[]; locations: Location[] };
const settingsCache = new Map<number, SettingsCache>();

export default function SettingsView() {
  const { terminal } = useAuth();
  const cacheKey = terminal?.locationId ?? 0;
  const cachedSettings = settingsCache.get(cacheKey);
  const [settings, setSettings] = useState<RestaurantSettings | null>(cachedSettings?.settings ?? null);
  const [events, setEvents] = useState<AuditEvent[]>(cachedSettings?.events ?? []);
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(!cachedSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [locations, setLocations] = useState<Location[]>(cachedSettings?.locations ?? []);
  const [locationName, setLocationName] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);

  const load = async ({ showLoader = false, clearMessage = true }: { showLoader?: boolean; clearMessage?: boolean } = {}) => {
    if (showLoader) setLoading(true);
    if (clearMessage) setMessage('');
    try {
      const [settingsResponse, auditResponse, locationsResponse] = await Promise.all([
        fetch('/api/settings'), fetch('/api/audit?limit=100'), fetch('/api/organization/locations'),
      ]);
      if (!settingsResponse.ok) throw new Error((await settingsResponse.json().catch(() => ({}))).error || 'Unable to load settings');
      const nextSettings = await settingsResponse.json();
      const nextEvents = auditResponse.ok ? await auditResponse.json() : events;
      const nextLocations = locationsResponse.ok ? (await locationsResponse.json()).locations || [] : locations;
      setSettings(nextSettings);
      setEvents(nextEvents);
      setLocations(nextLocations);
      settingsCache.set(cacheKey, { settings: nextSettings, events: nextEvents, locations: nextLocations });
    } catch (error: any) {
      setMessage(error?.message || 'Unable to load administration data');
    } finally { setLoading(false); }
  };

  const addLocation = async (event: React.FormEvent) => {
    event.preventDefault(); setLocationBusy(true); setMessage('');
    try {
      const response = await fetch('/api/organization/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: locationName, timezone: settings?.timezone || 'Africa/Kampala' }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to create location');
      setLocations(current => { const next = [...current, body]; const cached = settingsCache.get(cacheKey); if (cached) settingsCache.set(cacheKey, { ...cached, locations: next }); return next; }); setLocationName(''); setMessage('Location created');
    } catch (error: any) { setMessage(error?.message || 'Unable to create location'); }
    finally { setLocationBusy(false); }
  };

  useEffect(() => { void load({ showLoader: !cachedSettings }); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!settings) return; setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to save settings');
      await load({ clearMessage: false }); setMessage('Settings saved');
    } catch (error: any) { setMessage(error?.message || 'Unable to save settings'); }
    finally { setSaving(false); }
  };

  const auditPageSize = 10;
  const auditPageCount = Math.max(1, Math.ceil(events.length / auditPageSize));
  const visibleAuditEvents = events.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize);

  if (loading) return <div className="grid flex-1 place-items-center"><LoaderCircle className="size-7 animate-spin text-indigo-600" /></div>;

  return <div className="flex-1 overflow-y-auto bg-slate-50/80 px-4 py-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"><Settings className="size-5" /></div><div><h1 className="text-xl font-bold tracking-tight text-slate-950">Restaurant settings</h1><p className="mt-1 text-sm text-slate-500">Manage financial defaults, locations, printing, and operational policies.</p></div></header>
    {message && <p role="status" className={`rounded-xl border p-3 text-sm ${['Settings saved', 'Location created'].includes(message) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{message}</p>}

    {settings && <form onSubmit={save} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40"><div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><ReceiptText className="size-4 text-indigo-600" /><h2 className="font-bold text-slate-900">Business defaults</h2></div><p className="mt-1 text-xs text-slate-500">Used for receipts, order calculations, and terminal security.</p></div><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-6">
      <div className="space-y-2 sm:col-span-2 lg:col-span-3"><Label htmlFor="receipt-name"><ReceiptText className="size-3.5 text-slate-400" />Receipt name</Label><Input id="receipt-name" className="h-11 bg-white px-3" value={settings.receiptName} onChange={event => setSettings({ ...settings, receiptName: event.target.value })} /></div>
      <div className="space-y-2 lg:col-span-1"><Label htmlFor="currency"><Coins className="size-3.5 text-slate-400" />Currency</Label><Input id="currency" className="h-11 bg-white px-3 font-mono uppercase" maxLength={3} value={settings.currency} onChange={event => setSettings({ ...settings, currency: event.target.value.toUpperCase() })} /></div>
      <div className="space-y-2 lg:col-span-2"><Label htmlFor="tax-rate"><Percent className="size-3.5 text-slate-400" />Tax rate</Label><div className="relative"><Input id="tax-rate" className="h-11 bg-white px-3 pr-10" type="number" min="0" max="100" step="0.01" value={settings.taxRateBps / 100} onChange={event => setSettings({ ...settings, taxRateBps: Math.round(Number(event.target.value) * 100) })} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span></div></div>
      <div className="space-y-2 lg:col-span-3"><Label htmlFor="timezone"><Globe2 className="size-3.5 text-slate-400" />Timezone</Label><Input id="timezone" className="h-11 bg-white px-3" value={settings.timezone} onChange={event => setSettings({ ...settings, timezone: event.target.value })} /></div>
      <div className="space-y-2 lg:col-span-3"><Label htmlFor="terminal-timeout"><Timer className="size-3.5 text-slate-400" />Terminal inactivity</Label><div className="relative"><Input id="terminal-timeout" className="h-11 bg-white px-3 pr-20" type="number" min="1" max="240" value={settings.inactivityTimeoutMinutes} onChange={event => setSettings({ ...settings, inactivityTimeoutMinutes: Number(event.target.value) })} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">minutes</span></div></div>
    </div><div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/70 px-5 py-3"><Button className="h-10 min-w-36 px-4" type="submit" disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />}{saving ? 'Saving...' : 'Save settings'}</Button></div></form>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-indigo-600" /><h2 className="font-bold">Audit trail</h2></div>{events.length > 0 && <span className="text-xs text-slate-400">{events.length} recent events</span>}</div>{events.length ? <><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Actor</th></tr></thead><tbody className="divide-y">{visibleAuditEvents.map(item => <tr key={item.id} className={item.action === 'order.open_modifier.charged' ? 'bg-fuchsia-50/80 hover:bg-fuchsia-100/80' : item.action === 'order.open_modifier.approved' ? 'bg-amber-50/80 hover:bg-amber-100/80' : 'hover:bg-slate-50/70'}><td className="whitespace-nowrap p-3 text-slate-500">{formatDate(item.createdAt)}</td><td className="p-3 font-medium">{item.action === 'order.open_modifier.charged' ? <div><span className="inline-flex rounded-full bg-fuchsia-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-fuchsia-800">Paid unlisted extra</span><p className="mt-1 font-bold text-fuchsia-900">{formatCurrency(Number(item.metadata?.amount || 0))}</p><p className="mt-1 max-w-sm text-[11px] text-fuchsia-700">{item.metadata?.extras?.map(extra => extra.quantity + '× ' + extra.name).join(', ')}</p></div> : item.action === 'order.open_modifier.approved' ? <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Manager approved open modifier</span> : item.action}</td><td className="p-3 text-slate-600">{item.entityType || '-'} {item.entityId || ''}</td><td className="p-3 text-slate-600">{item.actorStaffId || 'System'}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3"><p className="text-xs text-slate-500">Page <span className="font-semibold text-slate-700">{auditPage}</span> of {auditPageCount}</p><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={auditPage === 1} onClick={() => setAuditPage(page => Math.max(1, page - 1))}><ChevronLeft />Previous</Button><Button type="button" size="sm" variant="outline" disabled={auditPage === auditPageCount} onClick={() => setAuditPage(page => Math.min(auditPageCount, page + 1))}>Next<ChevronRight /></Button></div></div></> : <p className="p-8 text-center text-sm text-slate-500">No audit events recorded yet.</p>}</section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40"><div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><Building2 className="size-4 text-indigo-600" /><h2 className="font-bold">Restaurant locations</h2></div><p className="mt-1 text-xs text-slate-500">Each location has its own terminals, PIN profiles, tables, orders, and kitchen workflow.</p></div><div className="p-5"><div className="grid gap-3 sm:grid-cols-2">{locations.map(location => <div key={location.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-indigo-600 ring-1 ring-slate-200"><MapPin className="size-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{location.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{location.timezone}</p></div></div>)}</div><form onSubmit={addLocation} className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><Label htmlFor="location-name" className="mb-2">Add another location</Label><div className="flex flex-col gap-3 sm:flex-row"><Input id="location-name" className="h-11 flex-1 bg-white px-3" required minLength={2} maxLength={80} placeholder="Enter location name" value={locationName} onChange={event => setLocationName(event.target.value)} /><Button className="h-11 px-5" type="submit" disabled={locationBusy || locationName.trim().length < 2}>{locationBusy ? <LoaderCircle className="animate-spin" /> : <Plus />}Add location</Button></div></form></div></section>
    <PrintOperationsPanel />
  </div></div>;
}
