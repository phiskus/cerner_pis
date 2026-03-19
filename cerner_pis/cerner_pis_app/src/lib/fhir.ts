import axios from 'axios';
import { ACCESS_TOKEN_KEY, FHIR_BASE_URL_KEY } from '../config';
import type { Bundle, Patient, Observation } from './store';

// ─── Private Helpers ──────────────────────────────────────────────────────────

function baseUrl(): string {
  return localStorage.getItem(FHIR_BASE_URL_KEY) ?? '';
}

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}` };
}

// ─── Public Transformation Helpers ───────────────────────────────────────────

export function bundleEntries<T>(bundle: Bundle<T>): T[] {
  return (bundle?.entry ?? []).map(e => e.resource);
}

export function bundleTotal<T>(bundle: Bundle<T>): number {
  return (bundle as any)?.total ?? 0;
}
// --- TODO: getNextPage(bundle) to support pagination ---

//*** Fill function here ***/

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
    params: {
      patient: id,
      category: 'vital-signs',
      _sort: '-date',
      _count: 50,
    },
  });
  return data;
}

export async function createVital(obs: object): Promise<Observation> {
  const { data } = await axios.post(`${baseUrl()}/Observation`, obs, {
    headers: {
      ...authHeader(),
      'Content-Type': 'application/fhir+json',
    },
  });
  return data;
}
