// ─── OAuth / App Identity ───────────────────────────────────────────────────
export const CLIENT_ID   = "01f392f7-4b2c-4197-8f92-1543f32922df";  // ID for Cerner App Module_3_b
//export const CLIENT_ID   = "e5cbb1b8-9c3d-4a0b-9c8d-7f1a1e5c3d2a";  // ID for Cerner App Module_3 (probably wrong scopes)
export const REDIRECT_URI = "http://localhost:5173/";

// ─── localStorage Keys ──────────────────────────────────────────────────────
// Auth
export const ACCESS_TOKEN_KEY        = "smart_access_token";
export const PATIENT_ID_KEY          = "smart_patient_id";
export const CODE_VERIFIER_KEY       = "smart_code_verifier";

// Discovered at launch time
export const AUTH_URL_KEY            = "smart_auth_url";
export const TOKEN_URL_KEY           = "smart_token_url";
export const FHIR_BASE_URL_KEY       = "smart_fhir_base_url";

// EHR context
export const NEED_PATIENT_BANNER_KEY = "smart_need_patient_banner";

//Token response 
export const ENCOUNTER_KEY = 'smart_encounter';
export const USER_KEY      = 'smart_user';
