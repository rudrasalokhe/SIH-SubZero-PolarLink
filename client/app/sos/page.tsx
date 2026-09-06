'use client';

import React, { useEffect, useState } from 'react';
import {
  getAllSOSAlertsLocal,
  saveSOSAlertLocal,
  updateSOSStatusLocal,
  getAllPersonnelLocal,
  getAllCargoLocal,
} from '@/lib/db';
import { triggerPrioritySOSSync, syncAll } from '@/lib/syncManager';
import { apiAcknowledgeAlert, apiResolveAlert } from '@/lib/api';
import { SOSAlertItem, PersonnelItem, CargoItem, AlertSeverity } from '@/lib/types';
import {
  AlertOctagon,
  Radio,
  MapPin,
  CheckCircle,
  Clock,
  HeartPulse,
  Package,
  UserCheck,
  ShieldAlert,
  Compass,
  Check,
  X,
  RefreshCw,
  Flame,
  WifiOff,
  Shield,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import AuthGuard from '@/components/AuthGuard';

export default function SOSPage() {
  const [alerts, setAlerts] = useState<SOSAlertItem[]>([]);
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>([]);
  const [cargoList, setCargoList] = useState<CargoItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string>('Detecting GPS...');

  const { isEffectivelyOnline, addSyncLog, user } = useAppStore();
  const online = isEffectivelyOnline();

  // Form state
  const [raisedBy, setRaisedBy] = useState(user?.personnelId || '');
  const [severity, setSeverity] = useState<AlertSeverity>('critical');
  const [stationId, setStationId] = useState(user?.stationId || 'station-alpha');
  const [lat, setLat] = useState(-77.846);
  const [lng, setLng] = useState(166.668);

  const canTriage = user?.role === 'medic' || user?.role === 'commander';

  const loadData = async () => {
    try {
      const [allAlerts, allPersonnel, allCargo] = await Promise.all([
        getAllSOSAlertsLocal(),
        getAllPersonnelLocal(),
        getAllCargoLocal(),
      ]);
      setAlerts(allAlerts);
      setPersonnelList(allPersonnel);
      setCargoList(allCargo);
      if (allPersonnel.length > 0 && !raisedBy) {
        setRaisedBy(allPersonnel[0].personnelId);
      }
    } catch (e) {
      console.error('Error loading SOS data from local SQLite:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto capture GPS coordinates
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(4)));
          setLng(Number(pos.coords.longitude.toFixed(4)));
          setGeoStatus('GPS Fix Locked (Device Location)');
        },
        () => {
          setGeoStatus('GPS Simulated: Station Alpha Outpost (-77.846°S, 166.668°E)');
        },
        { timeout: 4000 }
      );
    } else {
      setGeoStatus('Station Alpha Polar Reference Coordinates');
    }
  }, []);

  const handleRaiseSOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raisedBy) {
      alert('Please select the crew member raising the alert');
      return;
    }

    setSubmitting(true);
    const alertId = `sos-${Math.random().toString(36).substring(2, 10)}`;

    // 1. Client-side local triage: pre-match available medic and inventory from local SQLite
    const localMedic = personnelList.find(
      (p) => p.role === 'medic' && p.medicalClearance?.status === 'cleared' && p.sosStatus === 'safe'
    );
    const localMedicalCargo = cargoList
      .filter((c) => c.category === 'medical' && c.currentLocation?.status !== 'consumed')
      .map((c) => c.itemId);

    // 2. Instant local write to WA-SQLite
    const newAlert: Partial<SOSAlertItem> = {
      alertId,
      _local_id: alertId,
      raisedBy,
      stationId,
      location: { lat, lng },
      severity,
      status: 'active',
      matchedMedic: localMedic?.personnelId || null,
      matchedInventory: localMedicalCargo,
      _synced: false,
      _pending_sync: true,
      createdAt: new Date().toISOString(),
    };

    await saveSOSAlertLocal(newAlert, true);
    addSyncLog(`EMERGENCY SOS ${alertId} raised by ${raisedBy} (saved in WA-SQLite)`, 'warn', 'SOSAlert', alertId);

    setIsFormOpen(false);
    await loadData();
    setSubmitting(false);

    // 3. Priority push to Station Master Node if connection allows
    triggerPrioritySOSSync().then(loadData);
  };

  const handleAcknowledge = async (alertId: string) => {
    await updateSOSStatusLocal(alertId, 'acknowledged');
    addSyncLog(`SOS Alert ${alertId} acknowledged by ${user?.name || 'Medic'}`, 'info', 'SOSAlert', alertId);
    await loadData();
    apiAcknowledgeAlert(alertId).catch((e) => console.warn('Background ACK sync:', e));
    syncAll().then(loadData);
  };

  const handleResolve = async (alertId: string) => {
    await updateSOSStatusLocal(alertId, 'resolved', user?.personnelId);
    addSyncLog(`SOS Alert ${alertId} resolved by ${user?.name || 'Medic'} - raiser status restored to SAFE`, 'success', 'SOSAlert', alertId);
    await loadData();
    apiResolveAlert(alertId).catch((e) => console.warn('Background Resolve sync:', e));
    syncAll().then(loadData);
  };

  const activeAlerts = alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');

  return (
    <AuthGuard>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Visual Emergency Header & Big SOS Button */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-rose-950/40 via-polar-900 to-polar-950 border-2 border-rose-500/40 p-6 sm:p-10 shadow-2xl shadow-rose-950/50 text-center">
          {/* Radar Ring Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-rose-500/20 pointer-events-none animate-ping opacity-25" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-rose-500/30 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-xs font-mono text-rose-300 uppercase tracking-widest font-bold">
            <Radio className="w-4 h-4 animate-pulse" />
            Tactical Emergency Channel
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
            POLAR DISTRESS BEACON
          </h1>
          <p className="max-w-md mx-auto text-xs sm:text-sm font-mono text-slate-300">
            Instant local offline alert triage. Auto-allocates available station medics and emergency trauma supplies.
          </p>

          {/* GIANT RED PULSING SOS BUTTON */}
          <div className="pt-4 pb-2">
            <button
              onClick={() => setIsFormOpen(true)}
              className="group relative inline-flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 text-white font-extrabold text-2xl sm:text-3xl tracking-wider shadow-2xl shadow-rose-600/50 border-4 border-rose-300/40 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-rose-500/80 animate-pulse-urgent"
            >
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                <AlertOctagon className="w-12 h-12 sm:w-16 sm:h-16 group-hover:rotate-12 transition-transform" />
                <span className="font-mono">RAISE SOS</span>
                <span className="text-[10px] font-mono font-normal opacity-80 uppercase tracking-widest">
                  Tap To Broadcast
                </span>
              </div>
            </button>
          </div>

          <div className="text-xs font-mono text-polar-400">
            Status:{' '}
            {online ? (
              <span className="text-emerald-400 font-semibold">● Station Node Linked</span>
            ) : (
              <span className="text-amber-400 font-semibold">
                ● Offline Mode (Will log locally & sync when connection restored)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: RAISE SOS FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-polar-900 border-2 border-rose-500/80 p-6 shadow-2xl shadow-rose-950 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-polar-800">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
                <h2 className="text-lg font-bold text-white font-sans">Emergency Distress Broadcast</h2>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded text-polar-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseSOS} className="space-y-4">
              {/* Personnel Selector */}
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
                  Personnel Raising Alert *
                </label>
                <select
                  required
                  value={raisedBy}
                  onChange={(e) => setRaisedBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-polar-950 border border-polar-700 rounded-lg text-sm font-sans text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">Select Crew Member...</option>
                  {personnelList.map((p) => (
                    <option key={p.personnelId} value={p.personnelId}>
                      {p.name} ({p.role.toUpperCase()} - {p.personnelId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Selector */}
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
                  Emergency Severity Level *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'critical'] as AlertSeverity[]).map((sev) => {
                    const isSelected = severity === sev;
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`py-2 px-3 rounded-lg text-xs font-mono font-bold capitalize border transition-all ${
                          isSelected
                            ? sev === 'critical'
                              ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/30 animate-pulse'
                              : 'bg-amber-600 border-amber-400 text-white'
                            : 'bg-polar-950 border-polar-700 text-polar-400 hover:border-polar-600'
                        }`}
                      >
                        {sev === 'critical' && '⚠️ '}
                        {sev}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GPS Coordinates readout */}
              <div className="p-3 rounded-lg bg-polar-950 border border-polar-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-polar-ice flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    GPS Telemetry
                  </span>
                  <span className="text-[10px] text-polar-400 truncate max-w-[200px]">{geoStatus}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-polar-400 block mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={lat}
                      onChange={(e) => setLat(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-polar-900 border border-polar-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-polar-400 block mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={lng}
                      onChange={(e) => setLng(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-polar-900 border border-polar-700 rounded text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="text-[11px] font-mono text-polar-400 p-2.5 rounded bg-polar-800/60 border border-polar-700">
                {online ? (
                  <span className="text-emerald-300">
                    ⚡ Instant local write + immediate priority push to Station Master for triage matching.
                  </span>
                ) : (
                  <span className="text-amber-300">
                    📡 Station link currently disconnected. Alert will be committed locally to WA-SQLite and transmitted instantly upon reconnect.
                  </span>
                )}
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-lg bg-polar-800 text-polar-400 hover:text-white font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-lg shadow-rose-600/40 active:scale-95"
                >
                  <AlertOctagon className="w-4 h-4" />
                  Broadcast SOS Emergency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Emergency Signals List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-polar-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Active Emergency Outpost Alerts ({activeAlerts.length})
          </h2>
          <button
            onClick={() => syncAll().then(loadData)}
            className="text-xs font-mono text-polar-ice hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh Triage
          </button>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="polar-card p-8 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white font-sans">No Active Distress Signals</h3>
            <p className="text-xs font-mono text-polar-400">
              All expedition crew are reported in safe operational status across Station Alpha sectors.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAlerts.map((alert) => {
              const raiserObj = personnelList.find((p) => p.personnelId === alert.raisedBy);
              const medicObj = personnelList.find((p) => p.personnelId === alert.matchedMedic);

              return (
                <div
                  key={alert.alertId}
                  className="polar-card p-5 border-2 border-rose-500/70 bg-gradient-to-r from-rose-950/30 via-polar-900 to-polar-900 shadow-xl shadow-rose-950/40 space-y-4"
                >
                  {/* Alert Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white animate-pulse">
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-polar-400">{alert.alertId}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-polar-800 text-polar-ice uppercase">
                          {alert.status}
                        </span>
                      </div>
                      <div className="text-base font-bold text-white mt-1">
                        Raised by: {raiserObj ? raiserObj.name : alert.raisedBy}{' '}
                        {raiserObj && (
                          <span className="text-xs font-mono font-normal text-polar-400 capitalize">
                            ({raiserObj.role})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {canTriage ? (
                        <>
                          {alert.status === 'active' && (
                            <button
                              onClick={() => handleAcknowledge(alert.alertId)}
                              className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold transition-all shadow"
                            >
                              Acknowledge
                            </button>
                          )}
                          <button
                            onClick={() => handleResolve(alert.alertId)}
                            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all shadow"
                          >
                            Resolve Emergency
                          </button>
                        </>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 text-xs font-mono">
                          Medic / Cmdr Required to Resolve
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Two Columns: Matched Medic & Matched Inventory */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-polar-800/80 text-xs font-mono">
                    {/* Medic Card */}
                    <div className="p-3 rounded-lg bg-polar-950/80 border border-polar-800 space-y-1.5">
                      <div className="text-polar-ice font-semibold flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        Dispatched Polar Medic
                      </div>
                      {medicObj ? (
                        <div>
                          <div className="text-sm font-bold text-white font-sans">{medicObj.name}</div>
                          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                            <HeartPulse className="w-3 h-3" />
                            Status: Medical Clearance Cleared • Blood: {medicObj.medicalClearance?.bloodGroup || 'O+'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-polar-400 italic">
                          Awaiting mainland triage confirmation or no cleared medic available at station.
                        </div>
                      )}
                    </div>

                    {/* Medical Cargo Card */}
                    <div className="p-3 rounded-lg bg-polar-950/80 border border-polar-800 space-y-1.5">
                      <div className="text-polar-ice font-semibold flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-polar-teal" />
                        Matched Trauma Supplies
                      </div>
                      {alert.matchedInventory && alert.matchedInventory.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {alert.matchedInventory.map((itemId) => {
                            const cargo = cargoList.find((c) => c.itemId === itemId);
                            return (
                              <span
                                key={itemId}
                                className="px-2 py-0.5 rounded bg-polar-800 text-slate-200 border border-polar-700 text-[10px]"
                              >
                                {cargo ? cargo.name : itemId}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-polar-400 italic">Scanning outpost medical cargo...</div>
                      )}
                    </div>
                  </div>

                  {/* Footer telemetry */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-polar-400 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      Station: {alert.stationId} • Coords: {alert.location?.lat}, {alert.location?.lng}
                    </span>
                    <span>
                      {alert._pending_sync ? (
                        <span className="text-amber-400">Queued in local SQLite</span>
                      ) : (
                        <span className="text-emerald-400">Synced to Station Master</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved Alerts Accordion */}
      {resolvedAlerts.length > 0 && (
        <div className="polar-card p-4 space-y-3">
          <h3 className="text-xs font-mono font-bold text-polar-400 uppercase tracking-wider">
            Resolved Incident History ({resolvedAlerts.length})
          </h3>
          <div className="divide-y divide-polar-800/60 text-xs font-mono">
            {resolvedAlerts.slice(0, 5).map((a) => (
              <div key={a.alertId} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold">Alert {a.alertId}</span>
                  <span className="text-polar-400 ml-2">Raised by {a.raisedBy}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                  RESOLVED • SAFE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </AuthGuard>
  );
}
