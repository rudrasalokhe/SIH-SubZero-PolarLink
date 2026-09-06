'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGetCargo, apiGetPersonnel, apiGetActiveAlerts } from '@/lib/api';
import { CargoItem, PersonnelItem, SOSAlertItem } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';
import {
  Building2,
  ArrowLeft,
  Package,
  Users,
  AlertOctagon,
  MapPin,
  RefreshCw,
  ShieldCheck,
  HeartPulse,
  Phone,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function StationDrilldownPage() {
  const params = useParams();
  const router = useRouter();
  const stationId = (params?.stationId as string) || 'station-alpha';

  const [cargo, setCargo] = useState<CargoItem[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelItem[]>([]);
  const [sosAlerts, setSOSAlerts] = useState<SOSAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cargo' | 'personnel' | 'sos'>('cargo');

  const loadStationData = async () => {
    try {
      setLoading(true);
      const [allCargo, allPersonnel, allAlerts] = await Promise.all([
        apiGetCargo(),
        apiGetPersonnel(),
        apiGetActiveAlerts(),
      ]);

      setCargo(allCargo.filter((c) => (c.currentLocation?.stationId || 'station-alpha').toLowerCase() === stationId.toLowerCase()));
      setPersonnel(allPersonnel.filter((p) => (p.currentLocation?.stationId || 'station-alpha').toLowerCase() === stationId.toLowerCase()));
      setSOSAlerts(allAlerts.filter((a) => (a.stationId || 'station-alpha').toLowerCase() === stationId.toLowerCase()));
    } catch (e) {
      console.error('Error fetching station details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStationData();
  }, [stationId]);

  return (
    <AuthGuard allowedRoles={['hq_admin']}>
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
        {/* Header with Back button */}
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
                  Sector Inspection
                </span>
                <span className="text-xs font-mono text-slate-400">Polar Station Terminal</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5 capitalize">
                {stationId.replace('-', ' ')} Drill-down
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href={`/hq/map?station=${stationId}`}
              className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 flex items-center gap-2 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              View on Map
            </Link>
            <button
              onClick={loadStationData}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Station
            </button>
          </div>
        </div>

        {/* Quick Station Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#0b1220] border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">{cargo.length}</div>
              <div className="text-xs font-mono text-slate-400">Cargo Items Logged</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1220] border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">{personnel.length}</div>
              <div className="text-xs font-mono text-slate-400">Crew Stationed</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1220] border border-slate-800 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${sosAlerts.length > 0 ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-xl font-bold font-mono ${sosAlerts.length > 0 ? 'text-rose-400' : 'text-white'}`}>
                {sosAlerts.length}
              </div>
              <div className="text-xs font-mono text-slate-400">Active SOS Signals</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('cargo')}
            className={`pb-3 px-4 text-xs font-mono font-semibold transition-all border-b-2 ${
              activeTab === 'cargo'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Cargo Inventory ({cargo.length})
          </button>
          <button
            onClick={() => setActiveTab('personnel')}
            className={`pb-3 px-4 text-xs font-mono font-semibold transition-all border-b-2 ${
              activeTab === 'personnel'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Station Crew ({personnel.length})
          </button>
          <button
            onClick={() => setActiveTab('sos')}
            className={`pb-3 px-4 text-xs font-mono font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'sos'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Distress Alerts ({sosAlerts.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              Fetching station telemetry details...
            </div>
          ) : activeTab === 'cargo' ? (
            cargo.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-slate-400">
                No cargo inventory found registered to {stationId}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Item & UUID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Quantity / Threshold</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Ordered By</th>
                      <th className="py-3 px-4">Confirmed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cargo.map((item) => (
                      <tr key={item.itemId} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-[10px] text-slate-500">{item.itemId}</div>
                        </td>
                        <td className="py-3 px-4 capitalize">{item.category}</td>
                        <td className="py-3 px-4">
                          <span className={item.quantity <= item.criticalThreshold ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-slate-500 ml-1">/ {item.criticalThreshold}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            item.currentLocation.status === 'requested' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {item.currentLocation.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{item.orderedBy}</td>
                        <td className="py-3 px-4 text-cyan-400">{item.confirmedBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'personnel' ? (
            personnel.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-slate-400">
                No crew members currently assigned to {stationId}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {personnel.map((p) => (
                  <div key={p.personnelId} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-sm">{p.name}</div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 uppercase text-[10px] border border-slate-700">
                        {p.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{p.personnelId}</div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Medical:</span>
                      <span className="text-emerald-400 uppercase font-semibold">{p.medicalClearance?.status || 'cleared'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Blood Group:</span>
                      <span className="text-white">{p.medicalClearance?.bloodGroup || 'O+'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            sosAlerts.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-emerald-400 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8" />
                <span>No active emergency distress signals at this station.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 p-4 space-y-4">
                {sosAlerts.map((a) => (
                  <div key={a.alertId} className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                        {a.severity} DISTRESS • {a.alertId}
                      </span>
                      <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        {a.status}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-white">Raised By: {a.raisedBy}</div>
                    <div className="text-xs font-mono text-slate-400">
                      Coordinates: {a.location?.lat}, {a.location?.lng} • Matched Medic: {a.matchedMedic || 'Triage in progress'}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
