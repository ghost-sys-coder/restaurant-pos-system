import { useEffect, useState } from 'react';
import { Building2, LoaderCircle, Plus, Save, Settings, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '../utils/formatters.ts';
import PrintOperationsPanel from './PrintOperationsPanel.tsx';

type RestaurantSettings = { receiptName: string; currency: string; taxRateBps: number; timezone: string; inactivityTimeoutMinutes: number };
type AuditEvent = { id: number; action: string; entityType: string | null; entityId: string | null; actorStaffId: number | null; createdAt: string };
type Location = { id: number; name: string; timezone: string };

export default function SettingsView() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationName, setLocationName] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);
  const load = async (clearMessage = true) => {
    setLoading(true); if (clearMessage) setMessage('');
    try {
      const [settingsResponse, auditResponse, locationsResponse] = await Promise.all([fetch('/api/settings'), fetch('/api/audit?limit=100'), fetch('/api/organization/locations')]);
      if (!settingsResponse.ok) throw new Error((await settingsResponse.json().catch(() => ({}))).error || 'Unable to load settings');
      setSettings(await settingsResponse.json());
      if (auditResponse.ok) setEvents(await auditResponse.json());
      if (locationsResponse.ok) setLocations((await locationsResponse.json()).locations || []);
    } catch (error: any) { setMessage(error?.message || 'Unable to load administration data'); }
    finally { setLoading(false); }
  };
  const addLocation = async (event: React.FormEvent) => {
    event.preventDefault(); setLocationBusy(true); setMessage('');
    try {
      const response = await fetch('/api/organization/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: locationName, timezone: settings?.timezone || 'Africa/Kampala' }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to create location');
      setLocations(current => [...current, body]); setLocationName(''); setMessage('Location created');
    } catch (error: any) { setMessage(error?.message || 'Unable to create location'); }
    finally { setLocationBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!settings) return; setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to save settings');
      await load(false); setMessage('Settings saved');
    } catch (error: any) { setMessage(error?.message || 'Unable to save settings'); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="grid flex-1 place-items-center"><LoaderCircle className="size-7 animate-spin text-indigo-600" /></div>;
  return <div className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-6"><div className="mx-auto max-w-5xl space-y-6">
    <header><div className="flex items-center gap-2"><Settings className="size-5 text-indigo-600" /><h1 className="text-xl font-bold">Restaurant settings & audit</h1></div><p className="mt-1 text-sm text-slate-500">Server-owned financial, receipt, timezone, and terminal policies.</p></header>
    {message && <p role="status" className={`rounded-xl border p-3 text-sm ${['Settings saved', 'Location created'].includes(message) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{message}</p>}
    {settings && <form onSubmit={save} className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2"><div className="space-y-1"><Label>Receipt name</Label><Input value={settings.receiptName} onChange={event => setSettings({ ...settings, receiptName: event.target.value })} /></div><div className="space-y-1"><Label>Currency</Label><Input maxLength={3} value={settings.currency} onChange={event => setSettings({ ...settings, currency: event.target.value.toUpperCase() })} /></div><div className="space-y-1"><Label>Tax rate (%)</Label><Input type="number" min="0" max="100" step="0.01" value={settings.taxRateBps / 100} onChange={event => setSettings({ ...settings, taxRateBps: Math.round(Number(event.target.value) * 100) })} /></div><div className="space-y-1"><Label>Timezone</Label><Input value={settings.timezone} onChange={event => setSettings({ ...settings, timezone: event.target.value })} /></div><div className="space-y-1"><Label>Terminal inactivity (minutes)</Label><Input type="number" min="1" max="240" value={settings.inactivityTimeoutMinutes} onChange={event => setSettings({ ...settings, inactivityTimeoutMinutes: Number(event.target.value) })} /></div><div className="flex items-end justify-end"><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />}{saving ? 'Saving…' : 'Save settings'}</Button></div></form>}
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center gap-2 border-b p-4"><ShieldCheck className="size-4 text-indigo-600" /><h2 className="font-bold">Audit trail</h2></div>{events.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Actor</th></tr></thead><tbody className="divide-y">{events.map(item => <tr key={item.id}><td className="whitespace-nowrap p-3 text-slate-500">{formatDate(item.createdAt)}</td><td className="p-3 font-medium">{item.action}</td><td className="p-3 text-slate-600">{item.entityType || '—'} {item.entityId || ''}</td><td className="p-3 text-slate-600">{item.actorStaffId || 'System'}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-500">No audit events recorded yet.</p>}</section>
    <section className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2"><Building2 className="size-4 text-indigo-600" /><h2 className="font-bold">Restaurant locations</h2></div><p className="mt-1 text-xs text-slate-500">Each location has its own terminals, PIN profiles, tables, orders, and kitchen workflow.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{locations.map(location => <div key={location.id} className="rounded-xl border bg-slate-50 p-3"><p className="text-sm font-semibold">{location.name}</p><p className="text-xs text-slate-500">{location.timezone}</p></div>)}</div><form onSubmit={addLocation} className="mt-4 flex gap-2"><Input required minLength={2} maxLength={80} placeholder="New location name" value={locationName} onChange={event => setLocationName(event.target.value)} /><Button type="submit" disabled={locationBusy || locationName.trim().length < 2}>{locationBusy ? <LoaderCircle className="animate-spin" /> : <Plus />}Add location</Button></form></section>
    <PrintOperationsPanel />
  </div></div>;
}
