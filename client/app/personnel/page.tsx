'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllPersonnelLocal } from '@/lib/db';
import { syncAll } from '@/lib/syncManager';
import { PersonnelItem, PersonnelRole, MedicalStatus } from '@/lib/types';
import {
  Users,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Phone,
  HeartPulse,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function PersonnelListPage() {
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { syncStatus } = useAppStore();

  const loadPersonnel = async () => {
    try {
      const items = await getAllPersonnelLocal();
      setPersonnelList(items);
    } catch (e) {
      console.error('Error loading personnel from local SQLite:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonnel();
    syncAll().then(loadPersonnel);
  }, []);

  const filteredItems = personnelList.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.personnelId.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (roleFilter !== 'all' && p.role !== roleFilter) {
      return false;
    }
    return true;
  });

  const roles: PersonnelRole[] = ['scientist', 'engineer', 'medic', 'logistics', 'commander'];

  const getClearanceBadge = (status: MedicalStatus) => {
    switch (status) {
      case 'cleared':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
      case 'pending':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
      case 'restricted':
      case 'expired':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getSOSStatusBadge = (status: string) => {
    if (status === 'emergency') {
      return 'bg-rose-600 text-white font-bold animate-pulse shadow-lg shadow-rose-600/30';
    }
    if (status === 'unresponsive') {
      return 'bg-amber-600 text-white font-bold';
    }
    return 'bg-polar-800 text-emerald-400 border border-emerald-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-polar-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-polar-ice" />
            Station Expedition Roster
          </h1>
          <p className="text-xs font-mono text-polar-400 mt-1">
            Local SQLite crew records • Medical clearances • Emergency beacons
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              syncAll().then(loadPersonnel);
            }}
            className="p-2 rounded-lg bg-polar-800 hover:bg-polar-700 text-polar-400 hover:text-white border border-polar-700 transition-colors"
            title="Refresh from Station Node"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin text-polar-ice' : ''}`} />
          </button>
          <Link
            href="/personnel/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-polar-ice text-polar-950 font-mono font-bold text-xs shadow-lg shadow-polar-ice/20 hover:bg-sky-300 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Crew Member
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="polar-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-polar-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or blood group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-polar-900 border border-polar-700 rounded-lg text-xs font-mono text-white placeholder-polar-600 focus:outline-none focus:border-polar-ice"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-polar-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-polar-900 border border-polar-700 rounded-lg text-xs font-mono text-white capitalize focus:outline-none focus:border-polar-ice"
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Personnel Grid */}
      {loading ? (
        <div className="polar-card p-8 text-center text-xs font-mono text-polar-400">
          Querying local crew directory from WA-SQLite...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="polar-card p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-polar-600 mx-auto" />
          <div className="text-sm font-mono text-polar-400">No personnel match current filters.</div>
          <Link
            href="/personnel/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-polar-ice bg-polar-800 rounded border border-polar-700 hover:bg-polar-700"
          >
            <Plus className="w-3.5 h-3.5" /> Enroll Personnel
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((p) => {
            const isEmergency = p.sosStatus === 'emergency';
            return (
              <div
                key={p.personnelId}
                className={`polar-card p-4 polar-card-hover flex flex-col justify-between ${
                  isEmergency ? 'border-rose-500/80 bg-rose-950/20' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white font-sans">{p.name}</h3>
                      <div className="text-[11px] font-mono text-polar-400">{p.personnelId}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${getSOSStatusBadge(p.sosStatus)}`}>
                      {p.sosStatus === 'emergency' && '🚨 '}
                      {p.sosStatus}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-polar-800 text-polar-ice text-[11px] font-mono capitalize border border-polar-700">
                      {p.role}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono capitalize border ${getClearanceBadge(p.medicalClearance.status)}`}>
                      Med: {p.medicalClearance.status}
                    </span>
                    {p.medicalClearance.bloodGroup && (
                      <span className="px-2 py-0.5 rounded bg-polar-800 text-slate-300 text-[11px] font-mono border border-polar-700">
                        🩸 {p.medicalClearance.bloodGroup}
                      </span>
                    )}
                  </div>

                  {p.medicalClearance.conditions && p.medicalClearance.conditions.length > 0 && (
                    <div className="mt-2 text-[11px] text-amber-300 font-mono flex items-center gap-1">
                      <HeartPulse className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{p.medicalClearance.conditions.join(', ')}</span>
                    </div>
                  )}

                  {p.emergencyContact?.name && (
                    <div className="mt-2 pt-2 border-t border-polar-800/80 text-[11px] font-mono text-polar-400 flex items-center justify-between">
                      <span className="truncate">Contact: {p.emergencyContact.name} ({p.emergencyContact.relation})</span>
                      <span className="shrink-0 text-slate-300 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {p.emergencyContact.phone}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-polar-800/60 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-polar-400">Loc: {p.currentLocation.stationId}</span>
                  {p._pending_sync ? (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3" /> Queued for sync
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Synced
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
