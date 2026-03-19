// ─── OAuth / App Identity ───────────────────────────────────────────────────
export const CLIENT_ID   = "";                       // ← fill in after Cerner registration
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
