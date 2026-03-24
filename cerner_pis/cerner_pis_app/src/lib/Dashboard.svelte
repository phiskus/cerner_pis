<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    patient, patientId, vitals, labs, medications,
    needPatientBanner, isAuthenticated, sessionExpired,
  } from './store';
  import type { Observation, DiagnosticReport, MedicationRequest } from './store';
  import { getPatient, getVitals, getLabs, getMedications, bundleEntries } from './fhir';
  import { ACCESS_TOKEN_KEY, PATIENT_ID_KEY, NEED_PATIENT_BANNER_KEY } from '../config';
  import PatientBanner from './PatientBanner.svelte';
  import VitalsList from './VitalsList.svelte';
  import LabsList from './LabsList.svelte';
  import MedicationsList from './MedicationsList.svelte';
  import CreateVitalModal from './CreateVitalModal.svelte';
  import DebugPanel from './DebugPanel.svelte';
  import {
    Activity, FlaskConical, Pill, Plus, LogOut,
    AlertTriangle, ShieldAlert, AlertCircle, Bug,
  } from 'lucide-svelte';
  // ─── UI state ─────────────────────────────────────────────────────────────
  type View = 'vitals' | 'labs' | 'medications' | 'debug';
  let activeView: View = 'vitals';

  let loading       = true;
  let error         = '';
  let labError      = '';
  let medError      = '';
  let showModal     = false;
  let expiryWarning = false;
  let expiryInterval: ReturnType<typeof setInterval>;

  // ─── Token expiry monitor ─────────────────────────────────────────────────
  function startExpiryMonitor() {
    expiryInterval = setInterval(() => {
      const expiry    = parseInt(localStorage.getItem('smart_token_expiry') ?? '0');
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        clearInterval(expiryInterval);
        sessionExpired.set(true);
      } else if (remaining < 3 * 60 * 1000) {
        expiryWarning = true;
      }
    }, 15_000);
  }

  onDestroy(() => clearInterval(expiryInterval));

  // ─── Data loading ─────────────────────────────────────────────────────────
  onMount(async () => {
    const pid = localStorage.getItem(PATIENT_ID_KEY);
    if (!pid) {
      error = 'No patient in context. Please relaunch from the EHR.';
      loading = false;
      return;
    }

    patientId.set(pid);
    needPatientBanner.set(localStorage.getItem(NEED_PATIENT_BANNER_KEY) === 'true');

    const [patientRes, vitalsRes, labsRes, medsRes] = await Promise.allSettled([
      getPatient(pid),
      getVitals(pid),
      getLabs(pid),
      getMedications(pid),
    ]);

    if (patientRes.status === 'fulfilled') {
      patient.set(patientRes.value);
    } else {
      error = (patientRes.reason as any)?.response?.data?.issue?.[0]?.diagnostics
        ?? (patientRes.reason as any)?.message
        ?? 'Failed to load patient data.';
    }

    if (vitalsRes.status === 'fulfilled') {
      vitals.set(bundleEntries(vitalsRes.value));
    } else if (!error) {
      error = (vitalsRes.reason as any)?.message ?? 'Failed to load vitals.';
    }

    if (labsRes.status === 'fulfilled') {
      labs.set(bundleEntries(labsRes.value));
    } else {
      labError = 'Labs unavailable — scope may not be granted in this session.';
    }

    if (medsRes.status === 'fulfilled') {
      medications.set(bundleEntries(medsRes.value));
    } else {
      medError = 'Medications unavailable — scope may not be granted in this session.';
    }

    loading = false;
    startExpiryMonitor();
  });

  // ─── Actions ──────────────────────────────────────────────────────────────
  async function refreshVitals() {
    const pid = localStorage.getItem(PATIENT_ID_KEY);
    if (!pid) return;
    vitals.set(bundleEntries(await getVitals(pid)));
  }

  function handleLogout() {
    localStorage.clear();
    patient.set(null);
    vitals.set([]);
    labs.set([]);
    medications.set([]);
    isAuthenticated.set(false);
  }

  // ─── Summary card helpers ─────────────────────────────────────────────────
  function latestVital(list: Observation[]): Observation | null {
    return list.find(o =>
      o.valueQuantity?.value != null ||
      o.component?.some(c => c.valueQuantity?.value != null)
    ) ?? null;
  }

  function vitalValueStr(obs: Observation | null): string {
    if (!obs) return '—';
    if (obs.valueQuantity?.value != null)
      return `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`.trim();
    if (obs.component?.length)
      return obs.component.map(c => c.valueQuantity?.value ?? '?').join('/');
    return '—';
  }

  function latestLab(list: DiagnosticReport[]): DiagnosticReport | null  { return list[0] ?? null; }
  function latestMed(list: MedicationRequest[]): MedicationRequest | null {
    return list.find(m => m.status === 'active') ?? list[0] ?? null;
  }

  function shortDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ─── Sidebar nav config ───────────────────────────────────────────────────
  const NAV: { id: View; label: string; Icon: any; separator?: boolean }[] = [
    { id: 'vitals',      label: 'Vitals',      Icon: Activity     },
    { id: 'labs',        label: 'Labs',         Icon: FlaskConical },
    { id: 'medications', label: 'Medications',  Icon: Pill         },
    { id: 'debug',       label: 'Debugging',    Icon: Bug,          separator: true },
  ];
