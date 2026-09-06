'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import {
  ArrowLeft,
  RefreshCw,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Database,
} from 'lucide-react';

interface SyncLogEntry {
  _id?: string;
  stationId?: string;
  collectionName: string;
  documentId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  pushedToMainland: boolean;
  pushedAt?: string | null;
  createdAt: string;
}

export default function GlobalSyncLogPage() {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCollection, setFilterCollection] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const fetchSyncLogs = async () => {
    try {
      setLoading(true);
      // Fetch pending sync items or recent sync logs
      const res = await apiClient.get('/sync/pending');
      const data = res.data.data;

      // Flatten items into a unified audit view
      const entries: SyncLogEntry[] = [];
      
      if (Array.isArray(data.cargo)) {
        data.cargo.forEach((c: any) => {
          entries.push({
            stationId: c.currentLocation?.stationId || 'station-alpha',
            collectionName: 'Cargo',
            documentId: c.itemId,
            operation: c._deleted ? 'DELETE' : 'CREATE',
            pushedToMainland: Boolean(c._synced),
            createdAt: c.createdAt || c._lastModified || new Date().toISOString(),
          });
        });
      }

      if (Array.isArray(data.personnel)) {
        data.personnel.forEach((p: any) => {
          entries.push({
            stationId: p.currentLocation?.stationId || 'station-alpha',
            collectionName: 'Personnel',
            documentId: p.personnelId,
            operation: p._deleted ? 'DELETE' : 'UPDATE',
            pushedToMainland: Boolean(p._synced),
            createdAt: p.createdAt || p._lastModified || new Date().toISOString(),
          });
        });
      }

      if (Array.isArray(data.sosAlerts)) {
        data.sosAlerts.forEach((a: any) => {
          entries.push({
            stationId: a.stationId || 'station-alpha',
            collectionName: 'SOSAlert',
            documentId: a.alertId,
            operation: 'CREATE',
            pushedToMainland: Boolean(a._synced),
            createdAt: a.createdAt || a._lastModified || new Date().toISOString(),
          });
        });
      }

      setLogs(entries);
    } catch (e) {
      console.error('Failed to fetch sync log audit:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncLogs();
  }, []);

  const filtered = logs.filter((log) => {
    if (search && !log.documentId.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterCollection !== 'all' && log.collectionName !== filterCollection) {
      return false;
    }
    if (filterStatus === 'pushed' && !log.pushedToMainland) {
      return false;
    }
    if (filterStatus === 'pending' && log.pushedToMainland) {
      return false;
    }
    return true;
  });

  return (
    <AuthGuard allowedRoles={['hq_admin']}>
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              href="/hq"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
                  Telemetry Ledger
                </span>
                <span className="text-xs font-mono text-slate-400">Mainland HQ Audit</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
                <Layers className="w-6 h-6 text-cyan-400" /> Global Satellite Sync Log
              </h1>
            </div>
          </div>

          <button
            onClick={fetchSyncLogs}
            className="self-start sm:self-auto px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Audit
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search by Document UUID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={filterCollection}
                onChange={(e) => setFilterCollection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Collections</option>
                <option value="Cargo">Cargo</option>
                <option value="Personnel">Personnel</option>
                <option value="SOSAlert">SOS Alert</option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Sync States</option>
                <option value="pending">Pending Push (In Queue)</option>
                <option value="pushed">Pushed to Mainland</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              Querying sync logs across polar mesh stations...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              No matching sync log entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Station ID</th>
                    <th className="py-3.5 px-4">Collection</th>
                    <th className="py-3.5 px-4">Document ID</th>
                    <th className="py-3.5 px-4">Operation</th>
                    <th className="py-3.5 px-4">Mainland Relay Status</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((log, idx) => (
                    <tr key={`${log.documentId}-${idx}`} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-white">
                        {log.stationId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 text-[10px]">
                          {log.collectionName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {log.documentId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.operation === 'CREATE' ? 'bg-emerald-500/20 text-emerald-300' :
                          log.operation === 'DELETE' ? 'bg-rose-500/20 text-rose-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {log.operation}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {log.pushedToMainland ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pushed to Goa HQ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                            <Clock className="w-3.5 h-3.5" /> Pending Satellite Push
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
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
