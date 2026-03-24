<script lang="ts">
  import { patient } from './store';
  import type { Patient } from './store';

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function fullName(p: Patient | null): string {
    if (!p?.name?.[0]) return 'Unknown Patient';
    const n = p.name[0];
    return [...(n.given ?? []), n.family].filter(Boolean).join(' ');
  }

  function initials(p: Patient | null): string {
    if (!p?.name?.[0]) return '?';
    const n = p.name[0];
    const first = n.given?.[0]?.[0] ?? '';
    const last  = n.family?.[0] ?? '';
    return (first + last).toUpperCase();
  }

  function age(birthDate?: string): string {
    if (!birthDate) return '—';
    const diff = Date.now() - new Date(birthDate).getTime();
    return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
  }

  function mrn(p: Patient | null): string {
    if (!p?.identifier?.length) return '—';
    // Primary: HL7 v2 table 0203 type code 'MR' (standard Cerner format)
    const byType = p.identifier.find(
      i => i.type?.coding?.some(c => c.code === 'MR')
    );
    if (byType?.value) return byType.value;
    // Fallback: identifier marked as 'usual' use
    const byUse = p.identifier.find(i => i.use === 'usual');
    if (byUse?.value) return byUse.value;
    // Last resort: first identifier with a value (show with asterisk so it's obvious it's a fallback)
    const first = p.identifier.find(i => i.value);
    return first ? `${first.value}*` : '—';
  }
</script>

<div class="bg-slate-50 border-b border-slate-200 px-6 py-3">
  <div class="flex items-center gap-4">

    <!-- Avatar -->
    <div class="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center font-bold text-sm text-white shrink-0">
      {initials($patient)}
    </div>

    <!-- Demographics -->
    <div class="flex flex-wrap gap-x-8 gap-y-0.5">
      <div>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest">Patient</p>
        <p class="font-semibold text-sm text-slate-800">{fullName($patient)}</p>
      </div>
      <div>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest">DOB</p>
        <p class="font-medium text-sm text-slate-700">{$patient?.birthDate ?? '—'} <span class="text-slate-400 text-xs">({age($patient?.birthDate)})</span></p>
      </div>
      <div>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest">Gender</p>
        <p class="font-medium text-sm text-slate-700 capitalize">{$patient?.gender ?? '—'}</p>
      </div>
      <div>
        <p class="text-[10px] text-slate-400 uppercase tracking-widest">MRN</p>
        <p class="font-medium text-sm text-slate-700">{mrn($patient)}</p>
      </div>
    </div>

  </div>
</div>
