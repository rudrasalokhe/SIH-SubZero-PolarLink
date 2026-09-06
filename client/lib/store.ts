import { create } from 'zustand';
import { SyncLogItem } from './types';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline';

interface AppState {
  isOnline: boolean;
  simulateOffline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncTime: string | null;
  syncLogs: SyncLogItem[];
  installPromptEvent: any | null;

  setOnline: (online: boolean) => void;
  toggleSimulateOffline: () => void;
  setSyncStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSyncTime: (time: string) => void;
  addSyncLog: (message: string, status?: 'success' | 'warn' | 'error' | 'info', collection?: string, documentId?: string) => void;
  setInstallPrompt: (event: any) => void;
  isEffectivelyOnline: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  simulateOffline: false,
  syncStatus: 'synced',
  pendingCount: 0,
  lastSyncTime: null,
  syncLogs: [
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      message: 'PolarLink Field Client initialized with local WA-SQLite',
      status: 'info',
    },
  ],
  installPromptEvent: null,

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
}));
