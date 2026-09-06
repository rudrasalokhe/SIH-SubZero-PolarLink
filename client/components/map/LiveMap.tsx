'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { PersonnelItem, SOSAlertItem } from '@/lib/types';
import {
  Shield,
  HeartPulse,
  Radio,
  Clock,
  Compass,
  Building2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Navigation,
  Crosshair,
  ChevronRight,
  Eye,
  Layers,
} from 'lucide-react';

export interface StationGeo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export const KNOWN_STATIONS: Record<string, StationGeo> = {
  'station-alpha': {
    id: 'station-alpha',
    name: 'Alpha Base (Larsemann)',
    lat: -69.4078,
    lng: 76.1872,
    type: 'Primary Research Complex',
  },
  'station-beta': {
    id: 'station-beta',
    name: 'Beta Base (Maitri)',
    lat: -70.7661,
    lng: 11.7322,
    type: 'Sub-Zero Meteorological Lab',
  },
  'station-gamma': {
    id: 'station-gamma',
    name: 'Gamma Outpost (McMurdo)',
    lat: -77.846,
    lng: 166.668,
    type: 'Deep-Field Communications Node',
  },
  'station-delta': {
    id: 'station-delta',
    name: 'Delta Outpost (Concordia)',
    lat: -75.1,
    lng: 123.3333,
    type: 'High-Altitude Cryo Station',
  },
};

// Map center controller helper
function MapController({
  targetCoords,
  targetZoom,
}: {
  targetCoords: [number, number] | null;
  targetZoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, targetZoom, {
        duration: 1.2,
      });
    }
  }, [targetCoords, targetZoom, map]);
  return null;
}

// Generate consistent minor offset for people clustered at base station without GPS
function getJitterOffset(id: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((hash % 100) / 1000) * 0.05;
  const lngOffset = (((hash >> 3) % 100) / 1000) * 0.1;
  return [latOffset, lngOffset];
}

