'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { PersonnelRole } from '@/lib/types';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: PersonnelRole[];
  disallowedRoles?: PersonnelRole[];
}

export default function AuthGuard({
  children,
  allowedRoles,
  disallowedRoles,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, authInitialized, initAuth } = useAppStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!authInitialized) return;

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    // Check allowed roles
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === 'hq_admin') {
        router.replace('/hq');
      } else {
        router.replace('/dashboard');
      }
      return;
    }

    // Check disallowed roles
    if (disallowedRoles && disallowedRoles.includes(user.role)) {
      if (user.role === 'hq_admin') {
        router.replace('/hq');
      } else {
        router.replace('/dashboard');
      }
      return;
    }

    // If hq_admin navigates to station dashboard / cargo / personnel / sos, suggest/redirect to /hq
    if (user.role === 'hq_admin' && !pathname.startsWith('/hq') && pathname !== '/login') {
      router.replace('/hq');
    }
  }, [authInitialized, token, user, allowedRoles, disallowedRoles, router, pathname]);

  if (!authInitialized || !token || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060a12] text-slate-100 p-6">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold tracking-wider uppercase text-cyan-400 font-mono">
            PolarLink Terminal
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Verifying cryptographic credentials & station telemetry...
          </p>
        </div>
      </div>
    );
  }

  // If role is not allowed, show quick security message while redirecting
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060a12] text-slate-100 p-6">
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-center max-w-md">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-rose-300 mb-1">Access Restricted</h3>
          <p className="text-xs text-slate-400 font-mono">
            Role [{user.role.toUpperCase()}] is not authorized for this terminal sector. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
