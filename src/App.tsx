import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { PosProvider } from './context/PosContext.tsx';
import PosLayout from './components/PosLayout.tsx';
import { SignIn, SignInButton, SignUp, useAuth as useClerkAuth, useUser } from '@clerk/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Terminal, Zap, Shield } from 'lucide-react';
import { useAuth } from './context/AuthContext.tsx';
import { StaffAccessScreen, TerminalSetupScreen } from './components/AccessScreens.tsx';
import PlatformClientsScreen from './components/PlatformClientsScreen.tsx';
import OrganizationRequiredScreen from './components/OrganizationRequiredScreen.tsx';

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return pathname;
}

function AuthPage({ pathname }: { pathname: string }) {
  const isInvitation = pathname === '/accept-invitation';
  const isSignUp = pathname === '/sign-up';
  const isSignIn = pathname === '/sign-in';

  if (isInvitation) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-50 px-4 py-10 text-slate-950">
        <section className="flex w-full max-w-md flex-col items-center gap-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm">
              <Flame className="size-6" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Accept your restaurant invitation</h1>
            <p className="text-sm leading-6 text-slate-600">
              Create or sign in to your account to join your restaurant workspace.
            </p>
          </div>
          <SignIn
            routing="path"
            path="/accept-invitation"
            signUpUrl="/accept-invitation"
            forceRedirectUrl="/"
            appearance={{
              variables: {
                colorPrimary: '#4f46e5',
                colorBackground: '#ffffff',
                borderRadius: '0.75rem',
              },
              elements: {
                cardBox: 'shadow-xl shadow-slate-950/10 ring-1 ring-slate-200',
                card: 'bg-white',
                headerTitle: 'text-slate-950',
                headerSubtitle: 'text-slate-600',
                formFieldLabel: 'text-slate-800',
                formFieldInput: 'bg-white text-slate-950 placeholder:text-slate-400 border-slate-300',
                formFieldHintText: 'text-slate-600',
                formFieldErrorText: 'text-red-700',
                identityPreviewText: 'text-slate-950',
                identityPreviewEditButton: 'text-indigo-700',
                footerActionText: 'text-slate-600',
                footerActionLink: 'text-indigo-700 hover:text-indigo-800',
              },
            }}
          />
        </section>
      </main>
    );
  }

  if (isSignUp || isSignIn) {
    return (
      <main className="min-h-screen grid place-items-center bg-background p-6">
        {isSignUp ? (
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/" />
        ) : (
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/" />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center space-y-4 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Terminal className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">VC POS</CardTitle>
            <CardDescription className="text-base">
              Sign in to access the terminal.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Secure Clerk Authentication</span>
          </div>
          <SignInButton mode="redirect">
            <Button className="w-full" size="lg">
              <Zap className="w-4 h-4" />
              Sign in to Terminal
            </Button>
          </SignInButton>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              <Flame className="w-3 h-3" />
              POS Live
            </Badge>
            <span>Encrypted Session</span>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}

function AppContent() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { orgId } = useClerkAuth();
  const { terminal, currentUser, loading, platformRole } = useAuth();

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-background p-6">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </main>
    );
  }

  if (user && platformRole) return <PlatformClientsScreen />;

  if (terminal && currentUser) {
    return (
      <PosProvider>
        <PosLayout />
      </PosProvider>
    );
  }

  if (terminal) return <StaffAccessScreen />;
  if (user && !orgId) return <OrganizationRequiredScreen />;
  if (user) return <TerminalSetupScreen />;

  return <AuthPage pathname={pathname} />;
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
