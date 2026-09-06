'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getDashboardStatsLocal,
  getAllSOSAlertsLocal,
  getAllCargoLocal,
} from '@/lib/db';
import { syncAll } from '@/lib/syncManager';
import { DashboardStats, SOSAlertItem, CargoItem } from '@/lib/types';
import {
  Package,
  AlertTriangle,
  AlertOctagon,
  Users,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Plus,
  Radio,
  Flame,
  Apple,
  Activity,
  Compass,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<SOSAlertItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<CargoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { syncStatus, lastSyncTime } = useAppStore();

  const loadLocalStats = async () => {
    try {
      const data = await getDashboardStatsLocal();
      const alerts = await getAllSOSAlertsLocal();
      const cargo = await getAllCargoLocal();
      setStats(data);
      setActiveAlerts(alerts.filter((a) => a.status === 'active'));
      setLowStockItems(cargo.filter((c) => c.quantity <= c.criticalThreshold));
    } catch (e) {
      console.error('Failed to load local stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    // 1. Instant local read from SQLite
    loadLocalStats();

    // 2. Trigger background refresh check
    syncAll().then(() => loadLocalStats());
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-polar-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Expedition Command</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-polar-ice/15 text-polar-ice border border-polar-ice/30">
              OFFLINE CACHE READY
            </span>
          </h1>
          <p className="text-sm text-polar-400 font-mono mt-0.5">
            Local SQLite Active • Last Synced: {mounted && lastSyncTime ? lastSyncTime : 'Pending sync'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/sos"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95"
          >
            <AlertOctagon className="w-4 h-4 animate-pulse" />
            RAISE SOS
          </Link>
          <Link
            href="/cargo/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-polar-800 hover:bg-polar-700 text-polar-ice font-mono text-xs border border-polar-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Cargo
          </Link>
          <button
            onClick={() => {
              syncAll().then(loadLocalStats);
            }}
            className="p-2 rounded-lg bg-polar-800 hover:bg-polar-700 text-polar-400 hover:text-white border border-polar-700 transition-colors"
            title="Manual sync"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin text-polar-ice' : ''}`} />
          </button>
        </div>
      </div>

      {/* Critical Active Alert Warning Banner (if any) */}
      {activeAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/60 border-2 border-rose-500/80 shadow-xl shadow-rose-950/50 animate-pulse-slow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500 text-white mt-0.5">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  {activeAlerts.length} ACTIVE SOS EMERGENCY SIGNAL{activeAlerts.length > 1 ? 'S' : ''} DETECTED
                </h3>
                <p className="text-xs text-rose-200 mt-1 font-mono">
                  Station Alpha triage engaged. Medical assistance and inventory matched locally.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeAlerts.map((alert) => (
                    <span
                      key={alert.alertId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-900/80 border border-rose-400 text-xs font-mono text-rose-100 font-semibold"
                    >
                      Alert {alert.alertId} • By: {alert.raisedBy} • Medic: {alert.matchedMedic || 'Awaiting'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/sos"
              className="px-3 py-1.5 rounded bg-rose-500 hover:bg-rose-400 text-white font-mono text-xs font-bold whitespace-nowrap shadow"
            >
              Respond →
            </Link>
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cargo */}
        <div className="polar-card p-4 polar-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-polar-400 uppercase tracking-wider">Total Cargo</span>
            <div className="p-2 rounded-lg bg-polar-800 text-polar-ice">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">
            {loading ? '--' : stats?.totalCargo ?? 0}
          </div>
          <div className="flex items-center justify-between text-xs text-polar-400 mt-3 pt-2 border-t border-polar-800/80">
            <span>In Warehouse & Transit</span>
            <Link href="/cargo" className="text-polar-ice hover:underline flex items-center gap-1 font-mono">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`polar-card p-4 polar-card-hover ${stats && stats.lowStockCount > 0 ? 'border-amber-500/40 bg-amber-950/20' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-polar-400 uppercase tracking-wider">Low Stock Warning</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400 mt-2 font-mono flex items-center gap-2">
            {loading ? '--' : stats?.lowStockCount ?? 0}
            {stats && stats.lowStockCount > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                CRITICAL
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-polar-400 mt-3 pt-2 border-t border-polar-800/80">
            <span>Below Threshold</span>
            <Link href="/cargo" className="text-amber-400 hover:underline flex items-center gap-1 font-mono">
              Inspect <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Active SOS */}
        <div className={`polar-card p-4 polar-card-hover ${activeAlerts.length > 0 ? 'border-rose-500/60 bg-rose-950/25' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-polar-400 uppercase tracking-wider">Active SOS Signals</span>
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono flex items-center gap-2">
            <span className={activeAlerts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}>
              {loading ? '--' : activeAlerts.length}
            </span>
            <span className="text-xs font-mono text-polar-400 font-normal">
              {activeAlerts.length === 0 ? 'Normal operations' : 'Urgent review'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-polar-400 mt-3 pt-2 border-t border-polar-800/80">
            <span>Emergency Status</span>
            <Link href="/sos" className="text-rose-400 hover:underline flex items-center gap-1 font-mono">
              SOS Center <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Total Personnel */}
        <div className="polar-card p-4 polar-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-polar-400 uppercase tracking-wider">Station Crew</span>
            <div className="p-2 rounded-lg bg-polar-800 text-polar-ice">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">
            {loading ? '--' : stats?.totalPersonnel ?? 0}
          </div>
          <div className="flex items-center justify-between text-xs text-polar-400 mt-3 pt-2 border-t border-polar-800/80">
            <span>All Polar Outpost Crew</span>
            <Link href="/personnel" className="text-polar-ice hover:underline flex items-center gap-1 font-mono">
              Roster <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Role Distribution & Low Stock Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personnel by Role */}
        <div className="polar-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-polar-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-polar-ice" />
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Crew Distribution by Role
              </h2>
            </div>
            <Link href="/personnel" className="text-xs font-mono text-polar-ice hover:underline">
              View All →
            </Link>
          </div>

          <div className="mt-4 space-y-3.5">
            {stats &&
              Object.entries(stats.personnelByRole).map(([role, count]) => {
                const total = Math.max(stats.totalPersonnel, 1);
                const percent = Math.round((count / total) * 100);
                const roleColors: Record<string, string> = {
                  scientist: 'bg-indigo-500',
                  engineer: 'bg-amber-500',
                  medic: 'bg-emerald-500',
                  logistics: 'bg-sky-500',
                  commander: 'bg-purple-500',
                };
                return (
                  <div key={role} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="capitalize text-slate-300 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${roleColors[role] || 'bg-slate-400'}`} />
                        {role}
                      </span>
                      <span className="text-polar-400 font-semibold">
                        {count} crew ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-polar-900 rounded-full overflow-hidden border border-polar-800">
                      <div
                        className={`h-full ${roleColors[role] || 'bg-slate-400'} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Low Stock Warning List */}
        <div className="polar-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-polar-800">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Priority Supply Alerts
              </h2>
            </div>
            <Link href="/cargo" className="text-xs font-mono text-amber-400 hover:underline">
              Manage Cargo →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-polar-800/60">
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-400">
                ✅ All inventory quantities are safely above critical thresholds.
              </div>
            ) : (
              lowStockItems.slice(0, 5).map((item) => (
                <div key={item.itemId} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{item.name}</div>
                    <div className="text-xs font-mono text-polar-400 capitalize">
                      Category: {item.category} • Location: {item.currentLocation.stationId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-rose-400">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="text-[11px] font-mono text-amber-400">
                      Threshold: {item.criticalThreshold}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
