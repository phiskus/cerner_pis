<script lang="ts">
  import { medications } from './store';
  import type { MedicationRequest } from './store';
  import { Pill, FileText } from 'lucide-svelte';

  function medName(m: MedicationRequest): string {
    return m.medicationCodeableConcept?.text
      ?? m.medicationCodeableConcept?.coding?.[0]?.display
      ?? 'Unknown Medication';
  }

  function dosageText(m: MedicationRequest): string {
    return m.dosageInstruction?.[0]?.text ?? '—';
  }

  function formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function statusStyle(status?: string): string {
    switch (status) {
      case 'active':     return 'bg-green-100 text-green-700';
      case 'stopped':    return 'bg-red-100 text-red-700';
      case 'on-hold':    return 'bg-yellow-100 text-yellow-700';
      case 'completed':  return 'bg-slate-100 text-slate-500';
      case 'cancelled':  return 'bg-red-50 text-red-400';
      default:           return 'bg-slate-100 text-slate-600';
    }
  }

  // Group by status: active first, then the rest
  $: activeFirst = [
    ...$medications.filter(m => m.status === 'active'),
    ...$medications.filter(m => m.status !== 'active'),
  ];
</script>

<!-- ─── Medications ──────────────────────────────────────────────────────── -->
<section>
  <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
    Medications
  </h2>

  {#if $medications.length === 0}
    <div class="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center text-slate-400 text-sm">
      No medications found for this patient.
    </div>
  {:else}
    <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each activeFirst as med (med.id)}
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
          <!-- Medication name + status -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="text-rose-500 shrink-0"><Pill size={16} strokeWidth={1.5} /></span>
              <p class="font-semibold text-slate-800 text-sm leading-tight truncate">{medName(med)}</p>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 {statusStyle(med.status)}">
              {med.status ?? '—'}
            </span>
          </div>

          <!-- Dosage -->
          {#if dosageText(med) !== '—'}
            <div class="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              <span class="text-slate-400 shrink-0 mt-0.5"><FileText size={13} strokeWidth={1.5} /></span>
              <span>{dosageText(med)}</span>
            </div>
          {/if}

          <!-- Footer: date + prescriber -->
          <div class="flex items-center justify-between text-xs text-slate-400 mt-auto pt-2 border-t border-slate-100">
            <span>Ordered {formatDate(med.authoredOn)}</span>
            {#if med.requester?.display}
              <span class="truncate ml-2 text-right">{med.requester.display}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>
