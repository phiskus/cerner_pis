<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { patient, patientId, vitals, needPatientBanner, isAuthenticated, sessionExpired } from './store';
  import { getPatient, getVitals, bundleEntries } from './fhir';
  import { ACCESS_TOKEN_KEY, PATIENT_ID_KEY, NEED_PATIENT_BANNER_KEY } from '../config';
  import PatientBanner from './PatientBanner.svelte';
  import VitalsList from './VitalsList.svelte';
  import CreateVitalModal from './CreateVitalModal.svelte';

  let loading = true;
  let error = '';
  let showModal = false;
  let expiryWarning = false;
  let expiryInterval: ReturnType<typeof setInterval>;

  // ─── Token expiry monitor ─────────────────────────────────────────────────
  function startExpiryMonitor() {
    expiryInterval = setInterval(() => {
      const expiry = parseInt(localStorage.getItem('smart_token_expiry') ?? '0');
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        clearInterval(expiryInterval);
        sessionExpired.set(true);
      } else if (remaining < 2 * 60 * 1000) {
        // Less than 2 minutes left
        expiryWarning = true;
      }
    }, 30_000); // check every 30 seconds
  }

  onDestroy(() => clearInterval(expiryInterval));

  onMount(async () => {
    const pid = localStorage.getItem(PATIENT_ID_KEY);
    if (!pid) {
      error = 'No patient in context. Please relaunch from the EHR.';
      loading = false;
      return;
    }

    patientId.set(pid);
    needPatientBanner.set(localStorage.getItem(NEED_PATIENT_BANNER_KEY) === 'true');

    try {
      const [p, bundle] = await Promise.all([
        getPatient(pid),
        getVitals(pid),
      ]);
      patient.set(p);
      vitals.set(bundleEntries(bundle));
    } catch (e: any) {
      error = e?.response?.data?.issue?.[0]?.diagnostics ?? e?.message ?? 'Failed to load patient data.';
    } finally {
      loading = false;
    }

    startExpiryMonitor();
  });

  async function refreshVitals() {
    const pid = localStorage.getItem(PATIENT_ID_KEY);
    if (!pid) return;
    const bundle = await getVitals(pid);
    vitals.set(bundleEntries(bundle));
  }

  function handleLogout() {
    localStorage.clear();
    patient.set(null);
    vitals.set([]);
    isAuthenticated.set(false);
  }
</script>

<div class="min-h-screen bg-slate-100">

  <!-- Header -->
  <header class="bg-[#0d2137] text-white px-6 py-3 flex items-center justify-between shadow-lg">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <div>
        <h1 class="font-bold text-white text-base leading-tight">Vitals Monitor</h1>
        <p class="text-blue-300 text-xs">Oracle Health · Cerner Millennium</p>
      </div>
    </div>
    <button
      onclick={handleLogout}
      class="px-3 py-1.5 text-xs text-blue-200 border border-blue-700 rounded-lg hover:bg-blue-900 transition-colors"
    >
      End Session
    </button>
  </header>

  <!-- Patient Banner -->
  {#if $needPatientBanner}
    <PatientBanner />
  {/if}

  <!-- Session expiry warning (< 2 min remaining) -->
  {#if expiryWarning && !$sessionExpired}
    <div class="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-amber-800 text-sm">
        <span>⚠️</span>
        <span class="font-medium">Your session is about to expire.</span>
        <span class="text-amber-600">Save your work — you will need to relaunch from the EHR to continue.</span>
      </div>
    </div>
  {/if}

  <!-- Body -->
  <main class="p-6 max-w-7xl mx-auto">
    {#if loading}
      <div class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p class="text-slate-500 text-sm font-medium">Loading patient vitals…</p>
      </div>

    {:else if error}
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center max-w-lg mx-auto">
        <div class="text-3xl mb-2">⚠️</div>
        <p class="font-semibold mb-1">Unable to Load Patient Data</p>
        <p class="text-sm text-red-600">{error}</p>
        <button
          class="mt-4 px-4 py-2 text-sm bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          onclick={handleLogout}
        >
          Return to Login
        </button>
      </div>

    {:else}
      <VitalsList />
    {/if}
  </main>

  <!-- Record Vital Button -->
  {#if !loading && !error}
    <button
      onclick={() => showModal = true}
      class="fixed bottom-8 right-8 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Record Vital
    </button>
  {/if}

</div>

{#if showModal}
  <CreateVitalModal
    onclose={() => showModal = false}
    oncreated={async () => { showModal = false; await refreshVitals(); }}
  />
{/if}

<!-- Session Expired Overlay -->
{#if $sessionExpired}
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center gap-4 text-center">
      <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">🔒</div>
      <div>
        <h2 class="text-lg font-bold text-slate-800">Session Expired</h2>
        <p class="text-sm text-slate-500 mt-1">
          Your Cerner session has timed out after inactivity.
          Cerner does not support token refresh — you need to relaunch the app from within the EHR.
        </p>
      </div>
      <div class="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-500 text-left">
        <p class="font-semibold text-slate-700 mb-1">How to continue:</p>
        <ol class="list-decimal list-inside space-y-1">
          <li>Go back to your Cerner EHR tab</li>
          <li>Reopen the Vitals Monitor app from the patient chart</li>
        </ol>
      </div>
    </div>
  </div>
{/if}
