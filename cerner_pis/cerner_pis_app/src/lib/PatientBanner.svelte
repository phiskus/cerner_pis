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
    // Cerner uses identifier.type.coding[].code === 'MR' (HL7 v2 table 0203)
    // rather than encoding the type in the system URL
    const id = p?.identifier?.find(
      i => i.type?.coding?.some(c => c.code === 'MR')
    );
    return id?.value ?? '—';
  }
</script>

<div class="bg-blue-700 text-white px-6 py-4">
  <div class="max-w-4xl mx-auto flex items-center gap-5">

    <!-- Avatar -->
    <div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-lg shrink-0">
      {initials($patient)}
    </div>

    <!-- Demographics -->
    <div class="flex flex-wrap gap-x-8 gap-y-1">
      <div>
        <p class="text-xs text-blue-200 uppercase tracking-wide">Patient</p>
        <p class="font-semibold text-base">{fullName($patient)}</p>
      </div>
      <div>
        <p class="text-xs text-blue-200 uppercase tracking-wide">DOB</p>
        <p class="font-medium">{$patient?.birthDate ?? '—'} <span class="text-blue-300 text-sm">({age($patient?.birthDate)})</span></p>
      </div>
      <div>
        <p class="text-xs text-blue-200 uppercase tracking-wide">Gender</p>
        <p class="font-medium capitalize">{$patient?.gender ?? '—'}</p>
      </div>
      <div>
        <p class="text-xs text-blue-200 uppercase tracking-wide">MRN</p>
        <p class="font-medium">{mrn($patient)}</p>
      </div>
    </div>

  </div>
</div>
