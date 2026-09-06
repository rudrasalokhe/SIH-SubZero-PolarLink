'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { AlertTriangle, WifiOff, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';

export default function OfflineBanner() {
  const [mounted, setMounted] = useState(false);
  const { isOnline, simulateOffline, toggleSimulateOffline, pendingCount } = useAppStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || (isOnline && !simulateOffline)) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {simulateOffline ? (
            <span className="flex items-center gap-1.5 font-semibold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
              SIMULATED AIRGAP MODE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              OFFLINE MODE
            </span>
          )}
          <span>
            Operating 100% on local WA-SQLite. Reads & writes complete instantly.{' '}
            {pendingCount > 0 && <strong>({pendingCount} queued for mainland)</strong>}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {simulateOffline && (
            <button
              onClick={toggleSimulateOffline}
              className="text-amber-300 hover:text-white underline font-mono flex items-center gap-1"
            >
              Resume Online
            </button>
          )}
          <Link href="/sync" className="text-amber-400 hover:text-white underline font-mono">
            View Sync Log →
          </Link>
        </div>
      </div>
    </div>
  );
}
