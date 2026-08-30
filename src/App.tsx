import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { PosProvider } from './context/PosContext.tsx';
import PosLayout from './components/PosLayout.tsx';
import { SignIn, SignInButton, SignUp, useAuth as useClerkAuth, useUser } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Flame, ShieldCheck, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useAuth } from './context/AuthContext.tsx';
import { StaffAccessScreen, TerminalSetupScreen } from './components/AccessScreens.tsx';
import PlatformClientsScreen from './components/PlatformClientsScreen.tsx';
import OrganizationRequiredScreen from './components/OrganizationRequiredScreen.tsx';
import { authRouteForPath } from './auth/authRoutes.ts';
import hospitalityImage from '../assets/meals/english-breakfast-auth.jpg';

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
  const authRoute = authRouteForPath(pathname);
  const isInvitation = authRoute === 'invitation';
  const isSignUp = authRoute === 'sign-up';
  const isSignIn = authRoute === 'sign-in';

  const clerkAppearance = {
    variables: {
      colorPrimary: '#4338ca',
      colorBackground: '#ffffff',
      colorText: '#172033',
      colorTextSecondary: '#5f6b7c',
      colorInputBackground: '#ffffff',
      colorInputText: '#172033',
      borderRadius: '0.75rem',
      fontFamily: 'Geist Variable, sans-serif',
    },
    elements: {
      rootBox: 'w-full',
      cardBox: 'w-full shadow-none ring-0',
      card: 'w-full bg-transparent p-0 shadow-none',
      header: 'text-left',
      headerTitle: 'text-2xl font-semibold tracking-tight text-slate-950',
      headerSubtitle: 'text-sm leading-6 text-slate-600',
      socialButtonsBlockButton: 'h-11 border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50',
      socialButtonsBlockButtonText: 'font-medium',
      dividerLine: 'bg-slate-200',
      dividerText: 'text-slate-500',
      formFieldLabel: 'text-sm font-medium text-slate-800',
      formFieldInput: 'h-11 border-slate-300 bg-white text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:ring-indigo-600',
      formFieldHintText: 'text-slate-600',
      formFieldErrorText: 'text-rose-700',
      identityPreview: 'border-slate-200 bg-slate-50',
      identityPreviewText: 'text-slate-950',
      identityPreviewEditButton: 'text-indigo-700 hover:text-indigo-800',
      formButtonPrimary: 'h-11 bg-indigo-700 font-semibold text-white shadow-sm hover:bg-indigo-800 active:translate-y-px',
      footerActionText: 'text-slate-600',
      footerActionLink: 'font-semibold text-indigo-700 hover:text-indigo-800',
      footer: 'bg-transparent',
    },
  };

  const authContent = isInvitation ? (
    <SignIn
      routing="hash"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/"
      appearance={clerkAppearance}
    />
  ) : isSignUp ? (
    <SignUp routing="hash" signInUrl="/sign-in" fallbackRedirectUrl="/" appearance={clerkAppearance} />
  ) : isSignIn ? (
    <SignIn routing="hash" signUpUrl="/sign-up" fallbackRedirectUrl="/" appearance={clerkAppearance} />
  ) : null;

  if (isSignUp || isSignIn) {
    return (
      <PublicAccessLayout
        heading={isSignUp ? 'Create your workspace access' : 'Welcome back'}
        description={isSignUp ? 'Set up your secure account to join your restaurant team.' : 'Sign in to manage service, staff, and daily operations.'}
      >
        {authContent}
      </PublicAccessLayout>
    );
  }

  if (isInvitation) {
    return (
      <PublicAccessLayout
        heading="Your restaurant invited you"
        description="Verify your account to join the team and access the workspace assigned to you."
      >
        {authContent}
      </PublicAccessLayout>
    );
  }

  return (
    <PublicAccessLayout
      heading="Run every service with clarity"
      description="Orders, kitchen flow, inventory, and teams in one dependable restaurant workspace."
      landing
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-indigo-700">Restaurant operations, connected</p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Your next shift starts here.</h2>
          <p className="max-w-md text-base leading-7 text-slate-600">Sign in with your restaurant account, then select the terminal and staff profile you use for service.</p>
        </div>
        <SignInButton mode="redirect">
          <Button className="h-12 w-full bg-indigo-700 text-base font-semibold text-white shadow-sm hover:bg-indigo-800 active:translate-y-px" size="lg">
            Sign in to VC POS
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </SignInButton>
        <div className="flex items-start gap-3 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-indigo-700" aria-hidden="true" />
          <p>Secure identity access for owners and administrators. Daily staff access stays fast with terminal PINs.</p>
        </div>
      </div>
    </PublicAccessLayout>
  );
}

