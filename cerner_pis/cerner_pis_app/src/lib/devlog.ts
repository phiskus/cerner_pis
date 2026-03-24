// ─── Dev Logger ───────────────────────────────────────────────────────────────
// In dev mode  → POSTs to the Vite middleware, which writes to dev.log
// In prod mode → no-op (import.meta.env.DEV is false, tree-shaken out)

export async function devlog(label: string, data: unknown): Promise<void> {
  if (!import.meta.env.DEV) return;
  try {
    await fetch('/dev-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, data }),
    });
  } catch {
    // never crash the app over a log call
  }
}
