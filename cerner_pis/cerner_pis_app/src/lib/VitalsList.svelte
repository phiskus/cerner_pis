<script lang="ts">
  import { vitals } from './store';
  import type { Observation } from './store';

  // ─── State ──────────────────────────────────────────────────────────────────
  let selectedType: string | null = null;

  // ─── Vital Config ────────────────────────────────────────────────────────────
  // Maps a "canonical label" (matched against obs.code.text) to display config
  const VITAL_CONFIG: Record<string, {
    label: string;
    icon: string;
    color: string;       // border accent + icon bg
    textColor: string;   // value color
    bgColor: string;     // card background
  }> = {
    'Weight Measured': {
      label: 'Weight',
      icon: '⚖️',
      color: 'border-blue-400',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
    },
    'Height/Length Measured': {
      label: 'Height',
      icon: '📏',
      color: 'border-teal-400',
      textColor: 'text-teal-700',
      bgColor: 'bg-teal-50',
    },
    'Body Mass Index Measured': {
      label: 'BMI',
      icon: '🧮',
      color: 'border-indigo-400',
      textColor: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
    },
    'Pulse Sitting': {
      label: 'Heart Rate',
      icon: '💓',
      color: 'border-rose-400',
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-50',
    },
    'Blood pressure': {
      label: 'Blood Pressure',
      icon: '🩺',
      color: 'border-red-400',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
    },
    'Temperature Oral': {
      label: 'Temperature',
      icon: '🌡️',
      color: 'border-orange-400',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
    },
    'Oxygen Saturation': {
      label: 'O₂ Saturation',
      icon: '🫁',
      color: 'border-sky-400',
      textColor: 'text-sky-700',
      bgColor: 'bg-sky-50',
    },
    'Respiratory rate': {
      label: 'Resp. Rate',
      icon: '💨',
      color: 'border-green-400',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
    },
  };

  const DEFAULT_CONFIG = {
    label: 'Vital',
    icon: '📋',
    color: 'border-gray-300',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Returns true only when the observation carries an actual measurable value */
  function hasValue(obs: Observation): boolean {
    if (obs.valueQuantity?.value != null) return true;
    if (obs.valueString)                  return true;
    // For panels (e.g. Blood Pressure): at least one component must have a value
    if (obs.component?.length) {
      return obs.component.some(c => c.valueQuantity?.value != null);
    }
    return false;
  }

  function vitalName(obs: Observation): string {
    return obs.code?.text ?? obs.code?.coding?.[0]?.display ?? 'Unknown Vital';
  }

  function valueStr(obs: Observation): string {
    if (obs.valueQuantity) {
      return `${obs.valueQuantity.value}`;
    }
    if (obs.component?.length) {
      return obs.component
        .map(c => c.valueQuantity?.value ?? '?')
        .join('/');
    }
    if (obs.valueString) return obs.valueString;
    return '—';
  }

  function unitStr(obs: Observation): string {
    if (obs.valueQuantity?.unit) return obs.valueQuantity.unit;
    if (obs.component?.length) {
      const unit = obs.component[0]?.valueQuantity?.unit;
      return unit ?? '';
    }
    return '';
  }

  function formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function formatDateTime(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function loincCode(obs: Observation): string {
    return obs.code?.coding?.find(c => c.system === 'http://loinc.org')?.code ?? '';
  }

  function configFor(obs: Observation) {
    return VITAL_CONFIG[vitalName(obs)] ?? DEFAULT_CONFIG;
  }

  // ─── Latest per type ─────────────────────────────────────────────────────────
  // Returns one entry per unique vital name (the most recent, since vitals are
  // sorted desc by date from the API).
  function latestPerType(list: Observation[]): Observation[] {
    const seen = new Set<string>();
    return list.filter(obs => hasValue(obs)).filter(obs => {
      const name = vitalName(obs);
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  // ─── History panel ───────────────────────────────────────────────────────────
  function historyFor(list: Observation[], typeName: string): Observation[] {
    return list.filter(obs => hasValue(obs) && vitalName(obs) === typeName);
  }

  function openHistory(typeName: string) {
    selectedType = selectedType === typeName ? null : typeName;
  }

  function closeHistory() {
    selectedType = null;
  }
</script>

<!-- ─── Latest Vitals Grid ────────────────────────────────────────────────── -->
<section>
  <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">
    Current Vitals
  </h2>

  {#if $vitals.filter(hasValue).length === 0}
    <div class="bg-white rounded-2xl border border-slate-200 px-6 py-12 text-center text-slate-400 text-sm">
      No vitals recorded for this patient.
    </div>
  {:else}
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {#each latestPerType($vitals) as obs (obs.id)}
        {@const cfg = configFor(obs)}
        <button
          class="relative bg-white rounded-2xl border-l-4 {cfg.color} shadow-sm hover:shadow-md transition-all text-left p-5 flex flex-col gap-2 group"
          onclick={() => openHistory(vitalName(obs))}
        >
          <!-- Icon + label -->
          <div class="flex items-center justify-between">
            <span class="text-2xl leading-none">{cfg.icon}</span>
            <span class="text-[10px] font-semibold uppercase tracking-wide text-slate-400 group-hover:text-slate-600 transition-colors">
              {cfg.label}
            </span>
          </div>

          <!-- Value -->
          <div class="mt-1">
            <span class="text-3xl font-bold {cfg.textColor} leading-none">
              {valueStr(obs)}
            </span>
            {#if unitStr(obs)}
              <span class="text-sm font-medium text-slate-500 ml-1">{unitStr(obs)}</span>
            {/if}
          </div>

          <!-- Date -->
          <p class="text-xs text-slate-400 mt-auto pt-2 border-t border-slate-100">
            {formatDate(obs.effectiveDateTime)}
          </p>

          <!-- History indicator -->
          {#if historyFor($vitals, vitalName(obs)).length > 1}
            <span class="absolute top-3 right-3 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center font-bold">
              {historyFor($vitals, vitalName(obs)).length}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</section>

<!-- ─── Recent Entries Table ─────────────────────────────────────────────── -->
{#if $vitals.filter(hasValue).length > 0}
  <section class="mt-8">
    <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">
      Recent Entries
    </h2>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vital</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Value</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Date &amp; Time</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          {#each $vitals.filter(hasValue).slice(0, 20) as obs (obs.id)}
            {@const cfg = configFor(obs)}
            <tr
              class="hover:bg-slate-50 transition-colors cursor-pointer"
              onclick={() => openHistory(vitalName(obs))}
            >
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <span class="text-base">{cfg.icon}</span>
                  <span class="font-medium text-slate-700">{cfg.label}</span>
                </div>
              </td>
              <td class="px-5 py-3 font-semibold {cfg.textColor}">
                {valueStr(obs)} <span class="font-normal text-slate-400 text-xs">{unitStr(obs)}</span>
              </td>
              <td class="px-5 py-3 text-slate-500 hidden sm:table-cell">{formatDateTime(obs.effectiveDateTime)}</td>
              <td class="px-5 py-3 hidden md:table-cell">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  {obs.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                  {obs.status ?? '—'}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}

<!-- ─── History Slide-in Panel ───────────────────────────────────────────── -->
{#if selectedType}
  {@const panelCfg = VITAL_CONFIG[selectedType] ?? DEFAULT_CONFIG}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-black/30 z-40" onclick={closeHistory}></div>

  <div class="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">

    <!-- Panel Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
      <div class="flex items-center gap-3">
        <span class="text-2xl">{panelCfg.icon}</span>
        <div>
          <p class="font-semibold text-slate-800">{panelCfg.label}</p>
          <p class="text-xs text-slate-400">{historyFor($vitals, selectedType).length} readings</p>
        </div>
      </div>
      <button
        class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
        onclick={closeHistory}
      >✕</button>
    </div>

    <!-- Panel Body — history list -->
    <div class="overflow-y-auto flex-1">
      <ul class="divide-y divide-slate-100">
        {#each historyFor($vitals, selectedType) as obs (obs.id)}
          {@const cfg = configFor(obs)}
          <li class="px-6 py-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xl font-bold {cfg.textColor}">
                  {valueStr(obs)}
                  <span class="text-sm font-normal text-slate-400">{unitStr(obs)}</span>
                </p>
                <p class="text-xs text-slate-400 mt-1">{formatDateTime(obs.effectiveDateTime)}</p>
              </div>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium mt-1
                {obs.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                {obs.status ?? '—'}
              </span>
            </div>

            <!-- BP components -->
            {#if obs.component?.length}
              <div class="mt-2 space-y-1">
                {#each obs.component as c}
                  <div class="flex items-center justify-between text-xs text-slate-500">
                    <span>{c.code?.text ?? c.code?.coding?.[0]?.display ?? '—'}</span>
                    <span class="font-medium text-slate-700">
                      {c.valueQuantity?.value} {c.valueQuantity?.unit ?? ''}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- LOINC -->
            {#if loincCode(obs)}
              <p class="mt-2 text-[10px] text-slate-300 font-mono">LOINC: {loincCode(obs)}</p>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
