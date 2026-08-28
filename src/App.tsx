import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { PosProvider } from './context/PosContext.tsx';
import PosLayout from './components/PosLayout.tsx';
import { SignIn, SignInButton, SignUp, useUser } from '@clerk/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Terminal, Zap, Shield } from 'lucide-react';

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
  const isSignUp = pathname === '/sign-up';
  const isSignIn = pathname === '/sign-in';

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

  if (!isLoaded) {
    return (
      <main className="min-h-screen grid place-items-center bg-background p-6">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </main>
    );
  }

  if (user) {
    return (
      <AuthProvider>
        <PosProvider>
          <PosLayout />
        </PosProvider>
      </AuthProvider>
    );
  }

  return <AuthPage pathname={pathname} />;
}

export default function App() {
  return <AppContent />;
}
