<script lang="ts">
  import { onMount } from 'svelte';
  import pkceChallenge from 'pkce-challenge';
  import axios from 'axios';
  import {
    CLIENT_ID,
    REDIRECT_URI,
    ACCESS_TOKEN_KEY,
    PATIENT_ID_KEY,
    CODE_VERIFIER_KEY,
    AUTH_URL_KEY,
    TOKEN_URL_KEY,
    FHIR_BASE_URL_KEY,
    NEED_PATIENT_BANNER_KEY,
    ENCOUNTER_KEY,
    USER_KEY,
  } from './config';
  import { isAuthenticated, needPatientBanner } from './lib/store';
  import Dashboard from './lib/Dashboard.svelte';

  let loading = true;

  // ─── State A: EHR opens app with ?iss + ?launch ───────────────────────────
  async function handleEHRLaunch(iss: string, launch: string) {
    // 1. Discover SMART endpoints from the FHIR server
    const { data } = await axios.get(`${iss}/.well-known/smart-configuration`);
    const authUrl  = data.authorization_endpoint as string;
    const tokenUrl = data.token_endpoint as string;

    // 2. Save everything needed for after the redirect
    localStorage.setItem(FHIR_BASE_URL_KEY, iss);
    localStorage.setItem(AUTH_URL_KEY,       authUrl);
    localStorage.setItem(TOKEN_URL_KEY,      tokenUrl);

    // 3. Generate PKCE
    const { code_challenge, code_verifier } = await pkceChallenge();
    localStorage.setItem(CODE_VERIFIER_KEY, code_verifier);

    // 4. Redirect to Cerner authorization
    const url = new URL(authUrl);
    url.searchParams.set('client_id',              CLIENT_ID);
    url.searchParams.set('redirect_uri',           REDIRECT_URI);
    url.searchParams.set('response_type',          'code');
    url.searchParams.set('scope',                  'launch openid fhirUser user/Patient.rs user/Observation.rs user/Observation.cu');

    url.searchParams.set('launch',                 launch);
    url.searchParams.set('aud',                    iss);
    url.searchParams.set('state',                  crypto.randomUUID());
    url.searchParams.set('code_challenge',         code_challenge);
    url.searchParams.set('code_challenge_method',  'S256');
    console.log('Auth URL:', url.href); // ← ADD THIS
    window.location.href = url.href;
  }

  // ─── State B: Returning from auth with ?code ──────────────────────────────
  async function handleAuthCallback(code: string) {
    const tokenUrl     = localStorage.getItem(TOKEN_URL_KEY)     ?? '';
    const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY) ?? '';

    // URLSearchParams sends as application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.set('grant_type',    'authorization_code');
    params.set('code',          code);
    params.set('redirect_uri',  REDIRECT_URI);
    params.set('client_id',     CLIENT_ID);
    params.set('code_verifier', codeVerifier);

    const { data } = await axios.post(tokenUrl, params);
    console.log('Full token response:', data); 
    console.log('Token response:', JSON.stringify(data, null, 2));
    // Store session
    localStorage.setItem(ACCESS_TOKEN_KEY,        data.access_token);
    localStorage.setItem(PATIENT_ID_KEY,          data.patient);
    localStorage.setItem(NEED_PATIENT_BANNER_KEY, String(data.need_patient_banner));
    localStorage.setItem(ENCOUNTER_KEY, data.encounter);
    localStorage.setItem(USER_KEY,      data.user);

    // Cleanup
    localStorage.removeItem(CODE_VERIFIER_KEY);
    window.history.replaceState({}, '', '/');

    needPatientBanner.set(data.need_patient_banner === true);
    isAuthenticated.set(true);
  }

  // ─── Main entry point ─────────────────────────────────────────────────────
  onMount(async () => {
    const params = new URL(window.location.href).searchParams;
    const iss    = params.get('iss');
    const launch = params.get('launch');
    const code   = params.get('code');

    try {
      // State C: valid session already in localStorage
      if (localStorage.getItem(ACCESS_TOKEN_KEY) && localStorage.getItem(PATIENT_ID_KEY)) {
        needPatientBanner.set(localStorage.getItem(NEED_PATIENT_BANNER_KEY) === 'true');
        isAuthenticated.set(true);
        return;
      }

      // State B: returning from Cerner auth
      if (code) {
        await handleAuthCallback(code);
        return;
      }

      // State A: EHR launched us
      if (iss && launch) {
        await handleEHRLaunch(iss, launch);
        return;
      }

      // State D: nothing — waiting for EHR
    } catch (e) {
      console.error('Auth error:', e);
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
  </div>

{:else if $isAuthenticated}
  <Dashboard />

{:else}
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
    <div class="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm flex flex-col items-center gap-4 text-center">
      <span class="text-5xl">🏥</span>
      <h1 class="text-xl font-bold text-gray-800">Cerner Vitals App</h1>
      <p class="text-sm text-gray-500">Waiting for EHR launch…</p>
      <p class="text-xs text-gray-400">This app must be opened from within a Cerner EHR session.</p>
    </div>
  </div>
{/if}
