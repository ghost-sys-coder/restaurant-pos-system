import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { PlatformRole, User } from '../types.ts';
import { setAuthTokenProvider } from '../lib/api.ts';

export interface Terminal { id: number; name: string; type: string; locationId: number; inactivityTimeoutMinutes: number; }
export interface StaffProfile { id: number; name: string | null; role: string | null; }

interface AuthContextType {
  currentUser: User | null;
  terminal: Terminal | null;
  profiles: StaffProfile[];
  permissions: string[];
  loading: boolean;
  error: string | null;
  platformRole: PlatformRole | null;
  workspace: 'platform' | 'restaurant';
  setWorkspace: (workspace: 'platform' | 'restaurant') => void;
  enrollTerminal: (name: string, pin: string, type?: string, terminalId?: number) => Promise<void>;
  loginWithPin: (staffId: number, pin: string) => Promise<void>;
  lockTerminal: () => Promise<void>;
  refreshAccess: (options?: { silent?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
  syncUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function apiJson(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformRole, setPlatformRole] = useState<PlatformRole | null>(null);
  const [workspace, setWorkspaceState] = useState<'platform' | 'restaurant'>(() => localStorage.getItem('vc_workspace') === 'restaurant' ? 'restaurant' : 'platform');
  const setWorkspace = (value: 'platform' | 'restaurant') => { localStorage.setItem('vc_workspace', value); setWorkspaceState(value); };

  useEffect(() => setAuthTokenProvider(getToken), [getToken]);
  useEffect(() => {
    const handleRequired = (event: Event) => {
      const code = (event as CustomEvent<string>).detail;
      if (code === 'TERMINAL_REQUIRED') { setTerminal(null); setProfiles([]); }
      setCurrentUser(null); setPermissions([]);
    };
    window.addEventListener('vc:access-required', handleRequired);
    return () => window.removeEventListener('vc:access-required', handleRequired);
  }, []);

  const loadTerminal = async () => {
    try {
      const terminalData = await apiJson('/api/access/terminal');
      setTerminal(terminalData.terminal);
      const [profileData, sessionResponse] = await Promise.all([apiJson('/api/access/profiles'), fetch('/api/access/session', { credentials: 'same-origin' })]);
      setProfiles(profileData);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setCurrentUser(sessionData.staff);
        setPermissions(sessionData.permissions || []);
      } else {
        setCurrentUser(null); setPermissions([]);
      }
    } catch {
      setTerminal(null); setProfiles([]); setCurrentUser(null); setPermissions([]);
    }
  };

  const refreshAccess = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    if (isSignedIn) {
      const platformResponse = await fetch('/api/platform/session');
      setPlatformRole(platformResponse.ok ? (await platformResponse.json()).role : null);
    } else setPlatformRole(null);
    await loadTerminal();
    if (!options?.silent) setLoading(false);
  };

  useEffect(() => { if (isLoaded) refreshAccess(); }, [isLoaded, isSignedIn]);

  const enrollTerminal = async (name: string, pin: string, type = 'register', terminalId?: number) => {
    setError(null);
    const token = await getToken();
    const data = await apiJson('/api/access/terminal/enroll', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify({ name, pin, type, terminalId }) });
    setTerminal(data.terminal);
    await loadTerminal();
  };

  const loginWithPin = async (staffId: number, pin: string) => {
    setError(null);
    try {
      const data = await apiJson('/api/access/login', { method: 'POST', body: JSON.stringify({ staffId, pin }) });
      setCurrentUser(data.staff); setPermissions(data.permissions || []);
    } catch (err: any) { setError(err.message); throw err; }
  };

  const lockTerminal = async () => { await apiJson('/api/access/lock', { method: 'POST' }); setCurrentUser(null); setPermissions([]); };
  const signOut = async () => {
    try { await apiJson('/api/access/signout', { method: 'POST' }); }
    finally {
      setCurrentUser(null); setPermissions([]); setProfiles([]); setPlatformRole(null);
      localStorage.removeItem('vc_workspace');
      await clerkSignOut();
    }
  };
  const syncUser = async () => currentUser;

  useEffect(() => {
    if (!terminal || !currentUser) return;
    let timer = window.setTimeout(lockTerminal, terminal.inactivityTimeoutMinutes * 60_000);
    const reset = () => { window.clearTimeout(timer); timer = window.setTimeout(lockTerminal, terminal.inactivityTimeoutMinutes * 60_000); };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, reset, { passive: true }));
    return () => { window.clearTimeout(timer); events.forEach(event => window.removeEventListener(event, reset)); };
  }, [terminal, currentUser]);

  return <AuthContext.Provider value={{ currentUser, terminal, profiles, permissions, loading, error, platformRole, workspace, setWorkspace, enrollTerminal, loginWithPin, lockTerminal, refreshAccess, signOut, syncUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
