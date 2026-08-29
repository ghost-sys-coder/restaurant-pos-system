import { useEffect, useState } from 'react';
import { useClerk } from '@clerk/react';
import { ArrowLeft, Delete, Flame, LoaderCircle, LockKeyhole, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { useAuth, type StaffProfile } from '../context/AuthContext.tsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const roleLabels: Record<string, string> = { restaurant_owner: 'Restaurant Owner', restaurant_admin: 'Restaurant Admin', general_manager: 'General Manager', accountant: 'Accountant', shift_manager: 'Shift Manager', cashier: 'Cashier', server: 'Server', bartender: 'Bartender', host: 'Host', kitchen: 'Kitchen' };

function LegacyTerminalSetupScreen() {
  const { enrollTerminal } = useAuth();
  const { signOut } = useClerk();
  const [name, setName] = useState('Front Counter');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await enrollTerminal(name.trim(), pin);
    } catch (error: any) {
      setMessage(error?.message || 'Terminal authorization failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6">
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white text-slate-900 p-7 shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white grid place-items-center mb-6"><MonitorSmartphone /></div>
      <h1 className="text-2xl font-bold">Set up this terminal</h1>
      <p className="text-sm text-slate-500 mt-2 mb-6">Connect this device to your restaurant. Staff will use their personal PIN after setup.</p>
      <div className="space-y-2 mb-5"><Label htmlFor="terminal-name">Terminal name</Label><Input id="terminal-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} /></div>
      <div className="space-y-2 mb-5"><Label htmlFor="admin-pin">Create your administrator PIN</Label><Input id="admin-pin" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" type="password" placeholder="4–6 digits" /></div>
      <div aria-live="polite" aria-atomic="true">
        {message && <p role="alert" className="text-sm font-medium text-rose-700 mb-4">{message}</p>}
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={busy || name.trim().length < 2 || pin.length < 4}>
        {busy ? 'Authorizing terminal…' : 'Authorize terminal'}
      </Button>
      <button type="button" onClick={() => signOut()} className="w-full text-xs text-slate-500 mt-4 hover:text-slate-900">Use a different administrator</button>
    </form>
  </main>;
}

export function TerminalSetupScreen() {
  const { enrollTerminal } = useAuth();
  const { signOut } = useClerk();
  const [name, setName] = useState('Front Counter');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<Array<{ id: number; name: string; type: string }>>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    fetch('/api/access/terminal/options').then(async response => {
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error(body.error || 'Unable to load terminals');
      setOptions(body);
      if (body[0]) { setSelectedTerminalId(body[0].id); setName(body[0].name); }
    }).catch(error => setMessage(error?.message || 'Unable to load terminals')).finally(() => setLoadingOptions(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try { await enrollTerminal(name.trim(), pin, 'register', selectedTerminalId || undefined); }
    catch (error: any) { setMessage(error?.message || 'Terminal authorization failed. Please try again.'); }
    finally { setBusy(false); }
  };

  const reconnecting = options.length > 0;
  return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white text-slate-900 p-7 shadow-2xl">
    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white grid place-items-center mb-6"><MonitorSmartphone /></div>
    <h1 className="text-2xl font-bold">{reconnecting ? 'Reconnect this terminal' : 'Set up this terminal'}</h1>
    <p className="text-sm text-slate-500 mt-2 mb-6">{reconnecting ? 'Select the existing terminal assigned to this device. Unknown names cannot create duplicate terminals.' : 'Connect the first device to your restaurant. Staff will use their personal PIN after setup.'}</p>
    <div className="space-y-2 mb-5"><Label htmlFor="terminal-name">{reconnecting ? 'Existing terminal' : 'Terminal name'}</Label>
      {loadingOptions ? <div className="flex h-10 items-center gap-2 rounded-md border px-3 text-xs text-slate-500"><LoaderCircle className="size-4 animate-spin" />Loading terminals…</div> : reconnecting ? <select id="terminal-name" value={selectedTerminalId || ''} onChange={event => { const id = Number(event.target.value); const option = options.find(value => value.id === id); setSelectedTerminalId(id); if (option) setName(option.name); }} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="" disabled>Select a terminal</option>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select> : <Input id="terminal-name" value={name} onChange={event => setName(event.target.value)} maxLength={60} />}
    </div>
    <div className="space-y-2 mb-5"><Label htmlFor="admin-pin">{reconnecting ? 'Administrator PIN' : 'Create your administrator PIN'}</Label><Input id="admin-pin" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" type="password" placeholder="4–6 digits" /></div>
    <div aria-live="polite" aria-atomic="true">{message && <p role="alert" className="text-sm font-medium text-rose-700 mb-4">{message}</p>}</div>
    <Button type="submit" className="w-full" size="lg" disabled={loadingOptions || busy || name.trim().length < 2 || pin.length < 4 || (reconnecting && !selectedTerminalId)}>{busy ? 'Authorizing terminal…' : reconnecting ? 'Reconnect terminal' : 'Authorize terminal'}</Button>
    <button type="button" onClick={() => signOut()} className="w-full text-xs text-slate-500 mt-4 hover:text-slate-900">Use a different administrator</button>
  </form></main>;
}

export function StaffAccessScreen() {
  const { terminal, profiles, loginWithPin, error } = useAuth();
  const [selected, setSelected] = useState<StaffProfile | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const enter = (digit: string) => { if (selected && !busy && pin.length < 6) setPin(pin + digit); };
  const submit = async () => {
    if (!selected || pin.length < 4) return;
    setBusy(true); try { await loginWithPin(selected.id, pin); } catch { setPin(''); } finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col">
    <header className="flex items-center justify-between max-w-5xl w-full mx-auto">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-600 grid place-items-center"><Flame className="w-5 h-5" /></div><div><p className="font-bold">VC POS</p><p className="text-xs text-slate-400">{terminal?.name}</p></div></div>
      <div className="flex items-center gap-2 text-xs text-emerald-300"><ShieldCheck className="w-4 h-4" />Authorized terminal</div>
    </header>
    <section className="flex-1 grid place-items-center py-10">
      {!selected ? <div className="w-full max-w-4xl text-center">
        <LockKeyhole className="w-10 h-10 text-indigo-400 mx-auto mb-4" /><h1 className="text-3xl font-bold">Who’s using this terminal?</h1><p className="text-slate-400 mt-2 mb-8">Select your profile to continue</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{profiles.map(profile => <button key={profile.id} onClick={() => { setSelected(profile); setPin(''); }} className="bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 rounded-2xl p-5 transition text-left"><div className="w-12 h-12 rounded-full bg-indigo-500/15 text-indigo-300 grid place-items-center font-bold text-lg mb-4">{profile.name?.charAt(0).toUpperCase() || 'S'}</div><p className="font-semibold truncate">{profile.name || 'Staff'}</p><p className="text-xs text-slate-400 mt-1">{roleLabels[profile.role || ''] || profile.role}</p></button>)}</div>
      </div> : <div className="w-full max-w-xs text-center">
        <button onClick={() => { setSelected(null); setPin(''); }} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"><ArrowLeft className="w-4 h-4" />All profiles</button>
        <div className="w-16 h-16 rounded-full bg-indigo-500/15 text-indigo-300 grid place-items-center font-bold text-2xl mx-auto">{selected.name?.charAt(0).toUpperCase()}</div><h1 className="text-2xl font-bold mt-4">{selected.name}</h1><p className="text-slate-400 text-sm">Enter your personal PIN</p>
        <div className="h-14 flex items-center justify-center gap-3">{Array.from({ length: pin.length }).map((_, i) => <span key={i} className="w-3 h-3 rounded-full bg-indigo-400" />)}</div>
        <div className="grid grid-cols-3 gap-3">{'123456789'.split('').map(n => <button key={n} onClick={() => enter(n)} className="h-16 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xl font-semibold">{n}</button>)}<span /><button onClick={() => enter('0')} className="h-16 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xl font-semibold">0</button><button onClick={() => setPin(value => value.slice(0, -1))} className="h-16 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 grid place-items-center"><Delete /></button></div>
        {error && <p className="text-sm text-rose-400 mt-4">{error}</p>}<Button onClick={submit} disabled={busy || pin.length < 4} className="w-full mt-5" size="lg">{busy ? 'Checking…' : 'Unlock POS'}</Button>
      </div>}
    </section>
  </main>;
}
