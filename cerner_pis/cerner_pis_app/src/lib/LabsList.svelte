<script lang="ts">
  import { labs } from './store';
  import type { DiagnosticReport } from './store';
  import { FlaskConical, ChevronRight } from 'lucide-svelte';

  let expanded: string | null = null;

  function reportName(r: DiagnosticReport): string {
    return r.code?.text ?? r.code?.coding?.[0]?.display ?? 'Unknown Report';
  }

  function categoryLabel(r: DiagnosticReport): string {
    return r.category?.[0]?.text
      ?? r.category?.[0]?.coding?.[0]?.display
      ?? '';
  }

  function formatDateTime(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function statusStyle(status?: string): string {
    switch (status) {
      case 'final':        return 'bg-green-100 text-green-700';
      case 'preliminary':  return 'bg-yellow-100 text-yellow-700';
      case 'amended':      return 'bg-blue-100 text-blue-700';
      case 'cancelled':    return 'bg-red-100 text-red-700';
      default:             return 'bg-slate-100 text-slate-600';
    }
  }

  function toggle(id?: string) {
    expanded = expanded === id ? null : (id ?? null);
  }
</script>

<!-- ─── Lab Reports ──────────────────────────────────────────────────────── -->
<section>
  <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
    Lab Reports
  </h2>

  {#if $labs.length === 0}
    <div class="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center text-slate-400 text-sm">
      No lab reports found for this patient.
    </div>
  {:else}
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50">
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Report</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Date</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          {#each $labs as report (report.id)}
            <tr
              class="hover:bg-slate-50 transition-colors cursor-pointer"
              onclick={() => toggle(report.id)}
            >
              <td class="px-5 py-3">
                <div class="flex items-center gap-2.5">
                  <span class="text-violet-500"><FlaskConical size={15} strokeWidth={1.5} /></span>
                  <span class="font-medium text-slate-700">{reportName(report)}</span>
                </div>
              </td>
              <td class="px-5 py-3 text-slate-500 hidden sm:table-cell text-xs">
                {categoryLabel(report) || '—'}
              </td>
              <td class="px-5 py-3 text-slate-500 hidden md:table-cell">
                {formatDateTime(report.effectiveDateTime ?? report.issued)}
              </td>
              <td class="px-5 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {statusStyle(report.status)}">
                  {report.status ?? '—'}
                </span>
              </td>
            </tr>

            <!-- Expanded row: result references -->
            {#if expanded === report.id && report.result?.length}
              <tr>
                <td colspan="4" class="px-5 pb-4 pt-1 bg-slate-50">
                  <p class="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Results</p>
                  <ul class="space-y-1">
                    {#each report.result as res}
                      <li class="text-sm text-slate-600 flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0"></span>
                        {res.display ?? res.reference ?? '—'}
                      </li>
                    {/each}
                  </ul>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
