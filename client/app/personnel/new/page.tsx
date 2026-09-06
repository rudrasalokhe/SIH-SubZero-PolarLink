'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { savePersonnelLocal } from '@/lib/db';
import { syncAll } from '@/lib/syncManager';
import { PersonnelRole, MedicalStatus, SOSStatus } from '@/lib/types';
import { Users, ArrowLeft, Save, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';

export default function NewPersonnelPage() {
  const router = useRouter();
  const { addSyncLog } = useAppStore();

  const [formData, setFormData] = useState({
    name: '',
    role: 'scientist' as PersonnelRole,
    medicalStatus: 'cleared' as MedicalStatus,
    bloodGroup: 'O+',
    conditions: '',
    stationId: 'station-alpha',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    sosStatus: 'safe' as SOSStatus,
  });

  const roles: PersonnelRole[] = ['scientist', 'engineer', 'medic', 'logistics', 'commander'];
  const clearances: MedicalStatus[] = ['cleared', 'pending', 'restricted', 'expired'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter personnel name');
      return;
    }

    const clientUuid = `pers-${uuidv4().substring(0, 8)}`;
    const parsedConditions = formData.conditions
      ? formData.conditions.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    // 1. Instant local write to WA-SQLite
    await savePersonnelLocal(
      {
        personnelId: clientUuid,
        _local_id: clientUuid,
        name: formData.name.trim(),
        role: formData.role,
        medicalClearance: {
          status: formData.medicalStatus,
          lastCheckupDate: new Date().toISOString(),
          conditions: parsedConditions,
          bloodGroup: formData.bloodGroup,
        },
        trainingStatus: [],
        currentLocation: {
          stationId: formData.stationId.trim() || 'station-alpha',
          lastCheckIn: new Date().toISOString(),
        },
        emergencyContact: {
          name: formData.emergencyName.trim(),
          relation: formData.emergencyRelation.trim(),
          phone: formData.emergencyPhone.trim(),
        },
        sosStatus: formData.sosStatus,
        _synced: false,
        _pending_sync: true,
      },
      true
    );

    addSyncLog(`Enrolled crew member '${formData.name}' in WA-SQLite (queued)`, 'info', 'Personnel', clientUuid);

    // 2. Instant redirect
    router.push('/personnel');

    // 3. Invisible background sync
    syncAll();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-polar-800">
        <Link
          href="/personnel"
          className="p-2 rounded-lg bg-polar-800 hover:bg-polar-700 text-polar-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-polar-ice" />
            Enroll Expedition Crew Member
          </h1>
          <p className="text-xs font-mono text-polar-400">
            Instant local write to WA-SQLite • Zero network blocking
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="polar-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
            Full Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Dr. Jennifer Clark"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm text-white focus:outline-none focus:border-polar-ice"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as PersonnelRole })}
              className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white capitalize focus:outline-none focus:border-polar-ice"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 uppercase">
              Station Outpost
            </label>
            <input
              type="text"
              value={formData.stationId}
              onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-polar-900 border border-polar-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-polar-ice"
            />
          </div>
        </div>

        <div className="space-y-4 pt-3 border-t border-polar-800">
          <div className="flex items-center gap-2 text-xs font-mono text-polar-ice">
            <HeartPulse className="w-4 h-4" />
            <span>Medical Clearance & Physiology</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-polar-400 mb-1">Clearance Status *</label>
              <select
                value={formData.medicalStatus}
                onChange={(e) => setFormData({ ...formData, medicalStatus: e.target.value as MedicalStatus })}
                className="w-full px-3 py-2 bg-polar-900 border border-polar-700 rounded text-xs font-mono text-white capitalize"
              >
                {clearances.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-polar-400 mb-1">Blood Group</label>
              <input
                type="text"
                placeholder="O+, A-, etc."
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 bg-polar-900 border border-polar-700 rounded text-xs font-mono text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-polar-400 mb-1">
              Known Pre-existing Conditions (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Asthma, Mild Frostbite History"
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              className="w-full px-3 py-2 bg-polar-900 border border-polar-700 rounded text-xs font-mono text-white placeholder-polar-600"
            />
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-polar-800">
          <label className="block text-xs font-mono font-semibold text-slate-300 uppercase">
            Emergency Contact Information
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Contact Name"
              value={formData.emergencyName}
              onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
              className="px-3 py-2 bg-polar-900 border border-polar-700 rounded text-xs font-mono text-white"
            />
            <input
              type="text"
              placeholder="Relation (e.g. Spouse)"
              value={formData.emergencyRelation}
              onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
              className="px-3 py-2 bg-polar-900 border border-polar-700 rounded text-xs font-mono text-white"
            />
            <input
              type="text"
              placeholder="Emergency Phone"
              value={formData.emergencyPhone}
              onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
              className="px-3 py-2 bg-polar-900 border border-polar-700 rounded text-xs font-mono text-white"
            />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-polar-800">
          <Link
            href="/personnel"
            className="px-4 py-2.5 rounded-lg bg-polar-800 hover:bg-polar-700 text-polar-400 font-mono text-xs"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-polar-ice text-polar-950 font-mono font-bold text-xs shadow-lg shadow-polar-ice/25 hover:bg-sky-300 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            Enroll Locally (Instant)
          </button>
        </div>
      </form>
    </div>
  );
}
