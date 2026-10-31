let token = null;
try { token = localStorage.getItem('cl-token'); } catch { /* storage unavailable */ }

export const hasToken = () => Boolean(token);
export function setToken(t) {
  token = t;
  try { if (t) localStorage.setItem('cl-token', t); else localStorage.removeItem('cl-token'); } catch { /* storage unavailable */ }
}

// Returns { ok, status, data } and never throws, so screens can show data.error directly.
export async function api(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  let r;
  try {
    r = await fetch('/api/' + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    return { ok: false, status: 0, data: { error: "Can't reach the server. Start it with npm run dev." } };
  }
  let data = {};
  try { data = await r.json(); } catch { /* empty body */ }
  return { ok: r.ok, status: r.status, data };
}
