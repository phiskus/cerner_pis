# Implementation Plan — Cerner SMART on FHIR Vitals App

## Overview
A SMART on FHIR web application that integrates with the Cerner EHR sandbox. The app is launched *by* the EHR (not manually by the user), reads and writes vital sign data for the current patient, and conditionally shows a patient banner based on the EHR's instructions.

---

## Table of Contents
1. [Architecture](#1-architecture)
2. [OAuth EHR Launch Flow](#2-oauth-ehr-launch-flow)
3. [File-by-File Breakdown](#3-file-by-file-breakdown)
4. [FHIR Data Model](#4-fhir-data-model)
5. [Vital Sign Types Reference](#5-vital-sign-types-reference)
6. [LocalStorage Keys Reference](#6-localstorage-keys-reference)
7. [Cerner Sandbox Setup](#7-cerner-sandbox-setup)
8. [Build Order & Checklist](#8-build-order--checklist)
9. [Common Pitfalls](#9-common-pitfalls)

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Cerner EHR                         │
│   Opens: http://localhost:5173/?iss=...&launch=...      │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP redirect
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   App.svelte                            │
│                                                         │
│  State A: iss + launch → discover endpoints → auth      │
│  State B: code → token exchange → store session         │
│  State C: session exists → Dashboard                    │
│  State D: nothing → "Waiting for EHR launch"            │
└───────────────────────┬─────────────────────────────────┘
                        │ isAuthenticated = true
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Dashboard.svelte                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ PatientBanner.svelte (if need_patient_banner)   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ VitalsList.svelte                               │   │
│  │   → slide-in detail panel per vital             │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [+] Button → CreateVitalModal.svelte            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │ axios calls
                        ▼
┌─────────────────────────────────────────────────────────┐
│         Cerner FHIR R4 API                              │
│  GET  /Patient/{id}                                     │
│  GET  /Observation?patient={id}&category=vital-signs    │
│  POST /Observation                                      │
└─────────────────────────────────────────────────────────┘
```

**State management**: All data flows through Svelte stores (`store.ts`). Components read with `$storeName` syntax, never prop-drill data.

**API layer**: All FHIR calls live in `fhir.ts`. Components never call `axios` directly.

---

## 2. OAuth EHR Launch Flow

### Why it's different from the Epic app (module_two)
The Epic app used **Standalone Launch** — the user clicks a button in your app to start OAuth. Cerner here uses **EHR Launch** — the EHR opens your app's URL with special parameters. Your app must handle the launch automatically, with no user action required.

### Step-by-step flow

```
Step 1: EHR opens your app
────────────────────────────────────────────────────────────
URL: http://localhost:5173/?iss=https://fhir-ehr-code.cerner.com/r4/{tenant}&launch=abc123

App detects: iss ✓  launch ✓  → proceed to Step 2

────────────────────────────────────────────────────────────
Step 2: Discover SMART configuration
────────────────────────────────────────────────────────────
GET {iss}/.well-known/smart-configuration

Response JSON contains:
  authorization_endpoint: "https://authorization.cerner.com/..."
  token_endpoint:         "https://authorization.cerner.com/..."

Save both + iss to localStorage (needed after redirect comes back)

────────────────────────────────────────────────────────────
Step 3: Generate PKCE challenge
────────────────────────────────────────────────────────────
pkceChallenge() → { code_verifier, code_challenge }
Save code_verifier to localStorage (needed at token exchange)

────────────────────────────────────────────────────────────
Step 4: Redirect to Cerner authorization
────────────────────────────────────────────────────────────
GET {authorization_endpoint}?
  client_id=YOUR_CLIENT_ID
  &redirect_uri=http://localhost:5173/
  &response_type=code
  &scope=launch openid fhirUser patient/Patient.read patient/Observation.read patient/Observation.write
  &launch=abc123           ← the EHR-provided token
  &aud=https://fhir-ehr-code.cerner.com/r4/{tenant}
  &state=random_string
  &code_challenge=xxxx
  &code_challenge_method=S256

User authenticates in Cerner's UI (may be silent/auto in sandbox)

────────────────────────────────────────────────────────────
Step 5: Handle redirect back
────────────────────────────────────────────────────────────
URL: http://localhost:5173/?code=AUTH_CODE&state=random_string

App detects: code ✓ → proceed to Step 6

────────────────────────────────────────────────────────────
Step 6: Exchange code for token
────────────────────────────────────────────────────────────
POST {token_endpoint}
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=http://localhost:5173/
&client_id=YOUR_CLIENT_ID
&code_verifier=SAVED_VERIFIER

Response JSON:
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 570,
  "scope": "launch openid ...",
  "patient": "12724066",             ← patient ID in context
  "need_patient_banner": true,       ← show/hide patient banner
  "smart_style_url": "https://..."   ← EHR theme (optional use)
}

────────────────────────────────────────────────────────────
Step 7: Store session and render Dashboard
────────────────────────────────────────────────────────────
localStorage.setItem(ACCESS_TOKEN_KEY, access_token)
localStorage.setItem(PATIENT_ID_KEY, patient)
localStorage.setItem(NEED_PATIENT_BANNER_KEY, String(need_patient_banner))

Clean up URL: window.history.replaceState({}, '', '/')
Remove code_verifier from localStorage
isAuthenticated.set(true)  → renders <Dashboard />
```

---

## 3. File-by-File Breakdown

### `src/config.ts`
Centralizes all "magic strings". Nothing else in the app hardcodes URLs or storage keys.

```ts
export const CLIENT_ID = "YOUR_CERNER_CLIENT_ID";
export const REDIRECT_URI = "http://localhost:5173/";

// localStorage keys
export const ACCESS_TOKEN_KEY       = 'smart_access_token';
export const PATIENT_ID_KEY         = 'smart_patient_id';
export const CODE_VERIFIER_KEY      = 'smart_code_verifier';
export const AUTH_URL_KEY           = 'smart_auth_url';
export const TOKEN_URL_KEY          = 'smart_token_url';
export const FHIR_BASE_URL_KEY      = 'smart_fhir_base_url';
export const NEED_PATIENT_BANNER_KEY= 'smart_need_patient_banner';
```

---

### `src/lib/store.ts`
All reactive state. Components subscribe with `$storeName`.

```ts
import { writable } from 'svelte/store';

// --- TypeScript Types ---

export interface Quantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface Patient {
  id?: string;
  name?: { given?: string[]; family?: string; use?: string }[];
  birthDate?: string;
  gender?: string;
  identifier?: { system?: string; value?: string }[];
}

export interface ObservationComponent {
  code?: { coding?: { system?: string; code?: string; display?: string }[]; text?: string };
  valueQuantity?: Quantity;
}

export interface Observation {
  id?: string;
  resourceType?: string;
  status?: string;
  code?: { coding?: { system?: string; code?: string; display?: string }[]; text?: string };
  effectiveDateTime?: string;
  valueQuantity?: Quantity;
  valueString?: string;
  component?: ObservationComponent[];
}

export interface Bundle<T> {
  resourceType: string;
  entry?: { resource: T }[];
}

// --- Stores ---
export const isAuthenticated  = writable<boolean>(false);
export const patientId        = writable<string | null>(null);
export const patient          = writable<Patient | null>(null);
export const vitals           = writable<Observation[]>([]);
export const needPatientBanner= writable<boolean>(true);   // ← key feature
```

---

### `src/lib/fhir.ts`
Three functions. All use `baseUrl()` and `authHeader()` helpers so the token never leaks into component code.

```ts
import axios from 'axios';
import { ACCESS_TOKEN_KEY, FHIR_BASE_URL_KEY } from '../config';
import type { Bundle, Patient, Observation } from './store';

// Helpers
function baseUrl() {
  return localStorage.getItem(FHIR_BASE_URL_KEY) ?? '';
}
function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}` };
}

// Unwrap FHIR Bundle entries into a plain array
export function bundleEntries<T>(bundle: Bundle<T>): T[] {
  return (bundle?.entry ?? []).map(e => e.resource);
}

// GET /Patient/{id}
export async function getPatient(id: string): Promise<Patient> {
  const { data } = await axios.get(`${baseUrl()}/Patient/${id}`, { headers: authHeader() });
  return data;
}

// GET /Observation?patient=...&category=vital-signs
export async function getVitals(id: string): Promise<Observation[]> {
  const { data } = await axios.get(`${baseUrl()}/Observation`, {
    headers: authHeader(),
    params: { patient: id, category: 'vital-signs', _sort: '-date', _count: 50 }
  });
  return bundleEntries<Observation>(data);
}

// POST /Observation
export async function createVital(obs: object): Promise<Observation> {
  const { data } = await axios.post(`${baseUrl()}/Observation`, obs, {
    headers: { ...authHeader(), 'Content-Type': 'application/fhir+json' }
  });
  return data;
}
```

---

### `src/App.svelte`
The OAuth state machine. Handles 4 states on `onMount`.

**Logic summary:**
```
onMount:
  if (localStorage has access_token + patient_id):
    → restore needPatientBanner from localStorage
    → isAuthenticated.set(true)
    → return

  if (URL has ?code):
    → read token_endpoint from localStorage
    → read code_verifier from localStorage
    → POST token request
    → store access_token, patient, need_patient_banner
    → clean URL, isAuthenticated.set(true)
    → return

  if (URL has ?iss and ?launch):
    → GET {iss}/.well-known/smart-configuration
    → save authorization_endpoint, token_endpoint, iss to localStorage
    → generate PKCE
    → redirect to authorization_endpoint
    → return

  // else: show "Waiting for EHR launch" screen
```

**Template:**
```svelte
{#if $isAuthenticated}
  <Dashboard />
{:else}
  <div>Waiting for EHR launch…</div>
{/if}
```

---

### `src/lib/Dashboard.svelte`
Orchestrates data loading and layout.

```svelte
onMount:
  pid = localStorage.getItem(PATIENT_ID_KEY)
  banner = localStorage.getItem(NEED_PATIENT_BANNER_KEY) === 'true'
  needPatientBanner.set(banner)
  patientId.set(pid)

  [p, v] = await Promise.all([getPatient(pid), getVitals(pid)])
  patient.set(p)
  vitals.set(v)
```

**Template structure:**
```svelte
<header>   ← app title
  {#if $needPatientBanner}
    <PatientBanner />
  {/if}
</header>

<main>
  <VitalsList />
  <button on:click={() => showModal = true}>+ Add Vital</button>
</main>

{#if showModal}
  <CreateVitalModal on:close={() => showModal = false} on:created={refreshVitals} />
{/if}
```

---

### `src/lib/PatientBanner.svelte`
Shows patient demographics. Only rendered when `$needPatientBanner === true`.

Reads from `$patient` store. Extracts:
- Full name from `patient.name[0].given + family`
- Age from `patient.birthDate` (calculate with `Date`)
- Gender from `patient.gender`
- MRN from `patient.identifier[]` where `system` contains `"MR"`

---

### `src/lib/VitalsList.svelte`
Reads from `$vitals` store. Two display modes per vital:

**List row** (always visible):
- Vital name (`obs.code.text` or `obs.code.coding[0].display`)
- Value string (see helper below)
- Date (`obs.effectiveDateTime`)

**Value extraction helper:**
```ts
function valueStr(obs: Observation): string {
  if (obs.valueQuantity)
    return `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`;
  if (obs.component?.length)
    return obs.component
      .map(c => `${c.valueQuantity?.value ?? '?'} ${c.valueQuantity?.unit ?? ''}`)
      .join(' / ');
  return '—';
}
```

**Detail panel**: Slide-in from right on row click. Shows value, date, status, components (for BP).

---

### `src/lib/CreateVitalModal.svelte`
Modal form to POST a new vital sign.

**State:**
```ts
let selectedType = VITAL_TYPES[0];  // default to Body Weight
let value = '';
let systolic = '';
let diastolic = '';
let effectiveDateTime = new Date().toISOString().slice(0, 16); // datetime-local input
```

**Vital types config object (drives the dropdown):**
```ts
const VITAL_TYPES = [
  { label: 'Body Weight',      loinc: '29463-7', unit: 'kg',   system: 'http://unitsofmeasure.org', dual: false },
  { label: 'Body Height',      loinc: '8302-2',  unit: 'cm',   system: 'http://unitsofmeasure.org', dual: false },
  { label: 'Heart Rate',       loinc: '8867-4',  unit: '/min', system: 'http://unitsofmeasure.org', dual: false },
  { label: 'Blood Pressure',   loinc: '55284-4', unit: 'mmHg', system: 'http://unitsofmeasure.org', dual: true  },
  { label: 'Body Temperature', loinc: '8310-5',  unit: 'Cel',  system: 'http://unitsofmeasure.org', dual: false },
  { label: 'O2 Saturation',    loinc: '59408-5', unit: '%',    system: 'http://unitsofmeasure.org', dual: false },
  { label: 'Respiratory Rate', loinc: '9279-1',  unit: '/min', system: 'http://unitsofmeasure.org', dual: false },
];
```

**Submit logic (builds the FHIR Observation body):**

For single-value vitals:
```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs" }] }],
  "code": { "coding": [{ "system": "http://loinc.org", "code": "29463-7", "display": "Body weight" }], "text": "Body weight" },
  "subject": { "reference": "Patient/12724066" },
  "effectiveDateTime": "2026-03-19T10:30:00Z",
  "valueQuantity": { "value": 72.5, "unit": "kg", "system": "http://unitsofmeasure.org", "code": "kg" }
}
```

For Blood Pressure (dual-value):
```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs" }] }],
  "code": { "coding": [{ "system": "http://loinc.org", "code": "55284-4", "display": "Blood pressure" }], "text": "Blood pressure" },
  "subject": { "reference": "Patient/12724066" },
  "effectiveDateTime": "2026-03-19T10:30:00Z",
  "component": [
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure" }] },
      "valueQuantity": { "value": 120, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
    },
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8462-4", "display": "Diastolic blood pressure" }] },
      "valueQuantity": { "value": 80, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
    }
  ]
}
```

**After POST:**
1. Dispatch `created` event to Dashboard
2. Dashboard calls `getVitals()` again and updates `$vitals` store
3. Close modal

---

## 4. FHIR Data Model

### Patient Resource (simplified)
```json
{
  "resourceType": "Patient",
  "id": "12724066",
  "name": [{ "use": "official", "family": "Smith", "given": ["John", "A"] }],
  "birthDate": "1987-01-14",
  "gender": "male",
  "identifier": [{ "system": "urn:oid:...:MR", "value": "00007396" }]
}
```

### Observation Resource — Vital Sign
```json
{
  "resourceType": "Observation",
  "id": "observation-id",
  "status": "final",
  "category": [{ "coding": [{ "code": "vital-signs" }] }],
  "code": { "coding": [{ "system": "http://loinc.org", "code": "29463-7" }], "text": "Body weight" },
  "subject": { "reference": "Patient/12724066" },
  "effectiveDateTime": "2026-03-19T10:00:00Z",
  "valueQuantity": { "value": 72.5, "unit": "kg" }
}
```

### FHIR Bundle (API search response)
```json
{
  "resourceType": "Bundle",
  "total": 5,
  "entry": [
    { "resource": { "resourceType": "Observation", ... } },
    { "resource": { "resourceType": "Observation", ... } }
  ]
}
```
`bundleEntries()` helper extracts `entry[].resource` into a flat array.

---

## 5. Vital Sign Types Reference

| Display Name       | LOINC Code | Unit     | UCUM Code  | Input  |
|--------------------|-----------|----------|------------|--------|
| Body Weight        | 29463-7   | kg       | kg         | Single |
| Body Height        | 8302-2    | cm       | cm         | Single |
| Heart Rate         | 8867-4    | /min     | /min       | Single |
| Blood Pressure     | 55284-4   | —        | —          | Dual   |
| → Systolic         | 8480-6    | mmHg     | mm[Hg]     | —      |
| → Diastolic        | 8462-4    | mmHg     | mm[Hg]     | —      |
| Body Temperature   | 8310-5    | Cel      | Cel        | Single |
| O2 Saturation      | 59408-5   | %        | %          | Single |
| Respiratory Rate   | 9279-1    | /min     | /min       | Single |

---

## 6. LocalStorage Keys Reference

| Key | Constant | Value stored | Set when |
|-----|----------|-------------|----------|
| `smart_access_token` | `ACCESS_TOKEN_KEY` | JWT string | Token exchange |
| `smart_patient_id` | `PATIENT_ID_KEY` | Patient FHIR ID | Token exchange |
| `smart_need_patient_banner` | `NEED_PATIENT_BANNER_KEY` | `"true"` or `"false"` | Token exchange |
| `smart_fhir_base_url` | `FHIR_BASE_URL_KEY` | Cerner FHIR base URL | State A (iss param) |
| `smart_auth_url` | `AUTH_URL_KEY` | Cerner auth endpoint | State A (discovery) |
| `smart_token_url` | `TOKEN_URL_KEY` | Cerner token endpoint | State A (discovery) |
| `smart_code_verifier` | `CODE_VERIFIER_KEY` | PKCE verifier string | State A (PKCE gen) |

**Cleanup**: After token exchange, remove `CODE_VERIFIER_KEY` (no longer needed). After logout, clear all keys.

---

## 7. Cerner Sandbox Setup

### Register the app
1. Go to: https://code.cerner.com/developer/smart-on-fhir/apps
2. Create account / sign in
3. Register new app:
   - Type: **Provider** (EHR Launch)
   - Redirect URI: `http://localhost:5173/`
   - Scopes: `launch`, `openid`, `fhirUser`, `patient/Patient.read`, `patient/Observation.read`, `patient/Observation.write`
4. Copy the generated **Client ID** → paste into `src/config.ts`

### Test the launch
Cerner sandbox provides a "Begin Testing" workflow that simulates the EHR opening your app URL with `?iss` and `?launch` parameters. Make sure `npm run dev` is running on port 5173 before clicking "Begin Testing".

### Sandbox FHIR base URL
```
https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d
```
(This will be passed automatically as `iss` by the sandbox — you don't hardcode it.)

---

## 8. Build Order & Checklist

- [ ] 1. Scaffold: `npm create vite@latest cerner_vitals_app -- --template svelte-ts`
- [ ] 2. Install deps: `npm install axios pkce-challenge`
- [ ] 3. Install Tailwind: `npm install -D tailwindcss @tailwindcss/postcss autoprefixer postcss`
- [ ] 4. Copy `postcss.config.mjs` from module_two
- [ ] 5. Update `src/app.css` to `@import "tailwindcss";`
- [ ] 6. Write `src/config.ts`
- [ ] 7. Register app in Cerner sandbox → paste CLIENT_ID
- [ ] 8. Write `src/lib/store.ts`
- [ ] 9. Write `src/lib/fhir.ts`
- [ ] 10. Write `src/App.svelte` (OAuth state machine)
- [ ] 11. Write `src/lib/Dashboard.svelte`
- [ ] 12. Write `src/lib/PatientBanner.svelte`
- [ ] 13. Write `src/lib/VitalsList.svelte`
- [ ] 14. Write `src/lib/CreateVitalModal.svelte`
- [ ] 15. Test EHR launch from Cerner sandbox
- [ ] 16. Verify `need_patient_banner` toggle works
- [ ] 17. Verify vitals list loads
- [ ] 18. Verify create vital → list refreshes

---

## 9. Common Pitfalls

### CORS errors when calling `/.well-known/smart-configuration`
- Cerner's discovery endpoint supports CORS. If you see errors, check you're using `https://` not `http://` in the `iss`.

### Token endpoint URL not available at code exchange time
- You save the `token_endpoint` to localStorage in State A (before redirecting to Cerner), so it's available when you return in State B. If it's missing, the redirect chain broke.

### `need_patient_banner` is a boolean in the JSON but you store it as a string
- Use `String(need_patient_banner)` when storing, and `=== 'true'` when reading.

### Blood pressure UCUM code
- The `unit` display is `"mmHg"` but the UCUM `code` field must be `"mm[Hg]"` (with brackets). Some Cerner implementations are strict about this.

### `_count` parameter
- Cerner may cap results lower than requested. If vitals seem truncated, add paging or increase `_count`.

### Refreshing the page clears the auth state
- Since access tokens are in localStorage, a page refresh in State C (session exists) should auto-restore. Make sure to check localStorage *before* checking URL params in `onMount`.

### `POST /Observation` returns 201 but not the full resource
- Some FHIR servers return the created resource in the response body; others return only a `Location` header. After a successful POST, re-fetch `getVitals()` rather than trying to append the POST response directly to the store.
