// API client for the Warehouse Management System Django API.
//
// Base URL resolution order (first set value wins):
//   VITE_API_BASE_URL -> REACT_APP_API_BASE_URL -> API_BASE_URL
//   -> http://127.0.0.1:8000
// vite.config.ts sets envPrefix so the REACT_APP_* / API_* names are also
// exposed to the browser bundle (Vite only exposes VITE_* by default).

export function getApiBaseUrl(): string {
  const env = import.meta.env as unknown as Record<string, string | undefined>
  return (
    env.VITE_API_BASE_URL ||
    env.REACT_APP_API_BASE_URL ||
    env.API_BASE_URL ||
    'http://127.0.0.1:8000'
  )
}

export type Role = 'admin' | 'auditor' | 'technician'

export interface User {
  username: string
  role: Role
}

export interface Pallet {
  pallet_number: string
  barcode: string
  item: string
  quantity: number
  location?: string | null
}

export interface WarehouseLocation {
  code: string
  is_transfer_point: boolean
  occupied: boolean
  pallet: Pallet | null
}

export interface MapResponse {
  locations: WarehouseLocation[]
}

export interface Shuttle {
  identifier: string
  status: string
  battery_percent: number
}

export interface HistoryPoint {
  date: string
  occupied: number
  free: number
}

export interface DashboardData {
  occupied: number
  free: number
  history: HistoryPoint[]
  pallets: Pallet[]
}

export interface AdminUser {
  id?: number
  username: string
  role: Role
}

const ACCESS_KEY = 'wms_access_token'
const REFRESH_KEY = 'wms_refresh_token'
const USER_KEY = 'wms_user'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function saveAuth(access: string, refresh: string, user: User): void {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
  }
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === 'string') return data.detail
    if (typeof data?.message === 'string') return data.message
    // DRF field errors come back as {"field": ["..."]} — flatten them so
    // the user sees the real reason instead of a bare status code.
    if (data && typeof data === 'object') {
      const parts: string[] = []
      for (const [key, val] of Object.entries(data)) {
        if (Array.isArray(val)) parts.push(`${key}: ${val.join(', ')}`)
        else if (typeof val === 'string') parts.push(`${key}: ${val}`)
      }
      if (parts.length) return parts.join(' ')
    }
    return `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers })
  if (res.status === 401) {
    clearAuth()
    throw new ApiError(401, 'Session expired. Please log in again.')
  }
  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorDetail(res))
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function fetchMap(): Promise<MapResponse> {
  return apiFetch<MapResponse>('/api/map/')
}

export interface LoadPayload {
  pallet_number: string
  barcode: string
  item: string
  quantity: number
  destination: string
}

export function loadPallet(payload: LoadPayload): Promise<unknown> {
  return apiFetch('/api/load/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function unloadPallet(location: string): Promise<unknown> {
  return apiFetch('/api/unload/', {
    method: 'POST',
    body: JSON.stringify({ location }),
  })
}

export function fetchShuttle(): Promise<Shuttle> {
  return apiFetch<Shuttle>('/api/shuttle/')
}

export function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/api/dashboard/')
}

export function fetchAdminUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/api/admin/users/')
}

export function createAdminUser(payload: {
  username: string
  password: string
  role: Role
}): Promise<AdminUser> {
  return apiFetch<AdminUser>('/api/admin/users/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function checkHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/health/')
}
