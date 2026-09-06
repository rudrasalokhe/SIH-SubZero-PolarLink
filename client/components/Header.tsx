'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import SyncBadge from './SyncBadge';
import { useAppStore } from '@/lib/store';
import { startBackgroundSync } from '@/lib/syncManager';
import { initDatabase } from '@/lib/db';

export default function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { installPromptEvent, setInstallPrompt } = useAppStore();

  useEffect(() => {
    setMounted(true);
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
  }, [setInstallPrompt]);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Compass },
    { href: '/cargo', label: 'Cargo', icon: Package },
    { href: '/personnel', label: 'Personnel', icon: Users },
    { href: '/sos', label: 'SOS Alert', icon: AlertOctagon, isEmergency: true },
    { href: '/sync', label: 'Sync Debug', icon: RefreshCw },
  ];

  return (
    <header className="sticky top-0 z-40 bg-polar-900/90 backdrop-blur-md border-b border-polar-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-polar-ice to-polar-teal p-0.5 shadow-lg shadow-polar-ice/20 flex items-center justify-center">
                <div className="w-full h-full bg-polar-950 rounded-[7px] flex items-center justify-center">
                  <Radio className="w-4 h-4 text-polar-ice group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white tracking-wider text-base font-mono">
                    POLAR<span className="text-polar-ice">LINK</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-polar-800 text-polar-400 border border-polar-700">
                    Field Node
                  </span>
                </div>
                <div className="text-[10px] font-mono text-polar-400">Station Alpha • -77.846°S</div>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

              if (link.isEmergency) {
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
                      ? 'bg-polar-800 text-polar-ice font-semibold border border-polar-700'
                      : 'text-polar-400 hover:text-white hover:bg-polar-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Install Button + Sync Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {mounted && installPromptEvent && (
              <button
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-polar-800 text-polar-ice border border-polar-ice/40 hover:bg-polar-700 transition-colors"
                title="Install PolarLink PWA"
              >
                <Download className="w-3.5 h-3.5" />
                Install PWA
              </button>
            )}

            <SyncBadge />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-polar-400 hover:text-white hover:bg-polar-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-polar-800 bg-polar-950 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-mono ${
                  link.isEmergency
                    ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                    : isActive
                    ? 'bg-polar-800 text-polar-ice font-semibold'
                    : 'text-polar-400 hover:bg-polar-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  {link.label}
                </div>
                {link.isEmergency && <span className="text-xs text-rose-400 font-bold">EMERGENCY</span>}
              </Link>
            );
          })}

          {mounted && installPromptEvent && (
            <button
              onClick={() => {
                handleInstallClick();
                setMobileMenuOpen(false);
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono rounded bg-polar-ice/15 text-polar-ice border border-polar-ice/40"
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
