import { useEffect, useState } from 'react';
import { Building2, LogOut, Plus, ShieldCheck } from 'lucide-react';
import { useClerk } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Client { id: number; name: string; slug: string | null; status: string; clerkOrganizationId: string | null; }

export default function PlatformClientsScreen() {
  const { signOut } = useClerk();
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const response = await fetch('/api/platform/clients');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to load restaurant clients');
      setClients(body);
    } catch (error: any) {
      setMessageType('error');
      setMessage(error.message || 'Unable to connect to the platform API');
    }
  };
  useEffect(() => { load(); }, []);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(ownerEmail.trim())) {
      setMessageType('error'); setMessage('Enter a restaurant name and a valid owner email.'); return;
    }
    setBusy(true); setMessage(''); setMessageType(null);
    try {
      const response = await fetch('/api/platform/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), ownerEmail: ownerEmail.trim() }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to create restaurant client');
      setMessageType('success'); setMessage(`Restaurant created and invitation sent to ${ownerEmail}`); setName(''); setOwnerEmail(''); await load();
    } catch (error: any) {
      setMessageType('error'); setMessage(error.message || 'Unable to connect to the platform API. Check the server logs and try again.');
    } finally {
      setBusy(false);
    }
  };
  return <main className="min-h-screen bg-slate-950 text-white p-6">
    <div className="max-w-5xl mx-auto"><header className="flex justify-between items-center mb-10"><div><div className="flex items-center gap-2 text-indigo-300 text-sm"><ShieldCheck className="w-4 h-4" />Platform administration</div><h1 className="text-3xl font-bold mt-2">Restaurant clients</h1></div><Button variant="outline" className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800 hover:text-white" onClick={() => signOut()}><LogOut className="w-4 h-4" /><span>Sign out</span></Button></header>
      <div className="grid lg:grid-cols-[360px_1fr] gap-6"><form onSubmit={create} className="bg-white text-slate-900 rounded-2xl p-6 h-fit"><div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl grid place-items-center mb-4"><Plus /></div><h2 className="font-bold text-xl">Add restaurant client</h2><p className="text-sm text-slate-500 mt-1 mb-5">Creates the Clerk organization and invites its owner.</p><div className="space-y-2 mb-4"><Label>Restaurant name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div><div className="space-y-2 mb-5"><Label>Owner email</Label><Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} /></div><Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creating organization & sending invite…' : 'Create & invite owner'}</Button>{message && <div role="status" className={`text-sm mt-4 rounded-lg border p-3 ${messageType === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message}</div>}</form>
        <section className="space-y-3">{clients.map(client => <article key={client.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-11 h-11 bg-indigo-500/15 text-indigo-300 rounded-xl grid place-items-center"><Building2 /></div><div><h3 className="font-semibold">{client.name}</h3><p className="text-xs text-slate-400">{client.slug}</p></div></div><span className="text-xs uppercase text-emerald-300">{client.status}</span></article>)}{clients.length === 0 && <div className="border border-dashed border-slate-700 rounded-2xl p-10 text-center text-slate-400">No restaurant clients yet.</div>}</section></div>
    </div>
  </main>;
}
