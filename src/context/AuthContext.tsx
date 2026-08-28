import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/react';
import { User } from '../types.ts';
import { setAuthTokenProvider } from '../lib/api.ts';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  syncUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronously set token provider so early fetches receive auth headers
  if (getToken) {
    setAuthTokenProvider(getToken);
  }

  // Keep the API fetch interceptor synchronized with Clerk's token getter
  useEffect(() => {
    if (getToken) {
      setAuthTokenProvider(getToken);
    }
  }, [getToken]);

  const syncUser = async (): Promise<User | null> => {
    if (!isSignedIn || !user) {
      setCurrentUser(null);
      setLoading(false);
      return null;
    }

    try {
      try {
        await user.reload();
      } catch (e) {
        // ignore reload error if offline
      }

      const token = await getToken();
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Sync failed' }));
        throw new Error(errorData.error || 'Unable to sync user with server');
      }

      const userData: User = await response.json();
      setCurrentUser(userData);

      // Refresh Clerk local user cache to reflect the synced DB role immediately
      try {
        await user.reload();
      } catch (e) {
        // ignore reload error
      }

      return userData;
    } catch (error) {
      console.warn('Clerk to Neon sync warning (using client profile fallback):', error);
      const rawFallbackRole = ((user.publicMetadata?.role || user.unsafeMetadata?.role || 'cashier') as string).toLowerCase().trim();
      const fallbackUser: User = {
        id: 0,
        clerkUserId: user.id,
        email: user.primaryEmailAddress?.emailAddress || `${user.id}@clerk.local`,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.primaryEmailAddress?.emailAddress || 'Staff',
        role: rawFallbackRole as any,
      };
      setCurrentUser(fallbackUser);
      return fallbackUser;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    syncUser();
  }, [isLoaded, isSignedIn, user]);

  return (
    <AuthContext.Provider value={{ currentUser, loading, signOut, syncUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
