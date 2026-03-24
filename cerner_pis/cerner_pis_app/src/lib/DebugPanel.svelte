<script lang="ts">
  import { debugVitals, debugLabs, debugMeds, debugPost } from './store';
  import type { DebugEntry } from './store';

  // Active GET sub-tab
  let getTab: 'vitals' | 'labs' | 'meds' = 'vitals';

  // Map each tab to its store value
  $: getEntry = getTab === 'vitals' ? $debugVitals
              : getTab === 'labs'   ? $debugLabs
              :                       $debugMeds;

  // ─── JSON Syntax Highlighter ────────────────────────────────────────────────
  function highlight(data: unknown): string {
    const json = JSON.stringify(data, null, 2);
    // Escape HTML first
    const escaped = json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          if (/:$/.test(match))
            return `<span class="text-sky-300">${match}</span>`;    // key
          return `<span class="text-emerald-300">${match}</span>`;   // string value
        }
        if (/true|false/.test(match))
          return `<span class="text-violet-300">${match}</span>`;    // boolean
        if (/null/.test(match))
          return `<span class="text-red-400">${match}</span>`;       // null
        return `<span class="text-amber-300">${match}</span>`;       // number
      }
    );
  }

  function copyToClipboard(entry: DebugEntry | null) {
    if (!entry) return;
    navigator.clipboard.writeText(JSON.stringify(entry.data, null, 2));
  }

  function formatTs(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
</script>

<!-- ─── Debug Split Screen ───────────────────────────────────────────────────── -->
<div class="flex h-full gap-4">

  <!-- ─── LEFT: GET Responses ──────────────────────────────────────────────── -->
  <div class="flex-1 flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-700 min-w-0">

    <!-- Panel header -->
    <div class="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="text-xs font-mono font-semibold text-slate-300 uppercase tracking-widest">GET Response</span>
      </div>
      {#if getEntry}
        <div class="flex items-center gap-3">
          <span class="text-[10px] font-mono text-slate-500">{formatTs(getEntry.timestamp)}</span>
          <button
            onclick={() => copyToClipboard(getEntry)}
            class="text-[10px] font-medium text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 rounded px-2 py-0.5 transition-colors"
          >
            Copy JSON
          </button>
        </div>
      {/if}
    </div>

    <!-- Sub-tabs: Vitals / Labs / Meds -->
    <div class="flex border-b border-slate-700 shrink-0">
      {#each (['vitals', 'labs', 'meds'] as const) as tab}
        <button
          onclick={() => getTab = tab}
          class="px-4 py-2 text-xs font-medium transition-colors capitalize
            {getTab === tab
              ? 'text-white border-b-2 border-sky-400 bg-slate-800'
              : 'text-slate-500 hover:text-slate-300'}"
        >
          {tab === 'meds' ? 'Medications' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          {#if tab === 'vitals' && $debugVitals}
            <span class="ml-1 text-emerald-400">●</span>
          {:else if tab === 'labs' && $debugLabs}
            <span class="ml-1 text-emerald-400">●</span>
          {:else if tab === 'meds' && $debugMeds}
            <span class="ml-1 text-emerald-400">●</span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- JSON content -->
    <div class="flex-1 overflow-auto p-4">
      {#if getEntry}
        <p class="text-[10px] font-mono text-slate-500 mb-3">{getEntry.label}</p>
        <pre class="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">{@html highlight(getEntry.data)}</pre>
      {:else}
        <div class="h-full flex items-center justify-center text-slate-600 text-sm font-mono">
          No data yet — load the app to trigger a fetch.
        </div>
      {/if}
    </div>
  </div>

  <!-- ─── RIGHT: POST Payload ───────────────────────────────────────────────── -->
  <div class="flex-1 flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-700 min-w-0">

    <!-- Panel header -->
    <div class="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        <span class="text-xs font-mono font-semibold text-slate-300 uppercase tracking-widest">POST Payload</span>
      </div>
      {#if $debugPost}
        <div class="flex items-center gap-3">
          <span class="text-[10px] font-mono text-slate-500">{formatTs($debugPost.timestamp)}</span>
          <button
            onclick={() => copyToClipboard($debugPost)}
            class="text-[10px] font-medium text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 rounded px-2 py-0.5 transition-colors"
          >
            Copy JSON
          </button>
        </div>
      {/if}
    </div>

    <!-- Spacer matching sub-tabs height -->
    <div class="h-[33px] bg-slate-900 border-b border-slate-700 shrink-0 flex items-center px-4">
      {#if $debugPost}
        <span class="text-[10px] font-mono text-slate-500">{$debugPost.label}</span>
      {/if}
    </div>

    <!-- JSON content -->
    <div class="flex-1 overflow-auto p-4">
      {#if $debugPost}
        <pre class="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">{@html highlight($debugPost.data)}</pre>
      {:else}
        <div class="h-full flex items-center justify-center text-slate-600 text-sm font-mono">
          No POST sent yet — submit a vital to see the payload.
        </div>
      {/if}
    </div>
  </div>

</div>
