# Cerner SMART on FHIR — Vitals App

## Project Goal
A SMART on FHIR web app targeting the **Cerner sandbox** that:
1. Auto-initiates launch when opened by the EHR (no manual login button)
2. Conditionally shows a Patient Banner based on `need_patient_banner` from the token response
3. Lists the current patient's vital signs
4. Allows creating new vital sign entries via a modal form

## Tech Stack
Same as `../module_two/epic_pat_app`:
- **Svelte 5** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS v4** (`@tailwindcss/postcss`)
- **axios** (HTTP)
- **pkce-challenge** (PKCE OAuth)

## App Location
```
/Users/philtreffer/DEV/medblocks/module_three/cerner_vitals_app/
```

## Reference Project
`/Users/philtreffer/DEV/medblocks/module_two/epic_pat_app/`
Copy patterns from: `store.ts`, `fhir.ts`, component structure, Tailwind config.

## Planned File Structure
```
src/
  App.svelte                  — EHR launch detection + OAuth PKCE flow
  config.ts                   — Client ID, redirect URI, localStorage keys
  app.css                     — Tailwind import
  main.ts                     — Entry point
  lib/
    store.ts                  — Svelte stores + TS types (Patient, Observation, Bundle)
    fhir.ts                   — getPatient(), getVitals(), createVital()
    Dashboard.svelte          — Main layout post-auth
    PatientBanner.svelte      — Shown only if need_patient_banner === true
    VitalsList.svelte         — Scrollable vitals list + slide-in detail panel
    CreateVitalModal.svelte   — Modal form to POST a new Observation
```

## EHR Launch OAuth Flow (Critical Difference from Epic App)

Cerner launches the app with `?iss={fhir_base_url}&launch={token}`.

**App.svelte on mount handles 4 states:**
1. `?iss` + `?launch` present → fetch `{iss}/.well-known/smart-configuration`, store endpoints, redirect to auth
2. `?code` present → exchange code for token, store session, render Dashboard
3. Valid session in localStorage → go straight to Dashboard
4. Nothing → show "Waiting for EHR launch…" screen

**Scopes needed:**
```
launch openid fhirUser patient/Patient.read patient/Observation.read patient/Observation.write
```

**Token response fields to store:**
- `access_token` → `localStorage` (`smart_access_token`)
- `patient` → `localStorage` (`smart_patient_id`)
- `need_patient_banner` → `localStorage` (`smart_need_patient_banner`)
- `iss` (from initial params) → `localStorage` (`smart_fhir_base_url`)
- Discovered `authorization_endpoint` → `localStorage` (`smart_auth_url`)
- Discovered `token_endpoint` → `localStorage` (`smart_token_url`)

## Patient Banner Logic
```svelte
{#if $needPatientBanner}
  <PatientBanner />
{/if}
```
The `needPatientBanner` store is populated from `localStorage` after auth.

## Vital Signs — Supported Types for Creation
| Display Name       | LOINC     | Unit   | Input Style |
|--------------------|-----------|--------|-------------|
| Body Weight        | 29463-7   | kg     | Single      |
| Body Height        | 8302-2    | cm     | Single      |
| Heart Rate         | 8867-4    | /min   | Single      |
| Blood Pressure     | 55284-4   | mmHg   | Dual (systolic 8480-6 / diastolic 8462-4) |
| Body Temperature   | 8310-5    | Cel    | Single      |
| Oxygen Saturation  | 59408-5   | %      | Single      |
| Respiratory Rate   | 9279-1    | /min   | Single      |

Blood pressure uses FHIR `component[]` instead of `valueQuantity`.

## Cerner Sandbox
- Register app at: https://code.cerner.com/developer/smart-on-fhir/apps
- Test tenant FHIR base: `https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d`
- CLIENT_ID goes in `src/config.ts`

## Dev Server
```bash
cd cerner_vitals_app
npm run dev   # runs on http://localhost:5173
```

## Build Steps (in order)
1. Scaffold: `npm create vite@latest cerner_vitals_app -- --template svelte-ts`
2. Install deps: `npm install axios pkce-challenge` + Tailwind devDeps
3. Copy Tailwind config from module_two (`postcss.config.mjs`, `app.css`)
4. Write `config.ts` (storage keys + CLIENT_ID placeholder)
5. Register app on Cerner sandbox → fill in CLIENT_ID
6. Write `store.ts` (types + stores, add `needPatientBanner`)
7. Write `fhir.ts` (getPatient, getVitals, createVital)
8. Write `App.svelte` (4-state EHR launch flow)
9. Write `Dashboard.svelte` (parallel data load, conditional banner)
10. Write `PatientBanner.svelte` + `VitalsList.svelte`
11. Write `CreateVitalModal.svelte`
