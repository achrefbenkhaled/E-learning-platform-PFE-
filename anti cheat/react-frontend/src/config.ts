/**
 * Anti-cheat API base URL.
 * - Dev (vite): empty string → requests go to `/api/...` on the Vite dev server, which proxies to Express on 3001.
 * - Production build: defaults to http://localhost:3001 unless you set VITE_API_URL (e.g. https://api.yoursite.com).
 */
export const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'http://localhost:3001')
