'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass,
  Package,
  Users,
  AlertOctagon,
  RefreshCw,
  Download,
  Menu,
  X,
  Radio,
  LogOut,
  Building2,
  Shield,
} from 'lucide-react';
import SyncBadge from './SyncBadge';
import { useAppStore } from '@/lib/store';
import { startBackgroundSync } from '@/lib/syncManager';
import { initDatabase } from '@/lib/db';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { installPromptEvent, setInstallPrompt, user, logout, initAuth } = useAppStore();

  useEffect(() => {
    setMounted(true);
    initAuth();
    // Initialize WA-SQLite and start background sync manager
    initDatabase().then(() => {
      const stopSync = startBackgroundSync();
      return () => stopSync();
    });

    // PWA Install prompt listener
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [setInstallPrompt, initAuth]);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isLoginPage = pathname === '/login';

  const roleStyles: Record<string, string> = {
    commander: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
    medic: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    scientist: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
    engineer: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    logistics: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
    hq_admin: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
  };

  const isHQAdmin = user?.role === 'hq_admin';

  const navLinks = isHQAdmin
    ? [
        { href: '/hq', label: 'HQ Overview', icon: Building2 },
        { href: '/hq/sync-log', label: 'Global Sync Log', icon: RefreshCw },
        { href: '/dashboard', label: 'Field Terminal', icon: Compass },
      ]
    : [
        { href: '/dashboard', label: 'Dashboard', icon: Compass },
        { href: '/cargo', label: 'Cargo', icon: Package },
        { href: '/personnel', label: 'Personnel', icon: Users },
        { href: '/sos', label: 'SOS Alert', icon: AlertOctagon, isEmergency: true },
        { href: '/sync', label: 'Sync Engine', icon: RefreshCw },
      ];

  if (isLoginPage) {
    return null; // Keep login screen dedicated and clean
  }

  return (
    <header className="sticky top-0 z-40 bg-[#060a12]/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href={isHQAdmin ? '/hq' : '/dashboard'} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#060a12] rounded-[7px] flex items-center justify-center">
                  <Radio className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white tracking-wider text-base font-mono">
                    POLAR<span className="text-cyan-400">LINK</span>
                  </span>
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${isHQAdmin ? 'bg-rose-950/80 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {isHQAdmin ? 'Mainland HQ' : 'Field Node'}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  {isHQAdmin ? 'National Polar Centre, Goa' : `${user?.stationId || 'Station Alpha'} • Polar Sector`}
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/dashboard' && link.href !== '/hq' && pathname.startsWith(link.href));

              if ((link as any).isEmergency) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold tracking-wide transition-all duration-200 ${
                      isActive
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 animate-pulse" />
                    {link.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 font-semibold border border-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: User Badge, Install, Sync Badge, Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {mounted && installPromptEvent && (
              <button
                onClick={handleInstallClick}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-slate-800 text-cyan-400 border border-cyan-500/30 hover:bg-slate-700 transition-colors"
                title="Install PolarLink PWA"
              >
                <Download className="w-3.5 h-3.5" />
                Install PWA
              </button>
            )}

            <SyncBadge />

            {/* Authenticated User Status */}
            {mounted && user && (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-200 leading-tight">
                    {user.name}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${roleStyles[user.role] || 'border-slate-700 text-slate-400'}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Logout from terminal"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#060a12] px-4 pt-2 pb-4 space-y-2">
          {user && (
            <div className="p-2.5 mb-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-200">{user.name}</div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase">{user.role.replace('_', ' ')} • {user.stationId}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs text-rose-400 font-mono px-2 py-1 rounded bg-rose-950/40 border border-rose-500/30"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          )}

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-mono ${
                  (link as any).isEmergency
                    ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                    : isActive
                    ? 'bg-slate-800 text-cyan-400 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  {link.label}
                </div>
                {(link as any).isEmergency && <span className="text-xs text-rose-400 font-bold">EMERGENCY</span>}
              </Link>
            );
          })}

          {mounted && installPromptEvent && (
            <button
              onClick={() => {
                handleInstallClick();
                setMobileMenuOpen(false);
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/40"
            >
              <Download className="w-4 h-4" />
              Install PWA on Device
            </button>
          )}
        </div>
      )}
    </header>
  );
}