interface LiveMapProps {
  personnelList: PersonnelItem[];
  alertsList: SOSAlertItem[];
  initialStation?: string | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function LiveMap({
  personnelList,
  alertsList,
  initialStation,
  onRefresh,
  isLoading = false,
}: LiveMapProps) {
  const [selectedStation, setSelectedStation] = useState<string>(initialStation || 'all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [mapLayer, setMapLayer] = useState<'dark' | 'satellite'>('dark');
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [flyZoom, setFlyZoom] = useState<number>(5);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Focus on initialStation if specified
  useEffect(() => {
    if (initialStation && KNOWN_STATIONS[initialStation]) {
      const s = KNOWN_STATIONS[initialStation];
      setFlyTarget([s.lat, s.lng]);
      setFlyZoom(8);
      setSelectedStation(initialStation);
    }
  }, [initialStation]);

  // Compute resolved location for each personnel
  const personnelWithCoords = useMemo(() => {
    return personnelList.map((p) => {
      const stationId = (p.currentLocation?.stationId || 'station-alpha').toLowerCase();
      const baseStation = KNOWN_STATIONS[stationId] || KNOWN_STATIONS['station-alpha'];

      const hasLiveGPS =
        p.currentLocation?.coordinates?.lat != null &&
        p.currentLocation?.coordinates?.lng != null;

      let lat: number;
      let lng: number;

      if (hasLiveGPS) {
        lat = p.currentLocation.coordinates!.lat;
        lng = p.currentLocation.coordinates!.lng;
      } else {
        const [latOff, lngOff] = getJitterOffset(p.personnelId);
        lat = baseStation.lat + latOff;
        lng = baseStation.lng + lngOff;
      }

      return {
        ...p,
        resolvedLat: lat,
        resolvedLng: lng,
        hasLiveGPS,
        baseStation,
      };
    });
  }, [personnelList]);

  // Filtered personnel
  const filteredPersonnel = useMemo(() => {
    return personnelWithCoords.filter((p) => {
      if (emergencyOnly && p.sosStatus !== 'emergency') return false;
      if (selectedRole !== 'all' && p.role !== selectedRole) return false;
      if (selectedStation !== 'all') {
        const pStation = (p.currentLocation?.stationId || 'station-alpha').toLowerCase();
        if (pStation !== selectedStation.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesId = p.personnelId.toLowerCase().includes(q);
        const matchesRole = p.role.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesRole) return false;
      }
      return true;
    });
  }, [personnelWithCoords, emergencyOnly, selectedRole, selectedStation, searchQuery]);

  // Live GPS vs Station counts
  const liveCount = personnelWithCoords.filter((p) => p.hasLiveGPS).length;
  const emergencyCount = personnelWithCoords.filter((p) => p.sosStatus === 'emergency').length;

  // Icons cache / generator
  const getMarkerIcon = (person: (typeof personnelWithCoords)[0]) => {
    const isEmergency = person.sosStatus === 'emergency';
    const isMedic = person.role === 'medic';
    const isCommander = person.role === 'commander';

    let bgClass = 'bg-cyan-500 border-cyan-300 text-slate-950';
    let iconSymbol = '👤';

    if (isEmergency) {
      bgClass = 'bg-rose-600 border-rose-400 text-white animate-bounce';
      iconSymbol = '🚨';
    } else if (isMedic) {
      bgClass = 'bg-emerald-500 border-emerald-300 text-slate-950';
      iconSymbol = '✚';
    } else if (isCommander) {
      bgClass = 'bg-amber-400 border-amber-200 text-slate-950';
      iconSymbol = '★';
    } else if (person.role === 'scientist') {
      bgClass = 'bg-purple-500 border-purple-300 text-white';
      iconSymbol = '🔬';
    } else if (person.role === 'engineer') {
      bgClass = 'bg-blue-500 border-blue-300 text-white';
      iconSymbol = '⚙';
    } else if (person.role === 'logistics') {
      bgClass = 'bg-indigo-500 border-indigo-300 text-white';
      iconSymbol = '📦';
    }

    const pulseHtml = isEmergency
      ? `<span class="absolute -inset-2 rounded-full bg-rose-500/60 animate-ping"></span>`
      : person.hasLiveGPS
      ? `<span class="absolute -inset-1 rounded-full bg-cyan-400/40 animate-pulse"></span>`
      : '';

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer group">
        ${pulseHtml}
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg shadow-black/80 font-bold text-xs ${bgClass} transition-transform duration-200 hover:scale-125">
          <span>${iconSymbol}</span>
        </div>
        ${
          person.hasLiveGPS
            ? `<div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" title="Live GPS"></div>`
            : ''
        }
      </div>
    `;

    return L.divIcon({
      className: 'custom-personnel-marker',
      html,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
    });
  };

  // Station Icon
  const getStationIcon = (station: StationGeo) => {
    const html = `
      <div class="relative flex flex-col items-center cursor-pointer group">
        <div class="w-10 h-10 rounded-xl bg-slate-900/90 border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/30 flex items-center justify-center text-cyan-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
        <div class="mt-1 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-800 text-[10px] font-mono text-cyan-300 whitespace-nowrap shadow-md">
          ${station.name.split(' ')[0]}
        </div>
      </div>
    `;
    return L.divIcon({
      className: 'custom-station-marker',
      html,
      iconSize: [60, 60],
      iconAnchor: [30, 20],
      popupAnchor: [0, -22],
    });
  };

  const handleSelectPerson = (p: (typeof personnelWithCoords)[0]) => {
    setSelectedPersonId(p.personnelId);
    setFlyTarget([p.resolvedLat, p.resolvedLng]);
    setFlyZoom(10);
  };

  const handleFlyToStation = (stationKey: string) => {
    if (stationKey === 'overview') {
      setFlyTarget([-75.0, 90.0]);
      setFlyZoom(3);
      setSelectedStation('all');
      return;
    }
    const station = KNOWN_STATIONS[stationKey];
    if (station) {
      setFlyTarget([station.lat, station.lng]);
      setFlyZoom(8);
      setSelectedStation(stationKey);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[640px] rounded-2xl overflow-hidden border border-slate-800 bg-[#060a12] flex flex-col shadow-2xl">
      {/* Top HUD Control Bar */}
      <div className="z-10 bg-[#080e1a]/95 backdrop-blur-md px-4 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Title & Quick Status */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white font-mono tracking-wide">
                POLAR SECTOR RADAR
              </h2>
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE FEED
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-3 mt-0.5">
              <span>
                Total Units: <strong className="text-white">{personnelWithCoords.length}</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-400">
                Live GPS: <strong>{liveCount}</strong>
              </span>
              {emergencyCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-400 font-bold animate-pulse">
                    SOS Alerts: {emergencyCount}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Station Quick Jump Pills */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => handleFlyToStation('overview')}
            className="px-2.5 py-1 text-xs font-mono rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            All Antarctica
          </button>
          {Object.entries(KNOWN_STATIONS).map(([key, st]) => (
            <button
              key={key}
              onClick={() => handleFlyToStation(key)}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors ${
                selectedStation === key
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Layer switcher */}
          <button
            onClick={() => setMapLayer(mapLayer === 'dark' ? 'satellite' : 'dark')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors"
            title="Toggle Map Style"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline capitalize">{mapLayer}</span>
          </button>

          {/* Toggle Sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
              sidebarOpen
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Roster</span>
          </button>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 hover:text-cyan-300 hover:border-slate-600 transition-colors disabled:opacity-50"
              title="Refresh radar tracking"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Map Body + Sidebar Overlay */}
      <div className="relative flex-1 w-full h-full">
        {/* Leaflet Map */}
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={[-75.0, 90.0]}
            zoom={3}
            minZoom={2}
            maxZoom={16}
            style={{ width: '100%', height: '100%', background: '#060a12' }}
            scrollWheelZoom={true}
          >
            <MapController targetCoords={flyTarget} targetZoom={flyZoom} />

            {/* Tile Layer: CartoDB Dark Matter or Esri Satellite */}
            {mapLayer === 'dark' ? (
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            ) : (
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            )}

            {/* Render Known Polar Stations */}
            {Object.values(KNOWN_STATIONS).map((st) => (
              <React.Fragment key={st.id}>
                {/* Station coverage circle */}
                <Circle
                  center={[st.lat, st.lng]}
                  radius={45000} // 45km radio perimeter
                  pathOptions={{
                    color: '#06b6d4',
                    fillColor: '#06b6d4',
                    fillOpacity: 0.04,
                    weight: 1,
                    dashArray: '4, 8',
                  }}
                />
                <Marker position={[st.lat, st.lng]} icon={getStationIcon(st)}>
                  <Popup>
                    <div className="p-3.5 max-w-xs font-sans text-slate-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white text-sm">{st.name}</span>
                      </div>
                      <div className="text-xs font-mono text-cyan-300 mb-2">{st.type}</div>
                      <div className="space-y-1 text-xs border-t border-slate-800 pt-2 font-mono">
                        <div className="flex justify-between text-slate-400">
                          <span>Latitude:</span>
                          <span className="text-white">{st.lat.toFixed(4)}° S</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Longitude:</span>
                          <span className="text-white">{st.lng.toFixed(4)}° E</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Stationed:</span>
                          <span className="text-emerald-400 font-bold">
                            {
                              personnelWithCoords.filter(
                                (p) =>
                                  (p.currentLocation?.stationId || 'station-alpha').toLowerCase() ===
                                  st.id.toLowerCase()
                              ).length
                            }{' '}
                            Units
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStation(st.id);
                          setSidebarOpen(true);
                        }}
                        className="w-full mt-3 py-1 text-center text-xs font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
                      >
                        View Station Crew
                      </button>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}

            {/* Render Personnel Markers */}
            {filteredPersonnel.map((p) => {
              const isSelected = selectedPersonId === p.personnelId;
              return (
                <Marker
                  key={p.personnelId}
                  position={[p.resolvedLat, p.resolvedLng]}
                  icon={getMarkerIcon(p)}
                  eventHandlers={{
                    click: () => {
                      setSelectedPersonId(p.personnelId);
                    },
                  }}
                >
                  <Popup>
                    <div className="p-4 max-w-sm font-sans text-slate-200">
                      {/* Person Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-3">
                        <div>
                          <div className="font-bold text-white text-base leading-tight">
                            {p.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            ID: {p.personnelId}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                            p.role === 'commander'
                              ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                              : p.role === 'medic'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                              : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                          }`}
                        >
                          {p.role}
                        </span>
                      </div>

                      {/* GPS Status Pill */}
                      <div className="mb-3">
                        {p.hasLiveGPS ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                            <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span>Live GPS Beacon Transmitting</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Stationary at Base Camp (No GPS Fix)</span>
                          </div>
                        )}
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-1.5 text-xs font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Assigned Base:</span>
                          <span className="text-white capitalize">
                            {(p.currentLocation?.stationId || 'station-alpha').replace('-', ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">SOS Status:</span>
                          <span
                            className={`font-bold uppercase ${
                              p.sosStatus === 'emergency'
                                ? 'text-rose-400'
                                : p.sosStatus === 'unresponsive'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {p.sosStatus}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Medical:</span>
                          <span className="text-slate-200 capitalize">
                            {p.medicalClearance?.status || 'cleared'}
                            {p.medicalClearance?.bloodGroup && ` (${p.medicalClearance.bloodGroup})`}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                          <span className="text-slate-400">Coords:</span>
                          <span className="text-cyan-300">
                            {p.resolvedLat.toFixed(4)}, {p.resolvedLng.toFixed(4)}
                          </span>
                        </div>
                        {p.currentLocation?.lastLocationUpdate && (
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Last GPS:</span>
                            <span>
                              {new Date(p.currentLocation.lastLocationUpdate).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectPerson(p)}
                          className="flex-1 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                          Lock Radar Focus
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Collapsible Sidebar: Roster & Filters */}
        {sidebarOpen && (
          <div className="absolute top-4 right-4 bottom-4 w-80 sm:w-96 z-10 bg-[#080e1a]/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Sidebar Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
                  Field Personnel Roster
                </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-cyan-300">
                  {filteredPersonnel.length}
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                Hide
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-3 border-b border-slate-800/80 space-y-2 bg-[#060a12]/60">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by name, ID, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Station + Role Filters */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="px-2 py-1 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="all">All Stations</option>
                  {Object.entries(KNOWN_STATIONS).map(([key, s]) => (
                    <option key={key} value={key}>
                      {s.name.split(' ')[0]}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-2 py-1 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="all">All Roles</option>
                  <option value="commander">Commander</option>
                  <option value="medic">Medic</option>
                  <option value="scientist">Scientist</option>
                  <option value="engineer">Engineer</option>
                  <option value="logistics">Logistics</option>
                </select>
              </div>

              {/* Emergency Only Toggle */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-mono text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyOnly}
                    onChange={(e) => setEmergencyOnly(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <span className={emergencyOnly ? 'text-rose-400 font-bold' : ''}>
                    SOS / Emergency only
                  </span>
                </label>
                {emergencyCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {emergencyCount} SOS active
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable Roster List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
              {filteredPersonnel.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-500">
                  No personnel match the filter criteria.
                </div>
              ) : (
                filteredPersonnel.map((p) => {
                  const isSelected = selectedPersonId === p.personnelId;
                  const isEmergency = p.sosStatus === 'emergency';

                  return (
                    <div
                      key={p.personnelId}
                      onClick={() => handleSelectPerson(p)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-cyan-500/15 border border-cyan-500/40 shadow-md'
                          : isEmergency
                          ? 'bg-rose-950/40 border border-rose-500/40 hover:bg-rose-950/60'
                          : 'bg-slate-900/40 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            {p.name}
                            {p.hasLiveGPS && (
                              <span
                                className="w-2 h-2 rounded-full bg-emerald-400"
                                title="Live GPS beacon"
                              />
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="capitalize">{p.role}</span>
                            <span>•</span>
                            <span className="capitalize">
                              {(p.currentLocation?.stationId || 'alpha').replace('-', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                              isEmergency
                                ? 'bg-rose-500 text-white animate-pulse'
                                : p.hasLiveGPS
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isEmergency ? 'SOS' : p.hasLiveGPS ? 'GPS LIVE' : 'BASE'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-1.5 border-t border-slate-800/60">
                        <span className="text-cyan-300">
                          {p.resolvedLat.toFixed(2)}°, {p.resolvedLng.toFixed(2)}°
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 hover:text-cyan-300">
                          <span>Focus</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
