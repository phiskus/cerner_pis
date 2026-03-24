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
  identifier?: {
    use?: string;
    system?: string;
    value?: string;
    type?: { coding?: { system?: string; code?: string; display?: string }[] };
  }[];
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

export interface DiagnosticReport {
  id?: string;
  resourceType?: string;
  status?: string;
  code?: {
    text?: string;
    coding?: { system?: string; code?: string; display?: string }[];
  };
  category?: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  }[];
  effectiveDateTime?: string;
  issued?: string;
  result?: { reference?: string; display?: string }[];
}

export interface MedicationRequest {
  id?: string;
  resourceType?: string;
  status?: string;
  intent?: string;
  medicationCodeableConcept?: {
    text?: string;
    coding?: { system?: string; code?: string; display?: string }[];
  };
  authoredOn?: string;
  dosageInstruction?: { text?: string }[];
  requester?: { reference?: string; display?: string };
}

// ─── Debug Log Type ───────────────────────────────────────────────────────────

export interface DebugEntry {
  label: string;
  data: unknown;
  timestamp: string;
}

// ─── Svelte Stores ───────────────────────────────────────────────────────────

export const isAuthenticated   = writable<boolean>(false);
export const patientId         = writable<string | null>(null);
export const patient           = writable<Patient | null>(null);
export const vitals            = writable<Observation[]>([]);
export const labs              = writable<DiagnosticReport[]>([]);
export const medications       = writable<MedicationRequest[]>([]);
export const needPatientBanner = writable<boolean>(true);
export const sessionExpired    = writable<boolean>(false);

// ─── Debug Stores (dev only) ──────────────────────────────────────────────────
export const debugVitals = writable<DebugEntry | null>(null);
export const debugLabs   = writable<DebugEntry | null>(null);
export const debugMeds   = writable<DebugEntry | null>(null);
export const debugPost   = writable<DebugEntry | null>(null);
