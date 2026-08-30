import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, LoaderCircle, RotateCcw, Trash2, UserPlus, UserX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Role } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface StaffRow { id: number; name: string | null; role: Role; email?: string | null; isActive: boolean; }

export default function StaffManagementModal({ onClose }: { onClose: () => void }) {
  const { refreshAccess, currentUser } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState<'restaurant_admin' | 'general_manager' | 'accountant'>('restaurant_admin');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [pinTarget, setPinTarget] = useState<StaffRow | null>(null);
  const [replacementPin, setReplacementPin] = useState('');
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffLoadError, setStaffLoadError] = useState('');
  const load = async (showSkeleton = false) => {
    if (showSkeleton) setStaffLoading(true);
    setStaffLoadError('');
    try {
      const response = await fetch('/api/staff');
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error(body.error || 'Unable to load staff profiles');
      setStaff(body);
    } catch (error: any) {
      setStaffLoadError(error?.message || 'Unable to load staff profiles');
    } finally {
      if (showSkeleton) setStaffLoading(false);
    }
  };
  useEffect(() => { load(true); }, []);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || pendingAction?.startsWith('delete-')) return;
      if (deleteTarget) setDeleteTarget(null); else if (pinTarget) setPinTarget(null); else onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => { window.removeEventListener('keydown', closeOnEscape); };
  }, [deleteTarget, onClose, pendingAction, pinTarget]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(''); setPendingAction('create');
    try {
      const response = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, role, pin }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(body.error || 'Unable to create profile');
      setName(''); setPin(''); setMessage('Profile created'); await load(); await refreshAccess({ silent: true });
    } finally { setPendingAction(null); }
  };
  const resetPin = async () => {
    if (!pinTarget) return;
    setPendingAction(`pin-${pinTarget.id}`); setMessage('');
    try {
      const response = await fetch(`/api/staff/${pinTarget.id}/pin`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: replacementPin }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(body.error || 'Unable to update PIN');
      setMessage('PIN updated and existing sessions revoked'); setPinTarget(null); setReplacementPin('');
    } finally { setPendingAction(null); }
  };
  const inviteAdmin = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    const response = await fetch('/api/organization/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailAddress: adminEmail, role: adminRole }) });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Invitation sent to ${adminEmail}` : body.error || 'Unable to send invitation');
    if (response.ok) setAdminEmail('');
  };
  const changeAccess = async (person: StaffRow, isActive: boolean) => {
    setMessage(''); setPendingAction(`access-${person.id}`);
    try {
      const response = await fetch(`/api/staff/${person.id}/access`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(body.error || 'Unable to change staff access');
      setMessage(isActive ? 'Staff access restored' : 'Staff access revoked');
      await load(); await refreshAccess({ silent: true });
    } finally { setPendingAction(null); }
  };
  const deleteProfile = async (person: StaffRow) => {
    setMessage(''); setPendingAction(`delete-${person.id}`);
    try {
      const response = await fetch(`/api/staff/${person.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setDeleteTarget(null); return setMessage(body.error || 'Unable to delete staff profile'); }
      setDeleteTarget(null);
      setMessage('Staff profile deleted'); await load(); await refreshAccess({ silent: true });
    } finally { setPendingAction(null); }
  };
  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="staff-management-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 items-center justify-between border-b p-5"><div><h2 id="staff-management-title" className="font-bold text-lg">Staff profiles</h2><p className="text-xs text-slate-500">Create PIN access for this location</p></div><button type="button" onClick={onClose} aria-label="Close staff PIN management" className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button></div>
      <div className="min-h-0 overflow-y-auto overscroll-contain">
      {currentUser?.role === 'restaurant_owner' && <form onSubmit={inviteAdmin} className="p-5 grid sm:grid-cols-[1fr_180px_auto] gap-3 border-b"><div className="space-y-1"><Label>Back-office email</Label><Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@restaurant.com" /></div><div className="space-y-1"><Label>Access</Label><Select value={adminRole} onValueChange={value => setAdminRole((value ?? 'restaurant_admin') as typeof adminRole)}><SelectTrigger className="h-9 w-full bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="restaurant_admin">Restaurant Admin</SelectItem><SelectItem value="general_manager">General Manager</SelectItem><SelectItem value="accountant">Accountant</SelectItem></SelectContent></Select></div><Button type="submit" className="self-end" disabled={!adminEmail.includes('@')}>Send invite</Button></form>}
      <form onSubmit={create} className="p-5 grid sm:grid-cols-4 gap-3 bg-slate-50 border-b">
        <div className="sm:col-span-2 space-y-1"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Employee name" /></div>
        <div className="space-y-1"><Label>Role</Label><Select value={role} onValueChange={value => setRole((value ?? 'cashier') as Role)}><SelectTrigger className="h-9 w-full bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="shift_manager">Shift Manager</SelectItem><SelectItem value="cashier">Cashier</SelectItem><SelectItem value="server">Server</SelectItem><SelectItem value="bartender">Bartender</SelectItem><SelectItem value="host">Host</SelectItem><SelectItem value="kitchen">Kitchen</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label>PIN</Label><Input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="4–6 digits" /></div>
        <div className="sm:col-span-4 flex items-center justify-between gap-3"><span aria-live="polite" className={`text-xs ${message.includes('Unable') || message.includes('cannot') ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</span><Button type="submit" disabled={pendingAction !== null || name.trim().length < 2 || pin.length < 4}>{pendingAction === 'create' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}{pendingAction === 'create' ? 'Creating profile…' : 'Add profile'}</Button></div>
      </form>
      <div className="p-5 space-y-2" aria-busy={staffLoading} aria-live="polite">
        {staffLoading && <div className="space-y-2" aria-label="Loading staff profiles">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3"><div className="min-w-0 flex-1 space-y-2"><div className="h-4 w-32 max-w-[65%] animate-pulse rounded bg-slate-200" /><div className="h-3 w-20 animate-pulse rounded bg-slate-100" /></div><div className="hidden items-center gap-2 sm:flex"><div className="h-7 w-20 animate-pulse rounded-lg bg-slate-100" /><div className="h-7 w-20 animate-pulse rounded-lg bg-slate-100" /><div className="h-7 w-16 animate-pulse rounded-lg bg-rose-100" /></div></div>)}
          <span className="sr-only">Loading staff profiles…</span>
        </div>}
        {!staffLoading && staffLoadError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><p>{staffLoadError}</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => load(true)}>Try again</Button></div>}
        {!staffLoading && !staffLoadError && staff.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center"><p className="text-sm font-medium text-slate-700">No staff profiles yet</p><p className="mt-1 text-xs text-slate-500">Create the first PIN profile using the form above.</p></div>}
        {!staffLoading && !staffLoadError && staff.map(person => <div key={person.id} className={`flex flex-col gap-3 border rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between ${person.isActive ? '' : 'bg-slate-50 opacity-75'}`}><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-semibold text-sm">{person.name || person.email}</p>{!person.isActive && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">Revoked</span>}</div><p className="text-xs text-slate-500 capitalize">{person.role}</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={!person.isActive || pendingAction !== null} onClick={() => { setPinTarget(person); setReplacementPin(''); }}>Reset PIN</Button><Button type="button" variant="outline" size="sm" disabled={person.id === currentUser?.id || pendingAction !== null} onClick={() => changeAccess(person, !person.isActive)}>{pendingAction === `access-${person.id}` ? <LoaderCircle className="animate-spin" /> : person.isActive ? <UserX /> : <RotateCcw />}{person.isActive ? 'Revoke' : 'Restore'}</Button><Button type="button" variant="destructive" size="sm" disabled={person.id === currentUser?.id || pendingAction !== null} onClick={() => setDeleteTarget(person)}><Trash2 />Delete</Button></div></div>)}
      </div>
      </div>
    </div>
    {deleteTarget && <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/55 p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-staff-title" aria-describedby="delete-staff-description" onMouseDown={event => { if (event.target === event.currentTarget && !pendingAction?.startsWith('delete-')) setDeleteTarget(null); }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-2xl ring-1 ring-slate-950/10">
        <div className="mb-4 grid size-11 place-items-center rounded-full bg-rose-100 text-rose-700"><AlertTriangle className="size-5" /></div>
        <h3 id="delete-staff-title" className="text-lg font-bold">Delete staff profile?</h3>
        <p id="delete-staff-description" className="mt-2 text-sm leading-6 text-slate-600">You are about to permanently delete <strong className="font-semibold text-slate-900">{deleteTarget.name || deleteTarget.email || 'this staff profile'}</strong>. This action cannot be undone. If this person has business history, revoke their access instead.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={pendingAction?.startsWith('delete-')} onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={pendingAction?.startsWith('delete-')} onClick={() => deleteProfile(deleteTarget)}>{pendingAction === `delete-${deleteTarget.id}` ? <LoaderCircle className="animate-spin" /> : <Trash2 />}{pendingAction === `delete-${deleteTarget.id}` ? 'Deleting…' : 'Delete permanently'}</Button>
        </div>
      </div>
    </div>}
    {pinTarget && <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-pin-title"><form onSubmit={event => { event.preventDefault(); resetPin(); }} className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"><h3 id="reset-pin-title" className="text-lg font-bold">Reset {pinTarget.name || 'staff'} PIN</h3><p className="mt-2 text-sm text-slate-600">Choose a unique 4–6 digit PIN. Existing sessions for this profile will be revoked.</p><div className="mt-4 space-y-1"><Label htmlFor="replacement-pin">New PIN</Label><Input id="replacement-pin" autoFocus type="password" inputMode="numeric" value={replacementPin} onChange={event => setReplacementPin(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" disabled={pendingAction?.startsWith('pin-')} onClick={() => setPinTarget(null)}>Cancel</Button><Button type="submit" disabled={replacementPin.length < 4 || pendingAction?.startsWith('pin-')}>{pendingAction === `pin-${pinTarget.id}` && <LoaderCircle className="animate-spin" />}Update PIN</Button></div></form></div>}
  </div>, document.body);
}
