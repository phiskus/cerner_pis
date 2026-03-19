import { writable } from 'svelte/store';

// ─── TypeScript Types ────────────────────────────────────────────────────────

export interface Quantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface Patient {
  id?: string;
  name?: { use?: string; given?: string[]; family?: string }[];
  birthDate?: string;
  gender?: string;
  identifier?: { system?: string; value?: string }[];
}

export interface ObservationComponent {
  code?: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  valueQuantity?: Quantity;
}

export interface Observation {
  id?: string;
  resourceType?: string;
  status?: string;
  code?: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  effectiveDateTime?: string;
  valueQuantity?: Quantity;
  valueString?: string;
  component?: ObservationComponent[];
}

export interface Bundle<T> {
  resourceType: string;
  entry?: { resource: T }[];
}

// ─── Svelte Stores ───────────────────────────────────────────────────────────

export const isAuthenticated   = writable<boolean>(false);
export const patientId         = writable<string | null>(null);
export const patient           = writable<Patient | null>(null);
export const vitals            = writable<Observation[]>([]);
export const needPatientBanner = writable<boolean>(true);
