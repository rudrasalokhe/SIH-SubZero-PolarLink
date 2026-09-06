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
import AuthGuard from '@/components/AuthGuard';

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

  const roles: PersonnelRole[] = ['scientist', 'engineer', 'medic', 'logistics', 'commander', 'hq_admin'];

  const getRoleBadge = (role: PersonnelRole) => {
    switch (role) {
      case 'commander':
        return { label: 'Commander', class: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' };
      case 'medic':
        return { label: 'Medic', class: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' };
      case 'scientist':
        return { label: 'Scientist', class: 'border-purple-500/40 text-purple-400 bg-purple-500/10' };
      case 'engineer':
        return { label: 'Engineer', class: 'border-amber-500/40 text-amber-400 bg-amber-500/10' };
      case 'logistics':
        return { label: 'Logistics', class: 'border-blue-500/40 text-blue-400 bg-blue-500/10' };
      case 'hq_admin':
        return { label: 'HQ Command', class: 'border-rose-500/40 text-rose-400 bg-rose-500/10' };
      default:
        return { label: role, class: 'border-slate-700 text-slate-400 bg-slate-800' };
    }
  };

  const getClearanceBadge = (status: MedicalStatus) => {
    switch (status) {
      case 'cleared':
        return { label: 'Cleared', class: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' };
      case 'pending':
        return { label: 'Pending', class: 'bg-amber-500/15 text-amber-300 border-amber-500/40' };
      case 'restricted':
        return { label: 'Restricted', class: 'bg-rose-500/15 text-rose-300 border-rose-500/40' };
      case 'expired':
        return { label: 'Expired', class: 'bg-rose-500/15 text-rose-300 border-rose-500/40' };
      default:
        return { label: status, class: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-polar-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-polar-teal" />
              Expedition Personnel Directory
            </h1>
            <p className="text-xs font-mono text-polar-400 mt-1">
              Station Alpha roster • Local SQLite replica • Medical clearance tracking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                syncAll().then(loadPersonnel);
              }}
              className="p-2 rounded-lg bg-polar-800 hover:bg-polar-700 text-polar-400 hover:text-white border border-polar-700 transition-colors"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin text-polar-ice' : ''}`} />
            </button>
            <Link
              href="/personnel/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-polar-teal text-polar-950 font-mono font-bold text-xs shadow-lg shadow-polar-teal/20 hover:bg-teal-300 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Crew Member
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="polar-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-polar-400" />
              <input
                type="text"
                placeholder="Search crew by name or ID..."
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
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Personnel Grid */}
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-polar-400">
            Querying local SQLite crew records...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="polar-card p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-polar-600 mx-auto" />
            <div className="text-sm font-mono text-polar-400">No personnel found for selected filters.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((p) => {
              const roleBadge = getRoleBadge(p.role);
              const clearanceBadge = getClearanceBadge(p.medicalClearance?.status || 'pending');

              return (
                <div
                  key={p.personnelId}
                  className="polar-card p-4 flex flex-col justify-between hover:border-polar-700 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-white text-sm font-sans">{p.name}</h3>
                        <div className="text-[11px] font-mono text-polar-400">{p.personnelId}</div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${roleBadge.class}`}>
                        {roleBadge.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-polar-400 flex items-center gap-1">
                          <HeartPulse className="w-3.5 h-3.5 text-rose-400" /> Med Clearance:
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.2 rounded text-[10px] uppercase font-semibold border ${clearanceBadge.class}`}>
                          {clearanceBadge.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-polar-400">Blood Group:</span>
                        <span className="font-bold text-white">{p.medicalClearance?.bloodGroup || 'O+'}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-polar-400">SOS Status:</span>
                        <span
                          className={`font-semibold uppercase text-[10px] px-1.5 py-0.2 rounded ${
                            p.sosStatus === 'emergency'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                              : 'text-emerald-400'
                          }`}
                        >
                          {p.sosStatus}
                        </span>
                      </div>
                    </div>

                    {p.emergencyContact && p.emergencyContact.name && (
                      <div className="p-2 rounded bg-polar-900 border border-polar-800 text-[11px] font-mono text-polar-400 flex items-center justify-between">
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
    </AuthGuard>
  );
}
