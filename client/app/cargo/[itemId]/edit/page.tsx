'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCargoByIdLocal, saveCargoLocal } from '@/lib/db';
import { syncAll } from '@/lib/syncManager';
import { CargoCategory, CargoStatus, CargoItem } from '@/lib/types';
import { Package, ArrowLeft, Save, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';

export default function EditCargoPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.itemId as string;
  const { addSyncLog } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<CargoItem>>({
    name: '',
    category: 'food',
    quantity: 0,
    unit: 'units',
    criticalThreshold: 10,
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
  });

  const categories: CargoCategory[] = ['food', 'fuel', 'medical', 'equipment', 'scientific', 'other'];
  const statuses: CargoStatus[] = ['warehouse', 'in-transit', 'delivered', 'consumed'];

  useEffect(() => {
    if (!itemId) return;
    getCargoByIdLocal(itemId).then((item) => {
      if (item) {
        setFormData(item);
      }
      setLoading(false);
    });
  }, [itemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) return;

    // 1. Instant local update to WA-SQLite
    await saveCargoLocal(
      {
        ...formData,
        itemId,
        _synced: false,
        _pending_sync: true,
        _lastModified: new Date().toISOString(),
      },
      true
    );

    addSyncLog(`Updated cargo '${formData.name}' in WA-SQLite (queued for sync)`, 'info', 'Cargo', itemId);

    // 2. Instant redirect
    router.push('/cargo');

    // 3. Invisible background sync
    syncAll();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-polar-400">
        Loading item from local SQLite...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-polar-800">
        <Link
          href="/cargo"
          className="p-2 rounded-lg bg-polar-800 hover:bg-polar-700 text-polar-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-polar-ice" />
            Edit Cargo: {formData.name}
          </h1>
          <p className="text-xs font-mono text-polar-400">UUID: {itemId}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="polar-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
            Item Name
          </label>
          <input
            type="text"
            required
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm text-white focus:outline-none focus:border-polar-ice"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as CargoCategory })}
              className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white capitalize focus:outline-none focus:border-polar-ice"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
              Status
            </label>
            <select
              value={formData.currentLocation?.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentLocation: {
                    ...formData.currentLocation!,
                    status: e.target.value as CargoStatus,
                  },
                })
              }
              className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white capitalize focus:outline-none focus:border-polar-ice"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
              Quantity
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-polar-ice"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
              Unit
            </label>
            <input
              type="text"
              value={formData.unit || ''}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-polar-ice"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-polar-800">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1 uppercase">
              Critical Threshold
            </label>
            <input
              type="number"
              min="0"
              value={formData.criticalThreshold}
              onChange={(e) => setFormData({ ...formData, criticalThreshold: Number(e.target.value) })}
              className="w-full px-3.5 py-2 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1 uppercase">
              Station ID
            </label>
            <input
              type="text"
              value={formData.currentLocation?.stationId || 'station-alpha'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentLocation: {
                    ...formData.currentLocation!,
                    stationId: e.target.value,
                  },
                })
              }
              className="w-full px-3.5 py-2 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white"
            />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-polar-800">
          <Link
            href="/cargo"
            className="px-4 py-2.5 rounded-lg bg-polar-800 hover:bg-polar-700 text-polar-400 font-mono text-xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-polar-ice text-polar-950 font-mono font-bold text-xs shadow-lg shadow-polar-ice/25 hover:bg-sky-300 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            Update Locally (Instant)
          </button>
        </div>
      </form>
    </div>
  );
}
