import { useState } from 'react';
import { KeyRound, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../context/AuthContext.tsx';
import { usePos } from '../context/PosContext.tsx';

const managerRoles = new Set(['restaurant_owner', 'restaurant_admin', 'general_manager', 'shift_manager']);

export default function ManagerApprovalModal() {
  const { profiles } = useAuth();
  const { approvalPrompt, closeManagerApproval } = usePos();
  const managers = profiles.filter(profile => managerRoles.has(String(profile.role)));
  const [approverStaffId, setApproverStaffId] = useState<number | null>(null);
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!approvalPrompt) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approverStaffId, pin, reason, action: approvalPrompt.action, entityId: approvalPrompt.entityId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Approval failed');
      setPin(''); setReason(''); setApproverStaffId(null); closeManagerApproval(body.token);
    } catch (cause: any) { setError(cause.message); setPin(''); }
    finally { setBusy(false); }
  };
  const cancel = () => { setPin(''); setReason(''); setApproverStaffId(null); closeManagerApproval(null); };

  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"><div className="flex items-start justify-between"><div className="flex gap-3"><div className="grid size-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><ShieldCheck /></div><div><h2 className="font-bold">Manager approval</h2><p className="mt-1 text-xs text-slate-500">{approvalPrompt.message}</p></div></div><button type="button" aria-label="Cancel approval" onClick={cancel}><X className="size-4" /></button></div><div className="mt-5 space-y-4"><div><Label>Approving manager</Label><Select value={approverStaffId ? String(approverStaffId) : null} onValueChange={value => setApproverStaffId(value ? Number(value) : null)}><SelectTrigger className="mt-1 h-10 w-full bg-white"><SelectValue placeholder="Select manager" /></SelectTrigger><SelectContent>{managers.map(profile => <SelectItem key={profile.id} value={String(profile.id)}>{profile.name} / {String(profile.role).replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></div><div><Label>Reason</Label><Input required minLength={3} maxLength={250} value={reason} onChange={event => setReason(event.target.value)} placeholder="Why is this exception needed?" /></div><div><Label>Manager PIN</Label><div className="relative"><KeyRound className="absolute left-3 top-3 size-4 text-slate-400" /><Input required className="pl-9" type="password" inputMode="numeric" minLength={4} maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div></div></div>{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<div className="mt-6 flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={cancel}>Cancel</Button><Button type="submit" className="flex-1" disabled={busy || !approverStaffId || pin.length < 4 || reason.trim().length < 3}>{busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}Approve</Button></div></form></div>;
}
