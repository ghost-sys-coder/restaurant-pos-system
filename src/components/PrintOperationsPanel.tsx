import { useEffect, useState } from 'react';
import { LoaderCircle, Printer, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Profile = { id: number; name: string; jobType: string; connectionType: string };
type Job = { id: number; jobType: string; status: string; attempts: number; lastError: string | null; payload: Record<string, unknown> };

export default function PrintOperationsPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [jobType, setJobType] = useState('kitchen');
  const [stations, setStations] = useState('main');

  const load = async () => {
    const [profilesResponse, jobsResponse] = await Promise.all([fetch('/api/printers'), fetch('/api/print-jobs')]);
    if (profilesResponse.ok) setProfiles(await profilesResponse.json());
    if (jobsResponse.ok) setJobs(await jobsResponse.json());
  };

  useEffect(() => { void load(); }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch('/api/printers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, jobType, connectionType: 'browser', stations: stations.split(',').map(value => value.trim()).filter(Boolean) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setName(''); await load(); setMessage('Printer profile created');
    } catch (error: any) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const test = async (id: number) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/printers/${id}/test`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await load(); setMessage('Test print queued');
    } catch (error: any) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const processNext = async () => {
    setBusy(true); setMessage(''); let claimed: Job | null = null;
    try {
      const response = await fetch('/api/print-jobs/claim', { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      claimed = body.job;
      if (!claimed) { setMessage('No print jobs are ready'); return; }
      const popup = window.open('', `vc-print-${claimed.id}`, 'width=480,height=720');
      if (!popup) throw new Error('Allow pop-ups for this site to use browser printing');
      const safe = JSON.stringify(claimed.payload, null, 2).replace(/[&<>]/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[value]!));
      popup.document.write(`<!doctype html><html><head><title>VC POS ${claimed.jobType}</title><style>body{font:14px ui-monospace,monospace;padding:20px;white-space:pre-wrap}h1{font:700 18px system-ui;border-bottom:1px dashed #000;padding-bottom:10px}</style></head><body><h1>VC POS / ${claimed.jobType.toUpperCase()}</h1><pre>${safe}</pre></body></html>`);
      popup.document.close(); popup.focus(); popup.print(); popup.close();
      await fetch(`/api/print-jobs/${claimed.id}/result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) });
      setMessage(`Print job ${claimed.id} completed`);
    } catch (error: any) {
      if (claimed) await fetch(`/api/print-jobs/${claimed.id}/result`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: error.message }) }).catch(() => undefined);
      setMessage(error.message);
    } finally { setBusy(false); await load(); }
  };

  const retry = async (id: number) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/print-jobs/${id}/retry`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await load(); setMessage('Print job queued for retry');
    } catch (error: any) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
    <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Printer className="size-4 text-indigo-600" /><h2 className="font-bold text-slate-900">Printing & durable queue</h2></div><p className="mt-1 text-xs text-slate-500">Route kitchen and receipt jobs, process browser prints, and retry failures safely.</p></div><div className="flex flex-wrap gap-2"><Button className="h-9" variant="outline" onClick={load}><RefreshCw />Refresh</Button><Button className="h-9" onClick={processNext} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Printer />}Process next job</Button></div></div>
    <div className="p-5">
      {message && <p role="status" className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">{message}</p>}
      <form onSubmit={create} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div><h3 className="text-sm font-semibold text-slate-900">Add a browser printer</h3><p className="mt-0.5 text-xs text-slate-500">Connect a browser window to a kitchen or receipt print queue.</p></div><div className="mt-4 grid gap-4 lg:grid-cols-3"><div className="space-y-2"><Label htmlFor="printer-name">Printer name</Label><Input id="printer-name" className="h-11 bg-white px-3" required minLength={2} value={name} onChange={event => setName(event.target.value)} placeholder="Kitchen counter" /></div><div className="space-y-2"><Label htmlFor="printer-output">Output</Label><Select value={jobType} onValueChange={value => setJobType(value ?? 'kitchen')}><SelectTrigger id="printer-output" className="h-11 w-full bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kitchen">Kitchen</SelectItem><SelectItem value="receipt">Receipt</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="printer-stations">Stations</Label><Input id="printer-stations" className="h-11 bg-white px-3" value={stations} onChange={event => setStations(event.target.value)} placeholder="main, grill" /></div></div><div className="mt-4 flex justify-end"><Button className="h-10 px-4" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Printer />}Add browser printer</Button></div></form>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{profiles.map(profile => <div key={profile.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs"><div><p className="text-sm font-semibold text-slate-900">{profile.name}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{profile.jobType} / {profile.connectionType}</p></div><Button size="sm" variant="outline" onClick={() => test(profile.id)}>Test</Button></div>)}</div>
      <div className="mt-5 space-y-2">{jobs.map(job => <div key={job.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs"><div><p className="font-semibold">#{job.id} / {job.jobType} / {job.status} / attempt {job.attempts}</p>{job.lastError && <p className="mt-1 text-rose-600">{job.lastError}</p>}</div>{['failed', 'dead'].includes(job.status) && <Button size="sm" variant="outline" onClick={() => retry(job.id)}><RotateCcw />Retry</Button>}</div>)}{jobs.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-7 text-center"><Printer className="mx-auto size-5 text-slate-300" /><p className="mt-2 text-xs font-medium text-slate-500">No pending or failed print jobs</p></div>}</div>
    </div>
  </section>;
}
