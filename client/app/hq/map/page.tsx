'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiGetPersonnel, apiGetActiveAlerts, apiUpdateLocation } from '@/lib/api';
import { PersonnelItem, SOSAlertItem } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';
import {
  Compass,
  ArrowLeft,
  RefreshCw,
  MapPin,
  Users,
  AlertOctagon,
  Shield,
  Activity,
  Sliders,
  Radio,
} from 'lucide-react';

// Dynamically import Leaflet LiveMap component to disable SSR
const LiveMap = dynamic(() => import('@/components/map/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-140px)] min-h-[640px] rounded-2xl border border-slate-800 bg-[#060a12] flex flex-col items-center justify-center p-8 text-center">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        <Compass className="w-8 h-8 text-cyan-400 absolute" />
      </div>
      <div className="text-white font-mono font-bold text-base">Initializing Radar & Cartography Feeds</div>
      <div className="text-slate-400 text-xs font-mono mt-1">Connecting to Polar Geospatial Telemetry...</div>
    </div>
  ),
});

function MapContent() {
  const searchParams = useSearchParams();
  const stationParam = searchParams.get('station');

  const [personnel, setPersonnel] = useState<PersonnelItem[]>([]);
  const [alerts, setAlerts] = useState<SOSAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPersonnelId, setTestPersonnelId] = useState('');
  const [testLat, setTestLat] = useState('-69.4078');
  const [testLng, setTestLng] = useState('76.1872');
  const [simulating, setSimulating] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setRefreshing(true);
      const [pData, aData] = await Promise.all([apiGetPersonnel(), apiGetActiveAlerts()]);
      setPersonnel(pData || []);
      setAlerts(aData || []);
      setLastSync(new Date());
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval (every 30s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Simulate / override location for testing
  const handleSimulateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPersonnelId) return;
    try {
      setSimulating(true);
      await apiUpdateLocation(testPersonnelId, parseFloat(testLat), parseFloat(testLng));
      setTestModalOpen(false);
      await fetchData(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update location');
    } finally {
      setSimulating(false);
    }
  };

  const activeSOS = alerts.filter((a) => a.status === 'active').length;
  const liveGPSCount = personnel.filter(
    (p) => p.currentLocation?.coordinates?.lat != null && p.currentLocation?.coordinates?.lng != null
  ).length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/hq"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Back to HQ Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
                Mainland Command Goa
              </span>
              <span className="text-xs font-mono text-slate-400">Tactical Reconnaissance</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
              Live Polar Fleet Map
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Quick Simulation / Manual Coordinate Tool for testing */}
          <button
            onClick={() => {
              if (personnel.length > 0 && !testPersonnelId) {
                setTestPersonnelId(personnel[0].personnelId);
              }
              setTestModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            title="Manual Location Ping / Simulate GPS for unit"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Simulate Ping</span>
          </button>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-colors ${
              autoRefresh
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle 30s Auto Refresh"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{autoRefresh ? 'Live (30s)' : 'Paused'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[#0b1220] border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold font-mono text-white">{personnel.length}</div>
            <div className="text-[10px] font-mono text-slate-400">Total Deployed Crew</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0b1220] border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold font-mono text-emerald-400">{liveGPSCount}</div>
            <div className="text-[10px] font-mono text-slate-400">Broadcasting GPS</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0b1220] border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold font-mono text-amber-300">4 Bases</div>
            <div className="text-[10px] font-mono text-slate-400">Antarctica Outposts</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0b1220] border border-slate-800 flex items-center gap-3">
          <div
            className={`p-2 rounded-lg border ${
              activeSOS > 0
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <div
              className={`text-lg font-bold font-mono ${
                activeSOS > 0 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {activeSOS} Active
            </div>
            <div className="text-[10px] font-mono text-slate-400">SOS Distress Signals</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Component */}
      <LiveMap
        personnelList={personnel}
        alertsList={alerts}
        initialStation={stationParam}
        onRefresh={() => fetchData()}
        isLoading={refreshing}
      />

      {/* Manual GPS Ping Simulation Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0b1220] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-base">GPS Beacon Override / Test</h3>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              HQ Admins have privileged access to manually ping or override GPS coordinates for any
              personnel unit for tactical tracking or simulation.
            </p>

            <form onSubmit={handleSimulateLocation} className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Select Personnel
                </label>
                <select
                  value={testPersonnelId}
                  onChange={(e) => setTestPersonnelId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">-- Choose Personnel --</option>
                  {personnel.map((p) => (
                    <option key={p.personnelId} value={p.personnelId}>
                      {p.name} ({p.role}) - {p.personnelId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={testLat}
                    onChange={(e) => setTestLat(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="-69.4078"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={testLng}
                    onChange={(e) => setTestLng(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="76.1872"
                    required
                  />
                </div>
              </div>

              {/* Quick preset locations */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-mono text-slate-500">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTestLat('-69.4078');
                    setTestLng('76.1872');
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800 hover:border-cyan-500/40"
                >
                  Alpha Base
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestLat('-70.7661');
                    setTestLng('11.7322');
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800 hover:border-cyan-500/40"
                >
                  Beta Base
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestLat('-77.8460');
                    setTestLng('166.6680');
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800 hover:border-cyan-500/40"
                >
                  Deep Field
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 disabled:opacity-50"
                >
                  {simulating ? 'Broadcasting...' : 'Broadcast GPS Ping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HQMapPage() {
  return (
    <AuthGuard allowedRoles={['hq_admin']}>
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs font-mono text-slate-400">
            Loading Mainland Tactical Radar...
          </div>
        }
      >
        <MapContent />
      </Suspense>
    </AuthGuard>
  );
}
