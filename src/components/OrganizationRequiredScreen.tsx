import { OrganizationSwitcher, useClerk } from '@clerk/react';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrganizationRequiredScreen() {
  const { signOut } = useClerk();
  return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6"><div className="max-w-md text-center"><div className="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-300 grid place-items-center mx-auto mb-5"><Building2 /></div><h1 className="text-2xl font-bold">Select your restaurant</h1><p className="text-slate-400 text-sm mt-2 mb-6">Accept your restaurant invitation, then select the organization to continue with terminal setup.</p><div className="flex justify-center"><OrganizationSwitcher hidePersonal /></div><Button variant="ghost" className="mt-5 text-slate-400" onClick={() => signOut()}>Sign out</Button></div></main>;
}
