import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';

export default function ConnectionStatus() {
  const { connectionState, lastSyncedAt, fetchData } = usePos();
  const [retrying, setRetrying] = useState(false);
  if (connectionState === 'online') return null;
  const retry = async () => { setRetrying(true); try { await fetchData(); } finally { setRetrying(false); } };
  return <div role="status" className={`flex shrink-0 items-center justify-center gap-3 border-b px-4 py-2 text-xs font-semibold ${connectionState === 'offline' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
    {connectionState === 'offline' ? <WifiOff className="size-4" /> : <CloudOff className="size-4" />}
    <span>{connectionState === 'offline' ? 'Offline. Your current order draft remains on this terminal.' : 'Connection interrupted. Showing the last synchronized data.'}</span>
    {lastSyncedAt && <span className="hidden font-normal opacity-75 sm:inline">Last synced {lastSyncedAt.toLocaleTimeString()}</span>}
    <button onClick={retry} disabled={retrying || !navigator.onLine} className="inline-flex items-center gap-1 rounded-lg border border-current/20 bg-white/70 px-2 py-1 disabled:opacity-50"><RefreshCw className={`size-3 ${retrying ? 'animate-spin' : ''}`} /> Retry</button>
  </div>;
}
