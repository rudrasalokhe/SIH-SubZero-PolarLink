'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllCargoLocal, deleteCargoLocal } from '@/lib/db';
import { syncAll } from '@/lib/syncManager';
import { CargoItem, CargoCategory, CargoStatus } from '@/lib/types';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function CargoListPage() {
  const [cargoList, setCargoList] = useState<CargoItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { syncStatus, addSyncLog } = useAppStore();

  const loadCargo = async () => {
    try {
      const items = await getAllCargoLocal();
      setCargoList(items);
    } catch (e) {
      console.error('Error loading cargo from local SQLite:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCargo();
    syncAll().then(loadCargo);
  }, []);

  const handleDelete = async (itemId: string, name: string) => {
    if (!confirm(`Soft-delete cargo item '${name}'? This will mark it deleted locally and queue for mainland sync.`)) {
      return;
    }
    // Instant local write
    await deleteCargoLocal(itemId);
    addSyncLog(`Soft-deleted cargo '${name}' locally (queued)`, 'warn');
    await loadCargo();
    // Trigger background sync
    syncAll();
  };

  // Client-side filtering on local SQLite data
  const filteredItems = cargoList.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.itemId.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }
    if (statusFilter !== 'all' && item.currentLocation.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const categories: CargoCategory[] = ['food', 'fuel', 'medical', 'equipment', 'scientific', 'other'];
  const statuses: CargoStatus[] = ['warehouse', 'in-transit', 'delivered', 'consumed'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-polar-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-polar-ice" />
            Polar Logistics & Supplies
          </h1>
          <p className="text-xs font-mono text-polar-400 mt-1">
            Local SQLite inventory • Instant reads & mutations • Auto-queued for satellite sync
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              syncAll().then(loadCargo);
            }}
            className="p-2 rounded-lg bg-polar-800 hover:bg-polar-700 text-polar-400 hover:text-white border border-polar-700 transition-colors"
            title="Refresh from Station Node"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin text-polar-ice' : ''}`} />
          </button>
          <Link
            href="/cargo/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-polar-ice text-polar-950 font-mono font-bold text-xs shadow-lg shadow-polar-ice/20 hover:bg-sky-300 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Log New Cargo
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="polar-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-polar-400" />
            <input
              type="text"
              placeholder="Search by name or UUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-polar-900 border border-polar-700 rounded-lg text-xs font-mono text-white placeholder-polar-600 focus:outline-none focus:border-polar-ice"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-polar-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-polar-900 border border-polar-700 rounded-lg text-xs font-mono text-white capitalize focus:outline-none focus:border-polar-ice"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-polar-900 border border-polar-700 rounded-lg text-xs font-mono text-white capitalize focus:outline-none focus:border-polar-ice"
            >
              <option value="all">All Inventory Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cargo List */}
      <div className="polar-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-polar-400">
            Querying local WA-SQLite storage...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-polar-600 mx-auto" />
            <div className="text-sm font-mono text-polar-400">No cargo records match current filters.</div>
            <Link
              href="/cargo/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-polar-ice bg-polar-800 rounded border border-polar-700 hover:bg-polar-700"
            >
              <Plus className="w-3.5 h-3.5" /> Log First Item
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-polar-900/90 text-polar-400 border-b border-polar-800 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Item & UUID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Quantity / Threshold</th>
                  <th className="py-3 px-4">Location & Status</th>
                  <th className="py-3 px-4">Sync State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-polar-800/60">
                {filteredItems.map((item) => {
                  const isLowStock = item.quantity <= item.criticalThreshold;
                  return (
                    <tr
                      key={item.itemId}
                      className={`hover:bg-polar-800/40 transition-colors ${
                        isLowStock ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white text-sm font-sans">{item.name}</div>
                        <div className="text-[11px] text-polar-400 truncate max-w-[180px]" title={item.itemId}>
                          {item.itemId}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded capitalize text-[11px] font-semibold bg-polar-800 text-slate-300 border border-polar-700">
                          {item.category}
                        </span>
                      </td>

                      {/* Quantity & Threshold */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-bold ${
                              isLowStock ? 'text-rose-400 font-extrabold' : 'text-slate-100'
                            }`}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-polar-400">{item.unit}</span>
                          {isLowStock && (
                            <span
                              className="p-1 rounded bg-rose-500/20 text-rose-400"
                              title={`Low stock: ${item.quantity} <= ${item.criticalThreshold}`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-polar-400">Min: {item.criticalThreshold}</div>
                      </td>

                      {/* Location & Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-polar-teal" />
                          <span className="capitalize">{item.currentLocation.stationId}</span>
                        </div>
                        <div className="text-[11px] text-polar-400 capitalize">
                          {item.currentLocation.status}
                        </div>
                      </td>

                      {/* Sync State */}
                      <td className="py-3 px-4">
                        {item._pending_sync ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" /> Queued
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Synced
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          href={`/cargo/${item.itemId}/edit`}
                          className="p-1.5 rounded bg-polar-800 hover:bg-polar-700 text-polar-ice inline-flex transition-colors"
                          title="Edit Cargo Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.itemId, item.name)}
                          className="p-1.5 rounded bg-polar-800 hover:bg-rose-900/60 text-rose-400 inline-flex transition-colors"
                          title="Soft delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
