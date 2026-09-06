'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { saveCargoLocal } from '@/lib/db';
import { syncAll } from '@/lib/syncManager';
import { CargoCategory, CargoStatus } from '@/lib/types';
import { Package, ArrowLeft, Save, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';

export default function NewCargoPage() {
  const router = useRouter();
  const { addSyncLog } = useAppStore();

  const [formData, setFormData] = useState({
    name: '',
    category: 'food' as CargoCategory,
    quantity: 10,
    unit: 'units',
    stationId: 'station-alpha',
    status: 'warehouse' as CargoStatus,
    lat: -77.846,
    lng: 166.668,
    expiryDate: '',
    criticalThreshold: 5,
  });

  const categories: CargoCategory[] = ['food', 'fuel', 'medical', 'equipment', 'scientific', 'other'];
  const statuses: CargoStatus[] = ['warehouse', 'in-transit', 'delivered', 'consumed'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter cargo name');
      return;
    }

    const clientUuid = `carg-${uuidv4().substring(0, 13)}`;

    // 1. Instant local write to WA-SQLite with _pending_sync = true
    await saveCargoLocal(
      {
        itemId: clientUuid,
        _local_id: clientUuid,
        name: formData.name.trim(),
        category: formData.category,
        quantity: Number(formData.quantity),
        unit: formData.unit.trim() || 'units',
        currentLocation: {
          stationId: formData.stationId.trim() || 'station-alpha',
          coordinates: { lat: Number(formData.lat), lng: Number(formData.lng) },
          status: formData.status,
        },
        transitHistory: [],
        expiryDate: formData.expiryDate ? formData.expiryDate : null,
        criticalThreshold: Number(formData.criticalThreshold),
        _synced: false,
        _pending_sync: true,
      },
      true
    );

    addSyncLog(`Logged new cargo '${formData.name}' in WA-SQLite (queued for sync)`, 'info', 'Cargo', clientUuid);

    // 2. Instant zero-latency navigation back to list
    router.push('/cargo');

    // 3. Invisible background sync triggered
    syncAll();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
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
            Log New Polar Cargo
          </h1>
          <p className="text-xs font-mono text-polar-400">
            Instant local write to WA-SQLite • Zero-delay offline queuing
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="polar-card p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
            Cargo Item Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Arctic Fuel Drum 200L, Freeze-Dried Rations"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-sans text-white focus:outline-none focus:border-polar-ice placeholder-polar-600"
          />
        </div>

        {/* Category & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as CargoCategory })}
              className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white capitalize focus:outline-none focus:border-polar-ice"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
              Current Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CargoStatus })}
              className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white capitalize focus:outline-none focus:border-polar-ice"
            >
              {statuses.map((stat) => (
                <option key={stat} value={stat}>
                  {stat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
              Quantity *
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
              Unit of Measurement
            </label>
            <input
              type="text"
              placeholder="units, boxes, drums, kits"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-polar-ice"
            />
          </div>
        </div>

        {/* Station & Coordinates */}
        <div className="space-y-3 pt-3 border-t border-polar-800">
          <div className="flex items-center gap-2 text-xs font-mono text-polar-ice">
            <MapPin className="w-4 h-4" />
            <span>Storage Location Metadata</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-polar-400 mb-1">Station ID</label>
              <input
                type="text"
                value={formData.stationId}
                onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                className="w-full px-3 py-2 bg-polar-900 border border-polar-700 rounded text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-polar-400 mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-polar-900 border border-polar-700 rounded text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-polar-400 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-polar-900 border border-polar-700 rounded text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>

        {/* Critical Threshold & Expiry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-polar-800">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1 uppercase">
              Critical Reorder Threshold
            </label>
            <input
              type="number"
              min="0"
              value={formData.criticalThreshold}
              onChange={(e) => setFormData({ ...formData, criticalThreshold: Number(e.target.value) })}
              className="w-full px-3.5 py-2 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white"
            />
            <p className="text-[10px] text-polar-400 mt-1 font-mono">
              Triggers amber dashboard alert when quantity drops below this level
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1 uppercase">
              Perishable Expiry Date
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full px-3.5 py-2 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white"
            />
          </div>
        </div>

        {/* Submit */}
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
            Save to Local SQLite (Instant)
          </button>
        </div>
      </form>
    </div>
  );
}
