import { useEffect, useState, useRef } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '@clerk/react';
import StaffManagementModal from './StaffManagementModal.tsx';
import {
  Store,
  LayoutGrid,
  UtensilsCrossed,
  ReceiptText,
  BarChart3,
  BookOpen,
  Clock,
  LogOut,
  Flame,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Settings,
  Power,
  LoaderCircle,
  Boxes,
} from 'lucide-react';
import { ActiveView } from '../types.ts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Navbar() {
  const { activeView, setActiveView, orders, tables } = usePos();
  const { currentUser, lockTerminal, signOut, permissions, platformRole, setWorkspace } = useAuth();
  const { user } = useUser();
  const [timeStr, setTimeStr] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [staffManagerOpen, setStaffManagerOpen] = useState<boolean>(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOrdersCount = orders.filter(
    o => o.status === 'active' || o.status === 'preparing' || o.status === 'ready'
  ).length;

  const occupiedTablesCount = tables.filter(t => t.status === 'occupied').length;

  // Primary Floor Operations
  const floorNavItems = ([
    { view: 'register', label: 'Register', icon: Store, permission: 'orders.write' },
    {
      view: 'tables',
      label: 'Tables',
      icon: LayoutGrid,
      permission: 'tables.manage',
      badge: occupiedTablesCount > 0 ? occupiedTablesCount : undefined,
    },
    {
      view: 'kds',
      label: 'Kitchen KDS',
      icon: UtensilsCrossed,
      permission: 'kitchen.manage',
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
    },
  ] as Array<{ view: ActiveView; label: string; icon: any; badge?: number; permission?: string }>).filter(item => !item.permission || permissions.includes(item.permission));

  // Secondary Management & Back-office
  const managementNavItems = ([
    { view: 'orders', label: 'Orders', icon: ReceiptText },
    { view: 'reports', label: 'Analytics', icon: BarChart3, permission: 'reports.view' },
    { view: 'menu_manager', label: 'Menu', icon: BookOpen, permission: 'menu.manage' },
    { view: 'inventory', label: 'Inventory', icon: Boxes, permission: 'inventory.manage' },
    { view: 'settings', label: 'Settings', icon: Settings, permission: 'staff.manage' },
  ] as Array<{ view: ActiveView; label: string; icon: any; permission?: string }>).filter(item => !item.permission || permissions.includes(item.permission));

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const displayName = currentUser?.name || user?.fullName || currentUser?.email?.split('@')[0] || user?.firstName || 'Staff';
  const roleName = (currentUser?.role || (user?.publicMetadata?.role as string) || (user?.unsafeMetadata?.role as string) || 'cashier').toLowerCase();
  const roleLabel = roleName
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const canSignOutBackOffice = currentUser?.role === 'restaurant_owner' || currentUser?.role === 'restaurant_admin';
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true); setProfileDropdownOpen(false); setMobileMenuOpen(false);
    try { await signOut(); } finally { setSigningOut(false); }
  };

  return (
    <header
      id="pos-top-navbar"
      className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 lg:px-6 py-2.5 flex items-center gap-4 xl:gap-6 text-slate-900 select-none shrink-0 shadow-2xs sticky top-0 z-40"
    >
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-100 text-white">
            <Flame className="w-[18px] h-[18px]" />
          </div>
          <div className="flex min-w-16 flex-col items-start gap-1 leading-none">
            <span className="font-extrabold text-sm lg:text-base tracking-tight text-slate-900 whitespace-nowrap">VC POS</span>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <Button
          id="btn-mobile-menu"
          variant="ghost"
          size="icon"
          className="2xl:hidden h-9 w-9 text-slate-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Center: Clean Decluttered Navigation Pill Switcher */}
      <nav className="hidden 2xl:flex min-w-0 flex-1 items-center justify-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70">
        {/* Floor Operations Group */}
        <div className="flex items-center gap-1">
          {floorNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                id={`nav-btn-${item.view}`}
                onClick={() => handleNavClick(item.view)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px bg-slate-300/80 mx-1.5" />

        {/* Management & Analytics Group */}
        <div className="flex items-center gap-1">
          {managementNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                id={`nav-btn-${item.view}`}
                onClick={() => handleNavClick(item.view)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right: Time & User Profile Menu */}
      <div className="ml-auto flex shrink-0 items-center gap-3.5">
        {/* Compact Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100/80 text-slate-600 border border-slate-200/60 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>{timeStr}</span>
        </div>

        {/* Profile Dropdown Chip */}
        <div className="relative" ref={profileMenuRef}>
          <button
            id="btn-user-profile-menu"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3 p-1.5 pr-2 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer text-left active:scale-[0.98]"
          >
            <Avatar size="sm" className="h-7 w-7 border border-indigo-100">
              <AvatarFallback className="bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex min-w-0 max-w-40 flex-col items-start gap-1 leading-none">
              <span className="font-semibold text-xs text-slate-800 truncate block w-full">
                {displayName}
              </span>
              <span className="block w-full truncate text-[9px] font-bold uppercase tracking-[0.08em] text-indigo-700">
                {roleLabel}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Popover Dropdown */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800">
              <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-800 truncate">{displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  <span className="text-[10px] text-slate-500 uppercase font-mono">{roleName} Access</span>
                </div>
              </div>

              {permissions.includes('staff.manage') && <button onClick={() => { setProfileDropdownOpen(false); setStaffManagerOpen(true); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"><ShieldCheck className="w-3.5 h-3.5" /><span>Manage Staff PINs</span></button>}
              {platformRole && <button onClick={() => { setProfileDropdownOpen(false); setWorkspace('platform'); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"><ShieldCheck className="w-3.5 h-3.5" /><span>Platform console</span></button>}
              <button
                id="dropdown-signout"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  lockTerminal();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Lock &amp; Switch User</span>
              </button>
              {canSignOutBackOffice && <button id="dropdown-clerk-signout" disabled={signingOut} onClick={handleSignOut} className="mt-1 w-full flex items-center gap-2 border-t border-slate-100 px-2.5 pt-2 pb-1.5 rounded-b-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition cursor-pointer"><Power className="w-3.5 h-3.5 text-slate-500" /><span>{signingOut ? 'Signing out…' : 'Sign out of account'}</span></button>}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slideout Navigation */}
      {mobileMenuOpen && (
        <div className="2xl:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-xl z-50 p-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 mb-1.5">Operations</p>
            <div className="space-y-1">
              {floorNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNavClick(item.view)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 mb-1.5">Management</p>
            <div className="space-y-1">
              {managementNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNavClick(item.view)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isActive ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={lockTerminal}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Lock &amp; Switch User</span>
            </button>
            {canSignOutBackOffice && <button disabled={signingOut} onClick={handleSignOut} className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition cursor-pointer">{signingOut ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}<span>{signingOut ? 'Signing out…' : 'Sign out of account'}</span></button>}
          </div>
        </div>
      )}
      {staffManagerOpen && <StaffManagementModal onClose={() => setStaffManagerOpen(false)} />}
    </header>
  );
}
