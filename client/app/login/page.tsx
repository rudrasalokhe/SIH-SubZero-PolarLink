'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiLogin } from '@/lib/api';
import { Radio, Lock, Mail, Shield, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

const QUICK_ROLES = [
  {
    role: 'commander',
    name: 'Cmdr. Vikram Nair',
    email: 'vikram.commander@polarlink.expedition',
    tag: 'Base Commander',
    badgeClass: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
  },
  {
    role: 'medic',
    name: 'Dr. Ananya Roy',
    email: 'ananya.medic@polarlink.expedition',
    tag: 'Lead Medic',
    badgeClass: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  },
  {
    role: 'scientist',
    name: 'Dr. Elena Rostova',
    email: 'elena.scientist@polarlink.expedition',
    tag: 'Chief Scientist',
    badgeClass: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
  },
  {
    role: 'engineer',
    name: 'Marcus Vance',
    email: 'marcus.engineer@polarlink.expedition',
    tag: 'Operations Engineer',
    badgeClass: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
  {
    role: 'logistics',
    name: 'Tarun Mehra',
    email: 'tarun.logistics@polarlink.expedition',
    tag: 'Logistics Officer',
    badgeClass: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
  },
  {
    role: 'hq_admin',
    name: 'Director S. Rao',
    email: 'admin@polarlink.expedition',
    tag: 'Goa HQ Command',
    badgeClass: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAppStore();

  const [email, setEmail] = useState('vikram.commander@polarlink.expedition');
  const [password, setPassword] = useState('polar123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and security passkey');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { token, user } = await apiLogin({ email, password });
      login(token, user);

      if (user?.role === 'hq_admin') {
        router.push('/hq');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed. Please check credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('polar123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-cyan-500/20">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-blue-700/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4 shadow-lg shadow-cyan-950/40">
            <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            POLARLINK <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 font-mono tracking-normal">STATION-OS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
            Bharati Station Sector 4 • Offline Cryptographic Access
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0b1220]/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/80">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Terminal Identifier / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@polarlink.expedition"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Security Passkey
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl shadow-lg shadow-cyan-950/40 hover:shadow-cyan-900/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? (
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AUTHENTICATING...
                </div>
              ) : (
                <>
                  <span>Access Station Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Quick-Fill Demo Roles
              </span>
              <span className="text-[10px] font-mono text-slate-500">passkey: polar123</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_ROLES.map((r) => {
                const isSelected = email === r.email;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleQuickFill(r.email)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/30'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase border ${r.badgeClass}`}>
                        {r.role.replace('_', ' ')}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <div className="text-xs font-medium text-slate-200 mt-1 truncate">
                      {r.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-mono">
                      {r.tag}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 font-mono mt-6">
          Station Master Node v2.4.0 • Local Mesh & Satellite Sync Active
        </p>
      </div>
    </div>
  );
}
