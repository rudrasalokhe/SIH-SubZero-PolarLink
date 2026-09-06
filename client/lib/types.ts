export type CargoCategory = 'food' | 'fuel' | 'medical' | 'equipment' | 'scientific' | 'other';
export type CargoStatus = 'warehouse' | 'in-transit' | 'delivered' | 'consumed';

export interface CargoItem {
  itemId: string;
  name: string;
  category: CargoCategory;
  quantity: number;
  unit: string;
  currentLocation: {
    stationId: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    status: CargoStatus;
  };
  transitHistory?: Array<{
    fromStation?: string;
    toStation?: string;
    timestamp?: string;
    handledBy?: string;
  }>;
  expiryDate?: string | null;
  criticalThreshold: number;
  _synced?: boolean;
  _lastModified?: string;
  _deleted?: boolean;
  _pending_sync?: boolean;
  _local_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PersonnelRole = 'scientist' | 'engineer' | 'medic' | 'logistics' | 'commander';
export type MedicalStatus = 'cleared' | 'pending' | 'restricted' | 'expired';
export type SOSStatus = 'safe' | 'emergency' | 'unresponsive';

export interface PersonnelItem {
  personnelId: string;
  name: string;
  role: PersonnelRole;
  medicalClearance: {
    status: MedicalStatus;
    lastCheckupDate?: string;
    conditions?: string[];
    bloodGroup?: string;
  };
  trainingStatus?: Array<{
    trainingType: string;
    completedDate?: string;
    expiryDate?: string;
    certified?: boolean;
  }>;
  currentLocation: {
    stationId: string;
    lastCheckIn?: string;
  };
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  sosStatus: SOSStatus;
  _synced?: boolean;
  _lastModified?: string;
  _deleted?: boolean;
  _pending_sync?: boolean;
  _local_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AlertSeverity = 'low' | 'medium' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface SOSAlertItem {
  alertId: string;
  raisedBy: string;
  stationId: string;
  location: {
    lat: number;
    lng: number;
  };
  severity: AlertSeverity;
  status: AlertStatus;
  matchedMedic?: string | null;
  matchedInventory?: string[];
  _synced?: boolean;
  _lastModified?: string;
  _deleted?: boolean;
  _pending_sync?: boolean;
  _local_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalCargo: number;
  lowStockCount: number;
  activeSOSCount: number;
  totalPersonnel: number;
  personnelByRole: {
    scientist: number;
    engineer: number;
    medic: number;
    logistics: number;
    commander: number;
  };
  timestamp: string;
}

export interface SyncLogItem {
  id: string;
  timestamp: string;
  message: string;
  status: 'success' | 'warn' | 'error' | 'info';
  collection?: string;
  documentId?: string;
}
