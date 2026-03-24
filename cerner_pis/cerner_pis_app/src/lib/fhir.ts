import axios from 'axios';
import { ACCESS_TOKEN_KEY, FHIR_BASE_URL_KEY } from '../config';
import type { Bundle, Patient, Observation, DiagnosticReport, MedicationRequest } from './store';
import { sessionExpired, debugVitals, debugLabs, debugMeds } from './store';
import { devlog } from './devlog';

// ─── Auto-logout on expired token ────────────────────────────────────────────
axios.interceptors.response.use(
  res => res,
  err => {
    const status = err?.response?.status;
    const body   = err?.response?.data;
    const isTokenError = status === 401
      || body?.code === 401
      || body?.message?.includes('token-required');

    if (isTokenError) {
      localStorage.clear();
      sessionExpired.set(true);
    }
    return Promise.reject(err);
  }
);

// ─── Private Helpers ──────────────────────────────────────────────────────────

function baseUrl(): string {
  return localStorage.getItem(FHIR_BASE_URL_KEY) ?? '';
}

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}` };
}

function ts(): string {
  return new Date().toISOString();
}

// ─── Public Transformation Helpers ───────────────────────────────────────────

export function bundleEntries<T>(bundle: Bundle<T>): T[] {
  return (bundle?.entry ?? []).map(e => e.resource);
}

export function bundleTotal<T>(bundle: Bundle<T>): number {
  return (bundle as any)?.total ?? 0;
}

// ─── API Calls (return raw FHIR) ─────────────────────────────────────────────

export async function getPatient(id: string): Promise<Patient> {
  const { data } = await axios.get(`${baseUrl()}/Patient/${id}`, {
    headers: authHeader(),
  });
  return data;
}

export async function getVitals(id: string): Promise<Bundle<Observation>> {
  const { data } = await axios.get(`${baseUrl()}/Observation`, {
    headers: authHeader(),
    params: { patient: id, category: 'vital-signs', _sort: '-date', _count: 50 },
  });
  debugVitals.set({ label: 'GET /Observation?category=vital-signs', data, timestamp: ts() });
  devlog('GET /Observation (vitals)', data);
  return data;
}

export async function createVital(obs: object): Promise<Observation> {
  const { data } = await axios.post(`${baseUrl()}/Observation`, obs, {
    headers: { ...authHeader(), 'Content-Type': 'application/fhir+json' },
  });
  return data;
}

export async function getLabs(id: string): Promise<Bundle<DiagnosticReport>> {
  const { data } = await axios.get(`${baseUrl()}/DiagnosticReport`, {
    headers: authHeader(),
    params: { patient: id, _sort: '-date', _count: 20 },
  });
  debugLabs.set({ label: 'GET /DiagnosticReport', data, timestamp: ts() });
  devlog('GET /DiagnosticReport', data);
  return data;
}

export async function getMedications(id: string): Promise<Bundle<MedicationRequest>> {
  const { data } = await axios.get(`${baseUrl()}/MedicationRequest`, {
    headers: authHeader(),
    params: { patient: id, _sort: '-authoredon', _count: 20 },
  });
  debugMeds.set({ label: 'GET /MedicationRequest', data, timestamp: ts() });
  devlog('GET /MedicationRequest', data);
  return data;
}
