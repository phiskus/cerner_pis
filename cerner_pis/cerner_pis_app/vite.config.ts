import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { appendFileSync } from 'fs'

// ─── Dev Logger Plugin ────────────────────────────────────────────────────────
// Exposes POST /dev-log during `npm run dev`.
// The browser sends { label, data } → this middleware appends it to dev.log.
// Has zero effect in production builds.
function devLoggerPlugin() {
  return {
    name: 'dev-logger',
    configureServer(server: any) {
      server.middlewares.use('/dev-log', (req: any, res: any, next: any) => {
        if (req.method !== 'POST') { next(); return; }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          try {
            const { label, data } = JSON.parse(body);
            const line = [
              `\n${'─'.repeat(72)}`,
              `[${new Date().toISOString()}]  ${label}`,
              `${'─'.repeat(72)}`,
              JSON.stringify(data, null, 2),
            ].join('\n');
            appendFileSync('dev.log', line + '\n');
          } catch {
            // malformed payload — ignore
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [svelte(), devLoggerPlugin()],
})
