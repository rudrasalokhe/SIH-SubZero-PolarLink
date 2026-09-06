import {
  getPendingRecords,
  getPendingRecordsCount,
  markSyncedLocal,
  saveCargoLocal,
  savePersonnelLocal,
  saveSOSAlertLocal,
  getAllCargoLocal,
  getAllPersonnelLocal,
  getAllSOSAlertsLocal,
} from './db';
import {
  apiCreateCargo,
  apiUpdateCargo,
  apiDeleteCargo,
  apiCreatePersonnel,
  apiUpdatePersonnel,
  apiRaiseSOS,
  apiAcknowledgeAlert,
  apiResolveAlert,
  apiGetPendingSync,
  apiAcknowledgeSync,
  apiGetCargo,
  apiGetPersonnel,
  apiGetActiveAlerts,
} from './api';
import { useAppStore } from './store';

let syncTimer: any = null;
let isSyncing = false;

/**
 * Executes a full bi-directional push and pull sync cycle
 */
export async function syncAll(): Promise<void> {
  const store = useAppStore.getState();

  // If offline or offline simulation active, don't attempt network calls
  if (!store.isEffectivelyOnline()) {
    store.setSyncStatus('offline');
    const pending = await getPendingRecordsCount();
    store.setPendingCount(pending);
    return;
  }

  if (isSyncing) return;
  isSyncing = true;

  try {
    store.setSyncStatus('syncing');

    // ==========================================================
    // 1. PUSH CYCLE: Push locally created/updated records
    // ==========================================================
    const { cargo, personnel, sosAlerts } = await getPendingRecords();
    let pushSuccessCount = 0;

    // Push pending Cargo
    for (const item of cargo) {
      try {
        if (item._deleted) {
          await apiDeleteCargo(item.itemId);
        } else {
          try {
            await apiUpdateCargo(item.itemId, item);
          } catch {
            await apiCreateCargo(item);
          }
        }
        await markSyncedLocal('cargo', item.itemId);
        pushSuccessCount++;
        store.addSyncLog(`Pushed Cargo '${item.name}' (${item.itemId})`, 'success', 'Cargo', item.itemId);
      } catch (err: any) {
        console.warn(`[SYNC PUSH] Failed to push cargo ${item.itemId}:`, err.message);
      }
    }

    // Push pending Personnel
    for (const item of personnel) {
      try {
        try {
          await apiUpdatePersonnel(item.personnelId, item);
        } catch {
          await apiCreatePersonnel(item);
        }
        await markSyncedLocal('personnel', item.personnelId);
        pushSuccessCount++;
        store.addSyncLog(`Pushed Personnel '${item.name}' (${item.personnelId})`, 'success', 'Personnel', item.personnelId);
      } catch (err: any) {
        console.warn(`[SYNC PUSH] Failed to push personnel ${item.personnelId}:`, err.message);
      }
    }

    // Push pending SOS Alerts
    for (const item of sosAlerts) {
      try {
        if (item.status === 'acknowledged') {
          await apiAcknowledgeAlert(item.alertId);
        } else if (item.status === 'resolved') {
          await apiResolveAlert(item.alertId);
        } else {
          const remoteAlert = await apiRaiseSOS({
            alertId: item.alertId,
            raisedBy: item.raisedBy,
            stationId: item.stationId,
            location: item.location,
            severity: item.severity,
          });
          // Update local alert with matched medic & inventory from backend
          if (remoteAlert) {
            await saveSOSAlertLocal(
              {
                ...item,
                matchedMedic: remoteAlert.matchedMedic,
                matchedInventory: remoteAlert.matchedInventory,
                status: remoteAlert.status,
                _synced: true,
              },
              false
            );
          }
        }
        await markSyncedLocal('sos', item.alertId);
        pushSuccessCount++;
        store.addSyncLog(`Pushed SOS Alert '${item.alertId}' (${item.status})`, 'success', 'SOSAlert', item.alertId);
      } catch (err: any) {
        console.warn(`[SYNC PUSH] Failed to push SOS alert ${item.alertId}:`, err.message);
      }
    }

    // ==========================================================
    // 2. PULL CYCLE: Pull remote records from Station Master Node
    // ==========================================================
    try {
      const pendingRemote = await apiGetPendingSync();
      const ackList: Array<{ collection: string; documentId: string }> = [];

      // Merge remote cargo
      if (Array.isArray(pendingRemote.cargo)) {
        for (const remoteItem of pendingRemote.cargo) {
          await saveCargoLocal(remoteItem, false);
          ackList.push({ collection: 'Cargo', documentId: remoteItem.itemId });
        }
      }

      // Merge remote personnel
      if (Array.isArray(pendingRemote.personnel)) {
        for (const remotePers of pendingRemote.personnel) {
          await savePersonnelLocal(remotePers, false);
          ackList.push({ collection: 'Personnel', documentId: remotePers.personnelId });
        }
      }

      // Merge remote alerts
      if (Array.isArray(pendingRemote.sosAlerts)) {
        for (const remoteSOS of pendingRemote.sosAlerts) {
          await saveSOSAlertLocal(remoteSOS, false);
          ackList.push({ collection: 'SOSAlert', documentId: remoteSOS.alertId });
        }
      }

      // If backend has no pending sync (e.g. initial fresh device), hydrate baseline
      const localCargoCount = (await getAllCargoLocal()).length;
      if (localCargoCount === 0) {
        try {
          const baseCargo = await apiGetCargo();
          for (const c of baseCargo) await saveCargoLocal(c, false);
          const basePers = await apiGetPersonnel();
          for (const p of basePers) await savePersonnelLocal(p, false);
          const baseAlerts = await apiGetActiveAlerts();
          for (const a of baseAlerts) await saveSOSAlertLocal(a, false);
          store.addSyncLog('Initial station database snapshot pulled to WA-SQLite', 'info');
        } catch {
          // ignore initial hydration errors
        }
      }

      // Acknowledge mainland pull
      if (ackList.length > 0) {
        await apiAcknowledgeSync(ackList);
        store.addSyncLog(`Pulled and merged ${ackList.length} updates from station node`, 'info');
      }
    } catch (pullErr: any) {
      console.warn('[SYNC PULL] Failed to pull from station node:', pullErr.message);
    }

    // Update state
    const remainingPending = await getPendingRecordsCount();
    store.setPendingCount(remainingPending);
    store.setLastSyncTime(new Date().toLocaleTimeString());

    if (pushSuccessCount > 0) {
      console.log(`[SYNC MANAGER] Sync complete: ${pushSuccessCount} records pushed.`);
    }
  } catch (err: any) {
    console.error('[SYNC MANAGER ERROR]:', err.message);
    store.addSyncLog(`Sync cycle encountered an issue: ${err.message}`, 'error');
  } finally {
    isSyncing = false;
  }
}

/**
 * Triggers an immediate priority sync for a newly raised SOS alert
 */
export async function triggerPrioritySOSSync(): Promise<void> {
  const store = useAppStore.getState();
  if (store.isEffectivelyOnline()) {
    store.addSyncLog('High-priority emergency SOS push initiated...', 'warn');
    await syncAll();
  } else {
    store.addSyncLog('SOS logged locally in WA-SQLite (Offline — will auto-dispatch on reconnect)', 'warn');
  }
}

/**
 * Initializes listeners and 30-second interval polling for background sync
 */
export function startBackgroundSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    useAppStore.getState().setOnline(true);
    useAppStore.getState().addSyncLog('Network connection established - syncing pending queue', 'info');
    syncAll();
  };

  const handleOffline = () => {
    useAppStore.getState().setOnline(false);
    useAppStore.getState().addSyncLog('Network connection dropped - operating offline-first', 'warn');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial sync attempt
  syncAll();

  // 30-second background poll
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    syncAll();
  }, 30000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (syncTimer) clearInterval(syncTimer);
  };
}
