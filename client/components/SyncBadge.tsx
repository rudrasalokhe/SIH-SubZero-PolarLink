'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { RefreshCw, Wifi, WifiOff, CloudUpload, CheckCircle2 } from 'lucide-react';

export default function SyncBadge() {
  const { syncStatus, pendingCount, isEffectivelyOnline } = useAppStore();
  const online = isEffectivelyOnline();

  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let dotColor = 'bg-emerald-400';
  let label = 'Synced';
  let Icon = CheckCircle2;

  if (!online) {
    badgeColor = 'bg-slate-800/80 text-slate-400 border-slate-700';
    dotColor = 'bg-slate-500';
    label = pendingCount > 0 ? `Offline (${pendingCount} pending)` : 'Offline';
    Icon = WifiOff;
  } else if (syncStatus === 'syncing') {
    badgeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    dotColor = 'bg-sky-400 animate-ping';
    label = 'Syncing...';
    Icon = RefreshCw;
  } else if (pendingCount > 0 || syncStatus === 'pending') {
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    dotColor = 'bg-amber-400';
    label = `${pendingCount} pending sync`;
    Icon = CloudUpload;
  }

  return (
    <Link
      href="/sync"
      className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-mono font-medium rounded-full border transition-all duration-200 hover:opacity-90 ${badgeColor}`}
      title="View offline sync center"
    >
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>
      <span className="truncate max-w-[130px] sm:max-w-none">{label}</span>
    </Link>
  );
}
