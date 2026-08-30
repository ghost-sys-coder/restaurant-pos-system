import { useEffect, useState } from 'react';
import { Building2, ChevronDown, Loader2, LogOut, Mail, Plus, RefreshCw, ShieldCheck, UserMinus, UserPlus } from 'lucide-react';
import { useClerk } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../context/AuthContext.tsx';
import ConfirmDialog from './ConfirmDialog.tsx';

interface Client { id: number; name: string; slug: string | null; status: string; clerkOrganizationId: string | null; }
interface Invitation { id: string; emailAddress: string; role: string; roleName: string; status?: string; createdAt: number; expiresAt: number; }
interface Member { id: string; userId: string; emailAddress: string; name: string; role: string; createdAt: number; }
interface ClientAccess { invitations: Invitation[]; members: Member[]; }
type ConfirmAction = { kind: 'revoke'; client: Client; invitation: Invitation } | { kind: 'remove'; client: Client; member: Member };

const roleLabels: Record<string, string> = {
  'org:restaurant_owner': 'Restaurant owner', 'org:restaurant_admin': 'Restaurant admin',
  'org:general_manager': 'General manager', 'org:accountant': 'Accountant',
};

async function apiRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The request could not be completed');
  return body;
}

export default function PlatformClientsScreen() {
  const { signOut } = useClerk();
  const { setWorkspace } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<number | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [access, setAccess] = useState<Record<number, ClientAccess>>({});
  const [accessBusy, setAccessBusy] = useState<number | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('restaurant_owner');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const showMessage = (type: 'success' | 'error', value: string) => { setMessageType(type); setMessage(value); };
  const load = async () => {
    try { setClients(await apiRequest('/api/platform/clients')); }
    catch (error: any) { showMessage('error', error.message || 'Unable to connect to the platform API'); }
  };
  const loadAccess = async (clientId: number) => {
    setAccessBusy(clientId);
    try {
      const details = await apiRequest(`/api/platform/clients/${clientId}/access`);
      setAccess(current => ({ ...current, [clientId]: details }));
    }
    catch (error: any) { showMessage('error', error.message); }
    finally { setAccessBusy(null); }
  };
  const toggleAccess = async (client: Client) => {
    const next = expandedClientId === client.id ? null : client.id;
    setExpandedClientId(next);
    if (next && !access[next]) await loadAccess(next);
  };
  const changeStatus = async (client: Client) => {
    setStatusBusy(client.id); setMessage(''); setMessageType(null);
    try {
      const status = client.status === 'active' ? 'suspended' : 'active';
      await apiRequest(`/api/platform/clients/${client.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      showMessage('success', `${client.name} is now ${status}`); await load();
    } catch (error: any) { showMessage('error', error.message); }
    finally { setStatusBusy(null); }
  };
  useEffect(() => { load(); }, []);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(ownerEmail.trim())) return showMessage('error', 'Enter a restaurant name and a valid owner email.');
    setBusy(true); setMessage(''); setMessageType(null);
    try {
      await apiRequest('/api/platform/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), ownerEmail: ownerEmail.trim() }) });
      showMessage('success', `Restaurant created and invitation sent to ${ownerEmail}`); setName(''); setOwnerEmail(''); await load();
    } catch (error: any) { showMessage('error', error.message || 'Unable to connect to the platform API.'); }
    finally { setBusy(false); }
  };
  const invite = async (client: Client, event: React.FormEvent) => {
    event.preventDefault(); setActionBusy(`invite-${client.id}`);
    try {
      await apiRequest(`/api/platform/clients/${client.id}/invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailAddress: inviteEmail, role: inviteRole }) });
      showMessage('success', `Invitation sent to ${inviteEmail}`); setInviteEmail(''); await loadAccess(client.id);
    } catch (error: any) { showMessage('error', error.message); }
    finally { setActionBusy(null); }
  };
  const resend = async (client: Client, invitation: Invitation) => {
    setActionBusy(invitation.id);
    try { await apiRequest(`/api/platform/clients/${client.id}/invitations/${invitation.id}/resend`, { method: 'POST' }); showMessage('success', `A fresh invitation was sent to ${invitation.emailAddress}`); await loadAccess(client.id); }
    catch (error: any) { showMessage('error', error.message); }
    finally { setActionBusy(null); }
  };
  const confirm = async () => {
    if (!confirmAction) return;
    const key = confirmAction.kind === 'revoke' ? confirmAction.invitation.id : confirmAction.member.userId;
    setActionBusy(key);
    try {
      if (confirmAction.kind === 'revoke') await apiRequest(`/api/platform/clients/${confirmAction.client.id}/invitations/${confirmAction.invitation.id}`, { method: 'DELETE' });
      else await apiRequest(`/api/platform/clients/${confirmAction.client.id}/members/${confirmAction.member.userId}`, { method: 'DELETE' });
      showMessage('success', confirmAction.kind === 'revoke' ? 'Invitation revoked' : 'Organization access removed');
      await loadAccess(confirmAction.client.id); setConfirmAction(null);
    } catch (error: any) { showMessage('error', error.message); }
    finally { setActionBusy(null); }
  };

  return <main className="min-h-screen bg-slate-950 text-white p-6">
    <div className="max-w-6xl mx-auto"><header className="flex flex-wrap justify-between items-center gap-4 mb-10"><div><div className="flex items-center gap-2 text-indigo-300 text-sm"><ShieldCheck className="w-4 h-4" />Platform administration</div><h1 className="text-3xl font-bold mt-2">Restaurant clients</h1></div><div className="flex gap-2"><Button variant="outline" className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800 hover:text-white" onClick={() => setWorkspace('restaurant')}><Building2 className="w-4 h-4" />Restaurant workspace</Button><Button variant="outline" className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800 hover:text-white" onClick={() => signOut()}><LogOut className="w-4 h-4" />Sign out</Button></div></header>
      {message && <div role="status" className={`mb-5 rounded-xl border p-3 text-sm ${messageType === 'error' ? 'border-rose-800 bg-rose-950/40 text-rose-200' : 'border-emerald-800 bg-emerald-950/40 text-emerald-200'}`}>{message}</div>}
      <div className="grid lg:grid-cols-[360px_1fr] gap-6"><form onSubmit={create} className="bg-white text-slate-900 rounded-2xl p-6 h-fit"><div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl grid place-items-center mb-4"><Plus /></div><h2 className="font-bold text-xl">Add restaurant client</h2><p className="text-sm text-slate-500 mt-1 mb-5">Creates the Clerk organization and invites its first owner.</p><div className="space-y-2 mb-4"><Label>Restaurant name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div><div className="space-y-2 mb-5"><Label>Owner email</Label><Input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} /></div><Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />} {busy ? 'Creating and inviting…' : 'Create & invite owner'}</Button></form>
        <section className="space-y-3">{clients.map(client => { const details = access[client.id]; const expanded = expandedClientId === client.id; return <article key={client.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"><div className="p-5 flex flex-wrap items-center justify-between gap-4"><button type="button" onClick={() => toggleAccess(client)} className="flex min-w-0 items-center gap-4 text-left"><div className="w-11 h-11 shrink-0 bg-indigo-500/15 text-indigo-300 rounded-xl grid place-items-center"><Building2 /></div><div className="min-w-0"><h3 className="font-semibold">{client.name}</h3><p className="text-xs text-slate-400 truncate">{client.slug}</p></div><ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button><div className="flex items-center gap-3"><span className={`text-xs uppercase ${client.status === 'active' ? 'text-emerald-300' : 'text-amber-300'}`}>{client.status}</span><Button size="sm" variant="outline" disabled={statusBusy !== null} className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800" onClick={() => changeStatus(client)}>{statusBusy === client.id ? <Loader2 className="animate-spin" /> : client.status === 'active' ? 'Suspend' : 'Reactivate'}</Button></div></div>
          {expanded && <div className="border-t border-slate-800 p-5">{accessBusy === client.id && !details ? <div className="space-y-3" aria-label="Loading client access"><div className="h-14 rounded-xl bg-slate-800 animate-pulse"/><div className="h-14 rounded-xl bg-slate-800 animate-pulse"/></div> : <div className="space-y-6"><form onSubmit={event => invite(client, event)} className="grid sm:grid-cols-[1fr_180px_auto] gap-3 items-end"><div><Label className="text-slate-300">Invite another back-office user</Label><Input type="email" required placeholder="owner@restaurant.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="mt-2 bg-slate-950 border-slate-700" /></div><select aria-label="Invitation role" value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"><option value="restaurant_owner">Restaurant owner</option><option value="restaurant_admin">Restaurant admin</option><option value="general_manager">General manager</option><option value="accountant">Accountant</option></select><Button disabled={actionBusy === `invite-${client.id}`}><UserPlus />Invite</Button></form>
            <div><div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold text-slate-200">Members</h4><button type="button" aria-label="Refresh access" onClick={() => loadAccess(client.id)} className="text-slate-400 hover:text-white"><RefreshCw className={`w-4 h-4 ${accessBusy === client.id ? 'animate-spin' : ''}`} /></button></div><div className="space-y-2">{details?.members.map(member => <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 p-3"><div><p className="text-sm font-medium">{member.name}</p><p className="text-xs text-slate-500">{member.emailAddress} · {roleLabels[member.role] || member.role}</p></div><Button size="sm" variant="ghost" className="text-rose-300 hover:text-rose-200 hover:bg-rose-950" onClick={() => setConfirmAction({ kind: 'remove', client, member })}><UserMinus />Remove</Button></div>)}{details?.members.length === 0 && <p className="text-sm text-slate-500">No active organization members.</p>}</div></div>
            <div><h4 className="mb-2 text-sm font-semibold text-slate-200">Invitations</h4><div className="space-y-2">{details?.invitations.map(invitation => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 p-3"><div><p className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-slate-500" />{invitation.emailAddress}</p><p className="text-xs text-slate-500">{roleLabels[invitation.role] || invitation.role} · {invitation.status || 'unknown'}</p></div><div className="flex gap-2">{invitation.status !== 'accepted' && <Button size="sm" variant="outline" className="border-slate-700 bg-slate-950" disabled={actionBusy === invitation.id} onClick={() => resend(client, invitation)}>Resend</Button>}{invitation.status === 'pending' && <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => setConfirmAction({ kind: 'revoke', client, invitation })}>Revoke</Button>}</div></div>)}{details?.invitations.length === 0 && <p className="text-sm text-slate-500">No invitations recorded by Clerk.</p>}</div></div></div>}</div>}
        </article>; })}{clients.length === 0 && <div className="border border-dashed border-slate-700 rounded-2xl p-10 text-center text-slate-400">No restaurant clients yet.</div>}</section></div>
    </div>
    <ConfirmDialog open={Boolean(confirmAction)} title={confirmAction?.kind === 'revoke' ? 'Revoke this invitation?' : 'Remove organization access?'} description={confirmAction?.kind === 'revoke' ? `${confirmAction.invitation.emailAddress} will no longer be able to accept this invitation.` : `${confirmAction?.member.name || 'This member'} will immediately lose back-office and active PIN-session access. The last restaurant owner cannot be removed.`} confirmLabel={confirmAction?.kind === 'revoke' ? 'Revoke invitation' : 'Remove access'} busy={Boolean(actionBusy)} onCancel={() => setConfirmAction(null)} onConfirm={confirm} />
  </main>;
}
