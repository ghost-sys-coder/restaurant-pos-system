import { useEffect, useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
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
} from 'lucide-react';
import { ActiveView } from '../types.ts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Navbar() {
  const { activeView, setActiveView, orders, tables } = usePos();
  const { currentUser, signOut } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeOrdersCount = orders.filter(
    o => o.status === 'active' || o.status === 'preparing' || o.status === 'ready'
  ).length;

  const occupiedTablesCount = tables.filter(t => t.status === 'occupied').length;

  const navItems: Array<{ view: ActiveView; label: string; icon: any; badge?: number }> = [
    { view: 'register', label: 'POS Register', icon: Store },
    {
      view: 'tables',
      label: 'Floor & Tables',
      icon: LayoutGrid,
      badge: occupiedTablesCount > 0 ? occupiedTablesCount : undefined,
    },
    {
      view: 'kds',
      label: 'Kitchen KDS',
      icon: UtensilsCrossed,
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
    },
    { view: 'orders', label: 'Order History', icon: ReceiptText },
    { view: 'reports', label: 'Daily Analytics', icon: BarChart3 },
    { view: 'menu_manager', label: 'Menu Catalog', icon: BookOpen },
  ];

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="pos-top-navbar"
      className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-2.5 flex items-center justify-between text-slate-900 select-none shrink-0 shadow-sm sticky top-0 z-40"
    >
      {/* Brand & Status */}
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 text-white">
            <Flame className="w-4 h-4 lg:w-5 lg:h-5" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm lg:text-base tracking-tight text-slate-800">VC POS</span>
              <Badge variant="secondary" className="h-5 gap-1 text-[9px] lg:text-[10px] uppercase font-semibold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                POS Live
              </Badge>
            </div>
            <p className="text-[10px] lg:text-xs text-slate-500 font-medium">TERMINAL: MAIN-FLOOR-01</p>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <Button
          id="btn-mobile-menu"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>

        {/* View Switcher Navigation - Desktop */}
        <nav className="hidden lg:flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                id={`nav-btn-${item.view}`}
                onClick={() => handleNavClick(item.view)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
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
        </nav>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-50">
          <nav className="p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.view;
              return (
                <button
                  key={item.view}
                  id={`nav-btn-mobile-${item.view}`}
                  onClick={() => handleNavClick(item.view)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Right Controls: Clock, Staff Switch, Google Auth */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Clock - hidden on small screens */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100/80 text-slate-700 border border-slate-200/80 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">{timeStr}</span>
        </div>

        <div className="flex items-center gap-2">
          <Avatar size="sm" className="h-7 w-7">
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[10px] font-bold">
              {(currentUser?.name || currentUser?.email || '?').charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="text-left leading-tight hidden sm:block">
            <p className="font-semibold text-slate-800 text-xs truncate max-w-25 lg:max-w-32.5">
              {currentUser?.name || currentUser?.email}
            </p>
            <p className="text-[10px] text-indigo-600 uppercase font-mono">{currentUser?.role}</p>
          </div>
        </div>

        {currentUser && (
          <Button
            id="btn-signout"
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Sign Out</span>
          </Button>
        )}
      </div>
    </header>
  );
}
