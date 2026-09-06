import { create } from 'zustand';
import { SyncLogItem, AuthUser } from './types';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline';

interface AppState {
  isOnline: boolean;
  simulateOffline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncTime: string | null;
  syncLogs: SyncLogItem[];
  installPromptEvent: any | null;

  // Auth State
  user: AuthUser | null;
  token: string | null;
  authInitialized: boolean;

  setOnline: (online: boolean) => void;
  toggleSimulateOffline: () => void;
  setSyncStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSyncTime: (time: string) => void;
  addSyncLog: (message: string, status?: 'success' | 'warn' | 'error' | 'info', collection?: string, documentId?: string) => void;
  setInstallPrompt: (event: any) => void;
  isEffectivelyOnline: () => boolean;

  // Auth Actions
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  initAuth: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isOnline: true,
  simulateOffline: false,
  syncStatus: 'synced',
  pendingCount: 0,
  lastSyncTime: null,
  syncLogs: [],
  installPromptEvent: null,

  user: null,
  token: null,
  authInitialized: false,

  setOnline: (online) => {
    set({ isOnline: online });
    const effective = online && !get().simulateOffline;
    if (!effective) {
      set({ syncStatus: 'offline' });
    }
  },

  toggleSimulateOffline: () => {
    const nextSimulate = !get().simulateOffline;
    set({ simulateOffline: nextSimulate });
    if (nextSimulate) {
      set({ syncStatus: 'offline' });
      get().addSyncLog('Simulated offline mode ENABLED (airgap emulation)', 'warn');
    } else {
      get().addSyncLog('Simulated offline mode DISABLED (reconnected)', 'info');
    }
  },

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  setPendingCount: (pendingCount) => {
    set({ pendingCount });
    if (!get().isEffectivelyOnline()) {
      set({ syncStatus: 'offline' });
    } else if (pendingCount > 0) {
      set({ syncStatus: 'pending' });
    } else {
      set({ syncStatus: 'synced' });
    }
  },

  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),

  addSyncLog: (message, status = 'info', collection, documentId) => {
    const newLog: SyncLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      status,
      collection,
      documentId,
    };
    set((state) => ({
      syncLogs: [newLog, ...state.syncLogs.slice(0, 24)], // Keep last 25 logs
    }));
  },

  setInstallPrompt: (installPromptEvent) => set({ installPromptEvent }),

  isEffectivelyOnline: () => {
    const { isOnline, simulateOffline } = get();
    return isOnline && !simulateOffline;
  },

  login: (token: string, user: AuthUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('polarlink_token', token);
      if (user) {
        localStorage.setItem('polarlink_user', JSON.stringify(user));
      }
    }
    set({ token, user, authInitialized: true });
    const userName = user?.name || user?.email || 'Field Operator';
    const roleTag = user?.role ? ` [${user.role.toUpperCase()}]` : '';
    get().addSyncLog(`Authenticated: ${userName}${roleTag}`, 'info');
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('polarlink_token');
      localStorage.removeItem('polarlink_user');
    }
    set({ token: null, user: null, authInitialized: true });
    get().addSyncLog('User logged out', 'info');
  },

  setUser: (user) => set({ user }),

  initAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('polarlink_token');
      const userStr = localStorage.getItem('polarlink_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as AuthUser;
          set({ token, user, authInitialized: true });
          return;
        } catch {
          localStorage.removeItem('polarlink_token');
          localStorage.removeItem('polarlink_user');
        }
      }
    }
    set({ authInitialized: true });
  },
}));
