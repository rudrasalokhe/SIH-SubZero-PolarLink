import axios from 'axios';
import { CargoItem, PersonnelItem, SOSAlertItem, DashboardStats, AuthUser, HQOverviewData } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token if available
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('polarlink_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: Redirect to /login on 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isLoginPath = window.location.pathname === '/login';
      if (!isLoginPath) {
        localStorage.removeItem('polarlink_token');
        localStorage.removeItem('polarlink_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export async function apiLogin(credentials: { email: string; password: string }): Promise<{ token: string; user: AuthUser }> {
  const res = await apiClient.post('/auth/login', credentials);
  const data = res.data?.data || res.data || {};
  const user: AuthUser = data.user || {
    personnelId: data.personnelId || 'pers-unknown',
    name: data.name || data.email || 'Personnel',
    email: data.email || credentials.email,
    role: data.role || 'scientist',
    stationId: data.stationId || 'station-alpha',
  };
  return { token: data.token, user };
}

export async function apiRegister(userData: {
  email: string;
  password: string;
  name: string;
  role: string;
  stationId: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await apiClient.post('/auth/register', userData);
  const data = res.data?.data || res.data || {};
  const user: AuthUser = data.user || {
    personnelId: data.personnelId || 'pers-unknown',
    name: data.name || userData.name,
    email: data.email || userData.email,
    role: data.role || userData.role,
    stationId: data.stationId || userData.stationId || 'station-alpha',
  };
  return { token: data.token, user };
}

export async function apiGetMe(): Promise<AuthUser> {
  const res = await apiClient.get('/auth/me');
  return res.data.data;
}

// Cargo Endpoints
export async function apiGetCargo(category?: string, status?: string): Promise<CargoItem[]> {
  const res = await apiClient.get('/cargo', { params: { category, status } });
  return res.data.data;
}

export async function apiCreateCargo(cargo: Partial<CargoItem>): Promise<CargoItem> {
  const res = await apiClient.post('/cargo', cargo);
  return res.data.data;
}

export async function apiUpdateCargo(itemId: string, cargo: Partial<CargoItem>): Promise<CargoItem> {
  const res = await apiClient.put(`/cargo/${itemId}`, cargo);
  return res.data.data;
}

export async function apiConfirmCargo(itemId: string): Promise<CargoItem> {
  const res = await apiClient.put(`/cargo/${itemId}/confirm`);
  return res.data.data;
}

export async function apiDeleteCargo(itemId: string): Promise<void> {
  await apiClient.delete(`/cargo/${itemId}`);
}

// Personnel Endpoints
export async function apiGetPersonnel(role?: string, medicalStatus?: string): Promise<PersonnelItem[]> {
  const res = await apiClient.get('/personnel', { params: { role, medicalStatus } });
  return res.data.data;
}

export async function apiCreatePersonnel(personnel: Partial<PersonnelItem>): Promise<PersonnelItem> {
  const res = await apiClient.post('/personnel', personnel);
  return res.data.data;
}

export async function apiUpdatePersonnel(personnelId: string, personnel: Partial<PersonnelItem>): Promise<PersonnelItem> {
  const res = await apiClient.put(`/personnel/${personnelId}`, personnel);
  return res.data.data;
}

export async function apiGetAvailableMedics(stationId?: string): Promise<PersonnelItem[]> {
  const res = await apiClient.get('/personnel/available-medics', { params: { stationId } });
  return res.data.data;
}

// SOS Endpoints
export async function apiRaiseSOS(alert: {
  alertId?: string;
  raisedBy?: string;
  stationId?: string;
  location?: { lat: number; lng: number };
  severity?: string;
}): Promise<SOSAlertItem> {
  const res = await apiClient.post('/sos', alert);
  return res.data.data;
}

export async function apiGetActiveAlerts(): Promise<SOSAlertItem[]> {
  const res = await apiClient.get('/sos');
  return res.data.data;
}

export async function apiAcknowledgeAlert(alertId: string): Promise<SOSAlertItem> {
  const res = await apiClient.put(`/sos/${alertId}/acknowledge`);
  return res.data.data;
}

export async function apiResolveAlert(alertId: string): Promise<SOSAlertItem> {
  const res = await apiClient.put(`/sos/${alertId}/resolve`);
  return res.data.data;
}

// Offline Sync Endpoints
export async function apiGetPendingSync(): Promise<{
  cargo: CargoItem[];
  personnel: PersonnelItem[];
  sosAlerts: SOSAlertItem[];
  totalPending: number;
}> {
  const res = await apiClient.get('/sync/pending');
  return res.data.data;
}

export async function apiAcknowledgeSync(items: Array<{ collection: string; documentId: string }>): Promise<{
  acknowledgedCount: number;
}> {
  const res = await apiClient.post('/sync/ack', items);
  return res.data.data;
}

// Health & Dashboard
export async function apiGetDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get('/dashboard/stats');
  return res.data.data;
}

export async function apiGetHQOverview(): Promise<HQOverviewData> {
  const res = await apiClient.get('/dashboard/hq-overview');
  return res.data.data;
}

export async function apiPromoteUser(personnelId: string, newRole: string): Promise<{ personnelId: string; name: string; email: string; oldRole: string; newRole: string }> {
  const res = await apiClient.put(`/auth/promote/${personnelId}`, { role: newRole });
  return res.data.data;
}

export async function apiUpdateLocation(personnelId: string, lat: number, lng: number): Promise<any> {
  const res = await apiClient.put(`/personnel/${personnelId}/location`, { lat, lng });
  return res.data.data;
}

export async function apiCheckHealth(): Promise<boolean> {
  try {
    const res = await apiClient.get('/health', { timeout: 2500 });
    return res.data.success === true;
  } catch {
    return false;
  }
}
