import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/react';
import { User } from '../types.ts';

interface AuthContextType { currentUser: User | null; loading: boolean; signOut: () => Promise<void>; }
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) { setCurrentUser(null); setLoading(false); return; }
    void (async () => {
      try {
        const response = await fetch('/api/auth/sync', { method: 'POST' });
        if (!response.ok) throw new Error('Unable to create staff profile');
        setCurrentUser(await response.json());
      } catch (error) { console.error('Failed to sync Clerk user:', error); }
      finally { setLoading(false); }
    })();
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      if (!url.includes('/api/')) return nativeFetch(input, init);
      const token = await getToken();
      const headers = new Headers(init.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return nativeFetch(input, { ...init, headers });
    };
    return () => { window.fetch = nativeFetch; };
  }, [getToken]);

  return <AuthContext.Provider value={{ currentUser, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
