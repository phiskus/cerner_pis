<script lang="ts">
  import { createVital } from './fhir';
  import { patientId } from './store';
  import { PATIENT_ID_KEY, ENCOUNTER_KEY, USER_KEY } from '../config';

  // ─── Props ──────────────────────────────────────────────────────────────────
  let { onclose, oncreated }: {
    onclose: () => void;
    oncreated: () => void;
  } = $props();

  // ─── Vital Type Config ───────────────────────────────────────────────────────
  const VITAL_TYPES = [
    { label: 'Body Weight',      loinc: '29463-7', display: 'Body weight',             unit: 'kg',   ucum: 'kg',      dual: false },
    { label: 'Body Height',      loinc: '8302-2',  display: 'Body height',             unit: 'cm',   ucum: 'cm',      dual: false },
    { label: 'Heart Rate',       loinc: '8867-4',  display: 'Heart rate',              unit: '/min', ucum: '/min',    dual: false },
    { label: 'Blood Pressure',   loinc: '85354-9', display: 'Blood pressure',          unit: 'mmHg', ucum: 'mm[Hg]', dual: true  },
    { label: 'Body Temperature', loinc: '8331-1',  display: 'Body temperature',        unit: 'Cel',  ucum: 'Cel',     dual: false },
    { label: 'O2 Saturation',    loinc: '703498', display: 'Oxygen saturation',       unit: '%',    ucum: '%',       dual: false },
    { label: 'Respiratory Rate', loinc: '9279-1',  display: 'Respiratory rate',        unit: 'breaths/minute', ucum: 'min',    dual: false },
  ];

  const LOINC_SYSTEM = 'http://loinc.org';
  const UCUM_SYSTEM  = 'http://unitsofmeasure.org';
  const VITAL_CATEGORY = {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }]
  };

  // ─── Form State ──────────────────────────────────────────────────────────────
  let selectedType = $state(VITAL_TYPES[0]);
  let value        = $state('');
  let systolic     = $state('');
  let diastolic    = $state('');
  let effectiveDateTime = $state(new Date().toISOString().slice(0, 16));
  let submitting   = $state(false);
  let error        = $state('');

  // ─── Build FHIR Observation ──────────────────────────────────────────────────
  function buildObservation() {

    const pid = localStorage.getItem(PATIENT_ID_KEY);
    const encounter  = localStorage.getItem(ENCOUNTER_KEY);   // 422 error fix
    const user       = localStorage.getItem(USER_KEY);        // 422 error fix

    const base = {
      resourceType: 'Observation',
      status: 'final',
      category: [VITAL_CATEGORY],
      code: {
        coding: [{ system: LOINC_SYSTEM, code: selectedType.loinc, display: selectedType.display }],
        text: selectedType.display,
      },
      subject: { reference: `Patient/${pid}` },
      encounter:         { reference: `Encounter/${encounter}` },
      effectiveDateTime: new Date(effectiveDateTime).toISOString(),
       performer: [{
          reference: `Practitioner/${user}`,
          extension: [{
            url: 'http://hl7.org/fhir/StructureDefinition/event-performerFunction',
            valueCodeableConcept: {
              coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
              code: 'LA',
              display: 'legal authenticator',
            }],
          text: 'legal authenticator',
        },
      }],
    }],
    
    };

    if (selectedType.dual) {
      return {
        ...base,
        component: [
          {
            code: { coding: [{ system: LOINC_SYSTEM, code: '8480-6', display: 'Systolic blood pressure' }] },
            valueQuantity: { value: parseFloat(systolic), unit: 'mmHg', system: UCUM_SYSTEM, code: 'mm[Hg]' },
          },
          {
            code: { coding: [{ system: LOINC_SYSTEM, code: '8462-4', display: 'Diastolic blood pressure' }] },
            valueQuantity: { value: parseFloat(diastolic), unit: 'mmHg', system: UCUM_SYSTEM, code: 'mm[Hg]' },
          },
        ],
      };
    }

    return {
      ...base,
      valueQuantity: {
        value: parseFloat(value),
        unit: selectedType.unit,
        system: UCUM_SYSTEM,
        code: selectedType.ucum,
      },
    };
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    error = '';
    submitting = true;
    try {
      await createVital(buildObservation());
      oncreated();
    } catch (e: any) {
      error = e?.response?.data?.issue?.[0]?.diagnostics ?? e?.message ?? 'Failed to create vital.';
    } finally {
      submitting = false;
    }
  }

  function resetForm() {
    value = ''; systolic = ''; diastolic = '';
    effectiveDateTime = new Date().toISOString().slice(0, 16);
    error = '';
  }
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-4"
     onclick={onclose}>

  <!-- Modal -->
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md z-50 overflow-hidden"
       onclick={(e) => e.stopPropagation()}>

    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b">
      <h2 class="font-semibold text-gray-800 text-lg">Add Vital Sign</h2>
      <button class="text-gray-400 hover:text-gray-600 text-xl" onclick={onclose}>✕</button>
    </div>

    <!-- Form -->
    <form class="p-6 flex flex-col gap-5" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

      <!-- Vital Type -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-gray-700" for="vital-type">Type</label>
        <select
          id="vital-type"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          bind:value={selectedType}
          onchange={resetForm}
        >
          {#each VITAL_TYPES as type}
            <option value={type}>{type.label}</option>
          {/each}
        </select>
      </div>

      <!-- Value Input — single or dual (BP) -->
      {#if selectedType.dual}
        <div class="flex gap-3">
          <div class="flex flex-col gap-1.5 flex-1">
            <label class="text-sm font-medium text-gray-700" for="systolic">
              Systolic <span class="text-gray-400 font-normal">(mmHg)</span>
            </label>
            <input
              id="systolic"
              type="number"
              bind:value={systolic}
              placeholder="120"
              required
              class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="flex flex-col gap-1.5 flex-1">
            <label class="text-sm font-medium text-gray-700" for="diastolic">
              Diastolic <span class="text-gray-400 font-normal">(mmHg)</span>
            </label>
            <input
              id="diastolic"
              type="number"
              bind:value={diastolic}
              placeholder="80"
              required
              class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

      {:else}
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-700" for="value">
            Value <span class="text-gray-400 font-normal">({selectedType.unit})</span>
          </label>
          <input
            id="value"
            type="number"
            step="any"
            bind:value
            placeholder="Enter value"
            required
            class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      {/if}

      <!-- Date / Time -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-gray-700" for="datetime">Date & Time</label>
        <input
          id="datetime"
          type="datetime-local"
          bind:value={effectiveDateTime}
          required
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Error -->
      {#if error}
        <p class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      {/if}

      <!-- Actions -->
      <div class="flex gap-3 pt-1">
        <button
          type="button"
          onclick={onclose}
          class="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          class="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : 'Save Vital'}
        </button>
      </div>

    </form>

  </div>
</div>
