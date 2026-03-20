<script lang="ts">
  import { vitals } from './store';
  import type { Observation } from './store';

  let selected: Observation | null = null;

  // ─── Display Helpers ────────────────────────────────────────────────────────

  function vitalName(obs: Observation): string {
    return obs.code?.text
      ?? obs.code?.coding?.[0]?.display
      ?? 'Unknown Vital';
  }

  function valueStr(obs: Observation): string {
    if (obs.valueQuantity) {
      return `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`.trim();
    }
    if (obs.component?.length) {
      return obs.component
        .map(c => `${c.valueQuantity?.value ?? '?'} ${c.valueQuantity?.unit ?? ''}`.trim())
        .join(' / ');
    }
    if (obs.valueString) return obs.valueString;
    return '—';
  }

  function formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function loincCode(obs: Observation): string {
    return obs.code?.coding?.find(c => c.system === 'http://loinc.org')?.code ?? '';
  }

  // Map LOINC codes to emoji for quick visual scanning
  const VITAL_ICONS: Record<string, string> = {
    '29463-7': '⚖️',  // Body weight
    '8302-2':  '📏',  // Body height
    '8867-4':  '💓',  // Heart rate
    '55284-4': '🩸',  // Blood pressure
    '8310-5':  '🌡️', // Body temperature
    '59408-5': '🫁',  // O2 saturation
    '9279-1':  '💨',  // Respiratory rate
  };

  function vitalIcon(obs: Observation): string {
    return VITAL_ICONS[loincCode(obs)] ?? '📋';
  }

  function openDetail(obs: Observation) { selected = obs; }
  function closeDetail() { selected = null; }
</script>

<!-- Vitals List -->
<div class="bg-white rounded-2xl shadow-sm border border-gray-100">

  <!-- Card Header -->
  <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
    <div class="flex items-center gap-2">
      <span class="text-xl">❤️</span>
      <h2 class="font-semibold text-gray-800">Vital Signs</h2>
    </div>
    <span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
      {$vitals.length}
    </span>
  </div>

  <!-- List -->
  <ul class="divide-y divide-gray-50">
    {#each $vitals as obs (obs.id)}
      <li>
        <button
          class="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
          onclick={() => openDetail(obs)}
        >
          <span class="text-2xl">{vitalIcon(obs)}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{vitalName(obs)}</p>
            <p class="text-xs text-gray-400">{formatDate(obs.effectiveDateTime)}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-sm font-semibold text-blue-600">{valueStr(obs)}</span>
            <span class="text-gray-300">›</span>
          </div>
        </button>
      </li>
    {:else}
      <li class="px-5 py-10 text-sm text-gray-400 text-center">
        No vitals recorded for this patient.
      </li>
    {/each}
  </ul>
</div>

<!-- Detail Slide-in Panel -->
{#if selected}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/30 z-40" onclick={closeDetail}></div>

  <div class="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">

    <!-- Panel Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b">
      <div class="flex items-center gap-3">
        <span class="text-2xl">{vitalIcon(selected)}</span>
        <h3 class="font-semibold text-gray-800">{vitalName(selected)}</h3>
      </div>
      <button class="text-gray-400 hover:text-gray-600 text-xl" onclick={closeDetail}>✕</button>
    </div>

    <!-- Panel Body -->
    <div class="p-6 flex flex-col gap-2 overflow-y-auto text-sm">

      <div class="flex justify-between py-2 border-b border-gray-50">
        <span class="text-gray-500">Value</span>
        <span class="font-semibold text-gray-800">{valueStr(selected)}</span>
      </div>

      <div class="flex justify-between py-2 border-b border-gray-50">
        <span class="text-gray-500">Date</span>
        <span class="font-medium text-gray-800">{formatDate(selected.effectiveDateTime)}</span>
      </div>

      <div class="flex justify-between py-2 border-b border-gray-50">
        <span class="text-gray-500">Status</span>
        <span class="font-medium text-gray-800 capitalize">{selected.status ?? '—'}</span>
      </div>

      <div class="flex justify-between py-2 border-b border-gray-50">
        <span class="text-gray-500">LOINC</span>
        <span class="font-mono text-xs text-gray-500">{loincCode(selected)}</span>
      </div>

      <!-- BP Components -->
      {#if selected.component?.length}
        <p class="text-gray-500 font-medium mt-3">Components</p>
        {#each selected.component as c}
          <div class="flex justify-between py-2 border-b border-gray-50">
            <span class="text-gray-500">
              {c.code?.text ?? c.code?.coding?.[0]?.display ?? '—'}
            </span>
            <span class="font-medium text-gray-800">
              {c.valueQuantity?.value} {c.valueQuantity?.unit ?? ''}
            </span>
          </div>
        {/each}
      {/if}

    </div>
  </div>
{/if}