</script>

<div class="min-h-screen bg-[#f4f6f9] flex flex-col">

  <!-- ─── App Header ──────────────────────────────────────────────────────── -->
  <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-10">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-teal-500 rounded-lg flex items-center justify-center shrink-0 text-white">
        <Activity size={18} strokeWidth={1.5} />
      </div>
      <div>
        <h1 class="font-bold text-slate-800 text-base leading-tight">Clinical Monitor</h1>
        <p class="text-slate-400 text-xs">Oracle Health · Cerner Millennium</p>
      </div>
    </div>
    <button
      onclick={handleLogout}
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
    >
      <LogOut size={13} strokeWidth={1.5} />
      End Session
    </button>
  </header>

  <!-- ─── Patient Banner ─────────────────────────────────────────────────── -->
  {#if $needPatientBanner}
    <PatientBanner />
  {/if}

  <!-- ─── Expiry Warning ─────────────────────────────────────────────────── -->
  {#if expiryWarning && !$sessionExpired}
    <div class="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2.5">
      <AlertTriangle size={15} strokeWidth={1.5} class="text-amber-500 shrink-0" />
      <span class="text-amber-800 text-sm font-medium">Session expiring soon.</span>
      <span class="text-amber-600 text-sm">Save your work and relaunch from the EHR.</span>
    </div>
  {/if}

  <!-- ─── Body: Sidebar + Main ────────────────────────────────────────────── -->
  <div class="flex flex-1 overflow-hidden">

    <!-- Sidebar -->
    <aside class="w-52 bg-white border-r border-slate-200 flex flex-col py-6 gap-1 shrink-0">
      <p class="px-5 pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Sections
      </p>
      {#each NAV as nav}
        {#if nav.separator}
          <div class="mx-4 my-3 border-t border-slate-200"></div>
        {/if}
        <button
          onclick={() => activeView = nav.id}
          class="mx-3 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
            {activeView === nav.id
              ? nav.id === 'debug'
                ? 'bg-slate-800 text-amber-400'
                : 'bg-teal-50 text-teal-700'
              : nav.id === 'debug'
                ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}"
        >
          <svelte:component this={nav.Icon} size={16} strokeWidth={1.5} />
          <span>{nav.label}</span>
          {#if nav.id === 'labs' && $labs.length > 0}
            <span class="ml-auto text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 font-semibold">{$labs.length}</span>
          {/if}
          {#if nav.id === 'medications' && $medications.length > 0}
            <span class="ml-auto text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 font-semibold">{$medications.length}</span>
          {/if}
        </button>
      {/each}
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-6 overflow-y-auto">

      {#if loading}
        <div class="flex flex-col items-center justify-center h-64 gap-4">
          <div class="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
          <p class="text-slate-500 text-sm font-medium">Loading patient data…</p>
        </div>

      {:else if error}
        <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center max-w-lg mx-auto">
          <div class="flex justify-center mb-2">
            <AlertCircle size={32} strokeWidth={1.5} class="text-red-400" />
          </div>
          <p class="font-semibold mb-1">Unable to Load Patient Data</p>
          <p class="text-sm text-red-600">{error}</p>
          <button
            class="mt-4 px-4 py-2 text-sm bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
            onclick={handleLogout}
          >Return to Login</button>
        </div>

      {:else}
        <!-- ─── Summary Cards ───────────────────────────────────────────── -->
        <div class="grid grid-cols-3 gap-4 mb-8">

          <button
            onclick={() => activeView = 'vitals'}
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-left hover:shadow-md transition-shadow
              {activeView === 'vitals' ? 'ring-2 ring-teal-400' : ''}"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Latest Vital</span>
              <span class="text-teal-500"><Activity size={16} strokeWidth={1.5} /></span>
            </div>
            {#if latestVital($vitals)}
              {@const lv = latestVital($vitals)!}
              <p class="text-lg font-bold text-slate-800 leading-tight">{vitalValueStr(lv)}</p>
              <p class="text-xs text-slate-400 mt-1 truncate">{lv.code?.text ?? '—'}</p>
              <p class="text-xs text-slate-300 mt-0.5">{shortDate(lv.effectiveDateTime)}</p>
            {:else}
              <p class="text-sm text-slate-400">No vitals recorded</p>
            {/if}
          </button>

          <button
            onclick={() => activeView = 'labs'}
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-left hover:shadow-md transition-shadow
              {activeView === 'labs' ? 'ring-2 ring-teal-400' : ''}"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Latest Lab</span>
              <span class="text-violet-500"><FlaskConical size={16} strokeWidth={1.5} /></span>
            </div>
            {#if labError}
              <p class="text-xs text-amber-500">Scope not granted</p>
            {:else if latestLab($labs)}
              {@const ll = latestLab($labs)!}
              <p class="text-sm font-bold text-slate-800 leading-tight line-clamp-2">
                {ll.code?.text ?? ll.code?.coding?.[0]?.display ?? '—'}
              </p>
              <p class="text-xs text-slate-400 mt-1">{shortDate(ll.effectiveDateTime ?? ll.issued)}</p>
              <span class="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium
                {ll.status === 'final' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
                {ll.status ?? '—'}
              </span>
            {:else}
              <p class="text-sm text-slate-400">No lab reports</p>
            {/if}
          </button>

          <button
            onclick={() => activeView = 'medications'}
            class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-left hover:shadow-md transition-shadow
              {activeView === 'medications' ? 'ring-2 ring-teal-400' : ''}"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-slate-400 uppercase tracking-widest">Latest Medication</span>
              <span class="text-rose-500"><Pill size={16} strokeWidth={1.5} /></span>
            </div>
            {#if medError}
              <p class="text-xs text-amber-500">Scope not granted</p>
            {:else if latestMed($medications)}
              {@const lm = latestMed($medications)!}
              <p class="text-sm font-bold text-slate-800 leading-tight line-clamp-2">
                {lm.medicationCodeableConcept?.text ?? lm.medicationCodeableConcept?.coding?.[0]?.display ?? '—'}
              </p>
              <p class="text-xs text-slate-400 mt-1">{shortDate(lm.authoredOn)}</p>
              <span class="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium
                {lm.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                {lm.status ?? '—'}
              </span>
            {:else}
              <p class="text-sm text-slate-400">No medications</p>
            {/if}
          </button>

        </div>

        <!-- ─── Section error banners ──────────────────────────────────── -->
        {#if labError && activeView === 'labs'}
          <div class="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            <AlertTriangle size={15} strokeWidth={1.5} class="shrink-0" />
            {labError}
          </div>
        {/if}
        {#if medError && activeView === 'medications'}
          <div class="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            <AlertTriangle size={15} strokeWidth={1.5} class="shrink-0" />
            {medError}
          </div>
        {/if}

        <!-- ─── Active section ─────────────────────────────────────────── -->
        {#if activeView === 'vitals'}
          <VitalsList />
        {:else if activeView === 'labs'}
          <LabsList />
        {:else if activeView === 'medications'}
          <MedicationsList />
        {:else if activeView === 'debug'}
          <div class="h-[calc(100vh-260px)]">
            <DebugPanel />
          </div>
        {/if}

      {/if}
    </main>
  </div>

  <!-- ─── Record Vital FAB ──────────────────────────────────────────────── -->
  {#if activeView === 'vitals' && !loading && !error}
    <button
      onclick={() => showModal = true}
      class="fixed bottom-8 right-8 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl transition-colors z-30"
    >
      <Plus size={16} strokeWidth={2} />
      Record Vital
    </button>
  {/if}

</div>

<!-- ─── Create Vital Modal ────────────────────────────────────────────────── -->
{#if showModal}
  <CreateVitalModal
    onclose={() => showModal = false}
    oncreated={async () => { showModal = false; await refreshVitals(); }}
  />
{/if}

<!-- ─── Session Expired Overlay ───────────────────────────────────────────── -->
{#if $sessionExpired}
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center gap-4 text-center">
      <div class="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
        <ShieldAlert size={26} strokeWidth={1.5} class="text-red-500" />
      </div>
      <div>
        <h2 class="text-base font-bold text-slate-800">Session Expired</h2>
        <p class="text-sm text-slate-500 mt-1">
          Your Cerner session has timed out. Cerner does not support token refresh —
          relaunch the app from within the EHR to continue.
        </p>
      </div>
      <div class="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-500 text-left">
        <p class="font-semibold text-slate-700 mb-1">How to continue:</p>
        <ol class="list-decimal list-inside space-y-1">
          <li>Go back to your Cerner EHR tab</li>
          <li>Reopen Clinical Monitor from the patient chart</li>
        </ol>
      </div>
    </div>
  </div>
{/if}
