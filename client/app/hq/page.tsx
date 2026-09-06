'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGetHQOverview } from '@/lib/api';
import { HQOverviewData, HQStation } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import AuthGuard from '@/components/AuthGuard';
import {
  Building2,
  Package,
  Users,
  AlertOctagon,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Globe2,
  Layers,
  LogOut,
} from 'lucide-react';

/** Returns a human-readable relative time string like "5 min ago" */
function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Station is "Lagging" if pendingSyncCount > 5 OR lastSync > 6 hours old */
function isStationLagging(station: HQStation): boolean {
  if (station.pendingSyncCount > 5) return true;
  const sixHoursMs = 6 * 60 * 60 * 1000;
  const age = Date.now() - new Date(station.lastSyncTimestamp).getTime();
  return age > sixHoursMs;
}

export default function MainlandHQPage() {
  const [data, setData] = useState<HQOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAppStore();

  const fetchHQData = async () => {
    try {
      const overview = await apiGetHQOverview();
      setData(overview);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load HQ overview:', err);
      setError(err.response?.data?.error || err.message || 'Failed to connect to Mainland HQ telemetry service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHQData();
    const interval = setInterval(fetchHQData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHQData();
  };

  const handleLogout = () => {
    logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthGuard allowedRoles={['hq_admin']}>
      <div className="space-y-5 max-w-7xl mx-auto px-2 sm:px-4 py-4">
        {/* ── HQ Command Header ── */}
        <div className="bg-[#0b1220]/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-rose-500/10 via-cyan-500/5 to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> Mainland Command
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  NCPOR, Goa
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                PolarLink — Mainland Command, Goa
              </h1>
              <p className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Logged in as <span className="text-cyan-400 font-semibold">{user?.name || 'Administrator'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/hq/sync-log"
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                Sync Audit
              </Link>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/30 text-[11px] font-mono text-rose-400 flex items-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[11px] font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchHQData} className="underline text-rose-200 hover:text-white">Retry</button>
          </div>
        )}

        {/* ── 3 Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Cargo */}
          <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-4 relative">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1.5">
              <span>Total Cargo</span>
              <Package className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {loading ? '...' : data?.totalCargo ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              Across {data?.stations.length ?? 0} stations
            </div>
          </div>

          {/* Total Personnel */}
          <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-4 relative">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1.5">
              <span>Total Personnel</span>
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {loading ? '...' : data?.totalPersonnel ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              All expedition crew
            </div>
          </div>

          {/* Active SOS */}
          <div className={`bg-[#0b1220] border rounded-xl p-4 relative ${
            (data?.activeSOSCount ?? 0) > 0
              ? 'border-rose-500/50 bg-rose-950/20'
              : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1.5">
              <span>Active SOS</span>
              <AlertOctagon className={`w-3.5 h-3.5 ${(data?.activeSOSCount ?? 0) > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
            </div>
            <div className={`text-2xl font-extrabold font-mono ${(data?.activeSOSCount ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {loading ? '...' : data?.activeSOSCount ?? 0}
            </div>
            <div className="text-[10px] font-mono mt-1">
              {(data?.activeSOSCount ?? 0) > 0
                ? <span className="text-rose-300 font-bold animate-pulse">IMMEDIATE TRIAGE ACTIVE</span>
                : <span className="text-emerald-400">All stations safe</span>
              }
            </div>
          </div>
        </div>

        {/* ── Station Telemetry Table ── */}
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-cyan-400" />
                Station Telemetry Matrix
              </h2>
              <p className="text-[10px] font-mono text-slate-500">
                Per-station sync health overview
              </p>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '—'}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs font-mono text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <div>Aggregating station telemetry…</div>
            </div>
          ) : !data || data.stations.length === 0 ? (
            <div className="p-10 text-center text-xs font-mono text-slate-400">
              No stations reporting telemetry.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Station ID</th>
                    <th className="py-3 px-4">Last Sync</th>
                    <th className="py-3 px-4 text-center">Pending Sync</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.stations.map((st) => {
                    const lagging = isStationLagging(st);
                    return (
                      <tr
                        key={st.stationId}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/hq/stations/${st.stationId}`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm capitalize">
                            {st.stationId.replace(/-/g, ' ')}
                          </div>
                          <div className="text-[10px] text-cyan-400 mt-0.5">{st.stationId}</div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300">
                          {st.lastSyncTimestamp ? relativeTime(st.lastSyncTimestamp) : 'Never'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={st.pendingSyncCount > 5 ? 'text-yellow-400 font-bold' : 'text-slate-300'}>
                            {st.pendingSyncCount}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {lagging ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 text-amber-400" /> LAGGING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" /> HEALTHY
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/hq/stations/${st.stationId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600/20 hover:border-cyan-500/40 border border-slate-700 text-cyan-400 hover:text-cyan-300 text-[11px] font-mono transition-all"
                          >
                            Inspect <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
