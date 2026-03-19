<script lang="ts">
  import { onMount } from 'svelte';
  import { patient, patientId, vitals, needPatientBanner } from './store';
  import { getPatient, getVitals, bundleEntries } from './fhir';
  import { ACCESS_TOKEN_KEY, PATIENT_ID_KEY, NEED_PATIENT_BANNER_KEY } from '../config';
  import { isAuthenticated } from './store';
  import PatientBanner from './PatientBanner.svelte';
  import VitalsList from './VitalsList.svelte';
  import CreateVitalModal from './CreateVitalModal.svelte';

  let loading = true;
  let error = '';
  let showModal = false;

  onMount(async () => {
    const pid = localStorage.getItem(PATIENT_ID_KEY);
    if (!pid) {
      error = 'No patient in context. Please relaunch from the EHR.';
      loading = false;
      return;
    }

    // Restore context from localStorage into stores
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
  });

  async function refreshVitals() {
    const pid = localStorage.getItem(PATIENT_ID_KEY);
    if (!pid) return;
    const bundle = await getVitals(pid);
    vitals.set(bundleEntries(bundle));
  }

  function handleLogout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(PATIENT_ID_KEY);
    localStorage.removeItem(NEED_PATIENT_BANNER_KEY);
    patient.set(null);
    vitals.set([]);
    isAuthenticated.set(false);
  }
</script>

<div class="min-h-screen bg-gray-50">

  <!-- Header -->
  <header class="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="text-2xl">🏥</span>
      <h1 class="font-bold text-gray-900 text-lg">Cerner Vitals</h1>
    </div>
    <button
      onclick={handleLogout}
      class="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      Logout
    </button>
  </header>

  <!-- Conditional Patient Banner -->
  {#if $needPatientBanner}
    <PatientBanner />
  {/if}

  <!-- Body -->
  <main class="p-6 max-w-4xl mx-auto">
    {#if loading}
      <div class="flex flex-col items-center justify-center h-64 gap-4">
        <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p class="text-gray-500 text-sm">Loading patient data…</p>
      </div>

    {:else if error}
      <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center">
        <p class="font-semibold mb-1">Something went wrong</p>
        <p class="text-sm">{error}</p>
        <button
          class="mt-4 px-4 py-2 text-sm bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          onclick={handleLogout}
        >
          Back
        </button>
      </div>

    {:else}
      <VitalsList />
    {/if}
  </main>

  <!-- Floating Add Button -->
  {#if !loading && !error}
    <button
      onclick={() => showModal = true}
      class="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white text-2xl rounded-full shadow-lg transition-colors flex items-center justify-center"
      aria-label="Add vital sign"
    >
      +
    </button>
  {/if}

</div>

<!-- Modal -->
{#if showModal}
  <CreateVitalModal
    onclose={() => showModal = false}
    oncreated={async () => { showModal = false; await refreshVitals(); }}
  />
{/if}