function PublicAccessLayout({ heading, description, landing = false, children }: { heading: string; description: string; landing?: boolean; children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-slate-100 text-slate-950">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1440px] bg-white lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] lg:shadow-[0_24px_80px_rgba(30,41,59,0.12)]">
        <section className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-10 lg:order-2 lg:h-[100dvh] lg:overflow-y-auto lg:px-12 xl:px-20">
          <header className="flex items-center justify-between lg:justify-end">
            <div className="flex items-center gap-2.5 lg:hidden">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-white"><Flame className="size-5" /></span>
              <span className="font-semibold tracking-tight">VC POS</span>
            </div>
            <span className="flex items-center gap-2 text-xs font-medium text-slate-500"><Sparkles className="size-4 text-indigo-600" />Designed for smooth service</span>
          </header>

          <div className={`mx-auto flex w-full max-w-md flex-1 flex-col py-6 sm:py-8 ${landing ? 'justify-center' : 'justify-start lg:pt-6 xl:pt-8'}`}>
            {!landing && (
              <div className="mb-7 border-b border-slate-200 pb-6 lg:hidden">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{heading}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            )}
            {children}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-500">
            <span>VC POS</span>
            <span>Protected account access</span>
          </footer>
        </section>

        <section className="relative hidden h-[100dvh] self-start overflow-hidden bg-slate-950 lg:sticky lg:top-0 lg:order-1 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
          <img src={hospitalityImage} alt="Breakfast meal prepared for restaurant service" fetchPriority="high" className="absolute inset-0 size-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.76)_48%,rgba(15,23,42,0.34)_100%)]" />
          <div className="relative flex items-center gap-3 text-white">
            <span className="grid size-11 place-items-center rounded-xl bg-indigo-600 shadow-[0_12px_30px_rgba(49,46,129,0.28)]">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">VC POS</p>
              <p className="text-xs text-slate-300">Restaurant operations platform</p>
            </div>
          </div>

          <div className="relative max-w-xl space-y-6">
            <h1 className="max-w-lg text-5xl font-semibold leading-[1.05] tracking-[-0.045em] text-white xl:text-6xl">{heading}</h1>
            <p className="max-w-md text-lg leading-8 text-slate-200">{description}</p>
            <div className="grid max-w-lg grid-cols-2 gap-x-8 gap-y-4 border-t border-white/20 pt-6 text-sm text-slate-200">
              <span className="flex items-center gap-2"><Check className="size-4 text-indigo-300" />Faster table service</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-indigo-300" />Clear kitchen flow</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-indigo-300" />Location controls</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-indigo-300" />Traceable actions</span>
            </div>
          </div>

          <div className="relative flex items-center gap-2 text-sm text-slate-300">
            <UtensilsCrossed className="size-4" aria-hidden="true" />
            Built for busy restaurant teams
          </div>
        </section>
      </div>
    </main>
  );
}

function AppContent() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { orgId } = useClerkAuth();
  const { terminal, currentUser, loading, platformRole, workspace } = useAuth();

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-background p-6">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </main>
    );
  }

  if (user && platformRole && workspace === 'platform') return <PlatformClientsScreen />;

  // A retained terminal credential must never expose the PIN roster after an
  // owner/admin explicitly signs out of Clerk.
  if (!user) return <AuthPage pathname={pathname} />;

  if (terminal && currentUser) {
    return (
      <PosProvider>
        <PosLayout />
      </PosProvider>
    );
  }

  if (terminal) return <StaffAccessScreen />;
  if (!orgId) return <OrganizationRequiredScreen />;
  return <TerminalSetupScreen />;
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
