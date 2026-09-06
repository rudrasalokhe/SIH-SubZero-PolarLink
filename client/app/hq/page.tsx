'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGetHQOverview } from '@/lib/api';
import { HQOverviewData, HQStationTelemetry } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import AuthGuard from '@/components/AuthGuard';
import {
  Building2,
  Radio,
  Package,
  Users,
  AlertOctagon,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronRight,
  Activity,
  Globe2,
  ExternalLink,
} from 'lucide-react';

export default function MainlandHQPage() {
  const [data, setData] = useState<HQOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppStore();

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
    const interval = setInterval(fetchHQData, 15000); // 15s polling for HQ radar
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHQData();
  };

  const getStationBadge = (status: HQStationTelemetry['status']) => {
    switch (status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold animate-pulse">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" /> CRITICAL SOS
          </span>
        );
      case 'alert':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> LOW STOCK ALERT
          </span>
        );
      case 'lagging':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[11px] font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-yellow-400" /> SYNC LAGGING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> NOMINAL
          </span>
        );
    }
  };

  return (
    <AuthGuard allowedRoles={['hq_admin']}>
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
        {/* Top HQ Command Header */}
        <div className="bg-[#0b1220]/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-rose-500/10 via-cyan-500/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Mainland Command
                </span>
                <span className="text-xs font-mono text-slate-400">
                  National Centre for Polar & Ocean Research (NCPOR), Goa
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                PolarLink — Mainland Command, Goa
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Inter-Station Telemetry Relay Active • Logged in as Director ({user?.name || 'Administrator'})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/hq/sync-log"
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-all"
              >
                <Layers className="w-4 h-4" />
                Global Sync Audit
              </Link>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Telemetry
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchHQData} className="underline text-rose-200 hover:text-white">Retry Connection</button>
          </div>
        )}

        {/* Global Key Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Cargo */}
          <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
              <span>Total Cargo Items</span>
              <Package className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {loading ? '...' : data?.overallSummary.totalStations ? (data.stations.reduce((acc, s) => acc + s.totalCargoItems, 0)) : 0}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center justify-between">
              <span>Across {data?.overallSummary.totalStations || 0} polar stations</span>
              <span className="text-amber-400 font-semibold">
                {data?.stations.reduce((acc, s) => acc + s.lowStockCargoCount, 0) || 0} low stock
              </span>
            </div>
          </div>

          {/* Total Personnel */}
          <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
              <span>Total Expedition Crew</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {loading ? '...' : data?.overallSummary.totalPersonnelAcrossStations ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Scientists, Medics, Engineers & Commanders
            </div>
          </div>

          {/* Active Distress SOS */}
          <div className={`bg-[#0b1220] border rounded-xl p-5 relative overflow-hidden ${
            (data?.overallSummary.totalActiveSOS || 0) > 0 ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
              <span>Active Distress Alerts</span>
              <AlertOctagon className={`w-4 h-4 ${(data?.overallSummary.totalActiveSOS || 0) > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
            </div>
            <div className={`text-3xl font-extrabold font-mono ${(data?.overallSummary.totalActiveSOS || 0) > 0 ? 'text-rose-400' : 'text-white'}`}>
              {loading ? '...' : data?.overallSummary.totalActiveSOS ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              {(data?.overallSummary.totalActiveSOS || 0) > 0 ? (
                <span className="text-rose-300 font-bold animate-pulse">IMMEDIATE TRIAGE ACTIVE</span>
              ) : (
                <span className="text-emerald-400">All Polar Outposts Safe</span>
              )}
            </div>
          </div>

          {/* Pending Sync Backlog */}
          <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
              <span>Sync Backlog Queue</span>
              <RefreshCw className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {loading ? '...' : data?.overallSummary.totalPendingSyncLogs ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Pending satellite / mesh mainland flush
            </div>
          </div>
        </div>

        {/* Station Telemetry Matrix */}
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-cyan-400" />
                Antarctic Outpost Telemetry Matrix
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Dense real-time overview of Indian Antarctic stations (Bharati, Maitri, Himadri, Dakshin Gangotri)
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Synced with Atlas: {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : 'Updating...'}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <div>Aggregating satellite telemetry from polar outposts...</div>
            </div>
          ) : !data || data.stations.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              No polar stations reporting telemetry currently.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Station ID & Sector</th>
                    <th className="py-3.5 px-4">Status Flag</th>
                    <th className="py-3.5 px-4 text-center">Crew Count</th>
                    <th className="py-3.5 px-4 text-center">Cargo (Low Stock)</th>
                    <th className="py-3.5 px-4 text-center">Active SOS</th>
                    <th className="py-3.5 px-4">Pending Sync</th>
                    <th className="py-3.5 px-4">Last Reported</th>
                    <th className="py-3.5 px-4 text-right">Drill-down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.stations.map((st) => (
                    <tr key={st.stationId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm font-sans flex items-center gap-2">
                          <span>{st.stationName}</span>
                        </div>
                        <div className="text-[11px] text-cyan-400 mt-0.5">
                          {st.stationId}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {getStationBadge(st.status)}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="text-sm font-bold text-white">
                          {st.totalPersonnel}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {st.personnelByRole?.medic || 0} Med • {st.personnelByRole?.scientist || 0} Sci
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-sm font-bold text-white">{st.totalCargoItems}</span>
                          {st.lowStockCargoCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                              {st.lowStockCargoCount} low
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {st.activeSOSCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                            <AlertOctagon className="w-3 h-3 text-rose-400" />
                            {st.activeSOSCount} ACTIVE
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">0</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={st.pendingSyncCount > 5 ? 'text-yellow-400 font-bold' : 'text-slate-300'}>
                            {st.pendingSyncCount} queued
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-400">
                        {st.lastSyncTime ? new Date(st.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/hq/stations/${st.stationId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600/20 hover:border-cyan-500/40 border border-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-mono transition-all"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
