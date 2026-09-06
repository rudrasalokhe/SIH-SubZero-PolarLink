'use client';

import React, { useEffect, useState } from 'react';
import { getPendingRecords } from '@/lib/db';
import { syncAll } from '@/lib/syncManager';
import { CargoItem, PersonnelItem, SOSAlertItem } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import AuthGuard from '@/components/AuthGuard';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  CloudUpload,
  Clock,
  Terminal,
  Database,
  CheckCircle2,
  AlertTriangle,
  Play,
  ToggleLeft,
  ToggleRight,
  Radio,
  FileText,
} from 'lucide-react';

export default function SyncDebugPage() {
  const [mounted, setMounted] = useState(false);
  const [pendingData, setPendingData] = useState<{
    cargo: CargoItem[];
    personnel: PersonnelItem[];
    sosAlerts: SOSAlertItem[];
  }>({ cargo: [], personnel: [], sosAlerts: [] });

  const [loading, setLoading] = useState(true);
  const [syncingNow, setSyncingNow] = useState(false);

  const {
    isOnline,
    simulateOffline,
    toggleSimulateOffline,
    syncStatus,
    pendingCount,
    lastSyncTime,
    syncLogs,
    isEffectivelyOnline,
  } = useAppStore();

  const effectivelyOnline = mounted ? isEffectivelyOnline() : true;

  const loadPending = async () => {
    try {
      const data = await getPendingRecords();
      setPendingData(data);
    } catch (e) {
      console.error('Failed to load pending sync records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadPending();
  }, [pendingCount]);

  const handleForceSync = async () => {
    setSyncingNow(true);
    try {
      await syncAll();
      await loadPending();
    } finally {
      setSyncingNow(false);
    }
  };

  const totalPending =
    pendingData.cargo.length + pendingData.personnel.length + pendingData.sosAlerts.length;

  return (
    <AuthGuard>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-polar-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-polar-ice" />
            Offline Sync & Replication Engine
          </h1>
          <p className="text-xs font-mono text-polar-400 mt-1">
            WA-SQLite Local Queue • Delta Sync Protocol • Station Master Replication
          </p>
        </div>

        {/* Action Controls: Force Sync + Offline Simulation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleForceSync}
            disabled={syncingNow || !effectivelyOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-xs transition-all shadow-lg ${
              !effectivelyOnline
                ? 'bg-polar-800 text-polar-600 cursor-not-allowed'
                : 'bg-polar-ice text-polar-950 hover:bg-sky-300 shadow-polar-ice/20 active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
            Force Sync Now
          </button>
        </div>
      </div>

      {/* Interactive Control Panel: Offline Simulator & Real-time Connectivity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Simulate Offline Switch */}
        <div className="polar-card p-4 flex flex-col justify-between border-polar-700 bg-polar-900/90">
          <div>
            <div className="text-xs font-mono text-polar-400 uppercase tracking-wider">Demo Override</div>
            <div className="text-sm font-bold text-white mt-1">Simulate Offline Mode</div>
            <p className="text-[11px] font-mono text-polar-400 mt-1">
              Simulates expedition airgap disconnect for live judge demonstrations.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-polar-800 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold">
              {mounted && simulateOffline ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <WifiOff className="w-3.5 h-3.5" /> AIRGAP ACTIVE
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" /> REAL NETWORK
                </span>
              )}
            </span>
            <button
              onClick={toggleSimulateOffline}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                simulateOffline
                  ? 'bg-amber-500 text-polar-950 shadow-md shadow-amber-500/20'
                  : 'bg-polar-800 text-slate-300 hover:bg-polar-700'
              }`}
            >
              {simulateOffline ? 'Disable Airgap' : 'Enable Airgap'}
            </button>
          </div>
        </div>

        {/* Sync Status Card */}
        <div className="polar-card p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-polar-400 uppercase tracking-wider">Engine Status</div>
            <div className="text-2xl font-bold font-mono text-white mt-1 capitalize flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  !effectivelyOnline
                    ? 'bg-slate-500'
                    : syncStatus === 'syncing'
                    ? 'bg-sky-400 animate-ping'
                    : pendingCount > 0
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
              {effectivelyOnline ? syncStatus : 'Offline'}
            </div>
            <p className="text-[11px] font-mono text-polar-400 mt-1">
              30s background poll + online event listener
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-polar-800 text-[11px] font-mono text-polar-400">
            Last Synced: <span className="text-slate-200">{mounted && lastSyncTime ? lastSyncTime : 'Pending initial cycle'}</span>
          </div>
        </div>

        {/* Pending Delta Count */}
        <div className="polar-card p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-polar-400 uppercase tracking-wider">Unsynced Local Queue</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1 flex items-center gap-2">
              {totalPending} Records
              {totalPending > 0 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pending Push
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-polar-400 mt-1">
              Waiting in WA-SQLite storage to transmit to mainland.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-polar-800 text-[11px] font-mono text-polar-400">
            Storage Engine: <span className="text-polar-teal font-semibold">WA-SQLite (OPFS)</span>
          </div>
        </div>
      </div>

      {/* Pending Items Table */}
      <div className="polar-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-polar-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-polar-ice" />
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Local Outbox Queue (_pending_sync = true)
            </h2>
          </div>
          <span className="text-xs font-mono text-polar-400">
            {totalPending} pending records in local SQLite
          </span>
        </div>

        {totalPending === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-mono text-white font-semibold">Local Outbox Is Clean</div>
            <p className="text-xs font-mono text-polar-400">
              All local mutations have been successfully replicated to the Station Master Node backend.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-polar-900/80 text-polar-400 border-b border-polar-800 text-[11px] uppercase">
                  <th className="py-2.5 px-3">Collection</th>
                  <th className="py-2.5 px-3">Document ID</th>
                  <th className="py-2.5 px-3">Description / Name</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-polar-800/60">
                {pendingData.cargo.map((c) => (
                  <tr key={c.itemId} className="hover:bg-polar-800/30">
                    <td className="py-2.5 px-3 text-polar-teal font-bold">Cargo</td>
                    <td className="py-2.5 px-3 text-slate-300">{c.itemId}</td>
                    <td className="py-2.5 px-3 text-white">{c.name} ({c.quantity} {c.unit})</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        PENDING SYNC
                      </span>
                    </td>
                  </tr>
                ))}

                {pendingData.personnel.map((p) => (
                  <tr key={p.personnelId} className="hover:bg-polar-800/30">
                    <td className="py-2.5 px-3 text-polar-ice font-bold">Personnel</td>
                    <td className="py-2.5 px-3 text-slate-300">{p.personnelId}</td>
                    <td className="py-2.5 px-3 text-white">{p.name} ({p.role})</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        PENDING SYNC
                      </span>
                    </td>
                  </tr>
                ))}

                {pendingData.sosAlerts.map((a) => (
                  <tr key={a.alertId} className="hover:bg-polar-800/30 bg-rose-950/20">
                    <td className="py-2.5 px-3 text-rose-400 font-bold">SOSAlert</td>
                    <td className="py-2.5 px-3 text-slate-300">{a.alertId}</td>
                    <td className="py-2.5 px-3 text-white">
                      Alert {a.severity.toUpperCase()} • Raised by {a.raisedBy}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold animate-pulse">
                        URGENT QUEUED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Sync Event Log Feed */}
      <div className="polar-card p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-polar-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-polar-ice" />
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Replication Activity Log (Last 25 Events)
            </h2>
          </div>
          <span className="text-xs font-mono text-polar-400">Live telemetry stream</span>
        </div>

        <div className="space-y-1.5 font-mono text-xs max-h-72 overflow-y-auto pr-1">
          {!mounted || syncLogs.length === 0 ? (
            <div className="text-polar-600 text-center py-4">No events logged yet.</div>
          ) : (
            syncLogs.map((log) => {
              let tagColor = 'text-polar-400';
              let badge = 'INFO';
              if (log.status === 'success') {
                tagColor = 'text-emerald-400';
                badge = 'SYNCED';
              } else if (log.status === 'warn') {
                tagColor = 'text-amber-400';
                badge = 'WARN';
              } else if (log.status === 'error') {
                tagColor = 'text-rose-400';
                badge = 'ERROR';
              }

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2.5 py-1.5 px-2.5 rounded bg-polar-900/60 border border-polar-800/60 hover:border-polar-700 transition-colors"
                >
                  <span className="text-polar-500 text-[11px] shrink-0">{log.timestamp}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-polar-800 shrink-0 ${tagColor}`}>
                    {badge}
                  </span>
                  <span className="text-slate-300 break-all">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
