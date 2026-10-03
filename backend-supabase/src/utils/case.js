/**
 * Postgres columns are snake_case; the REST contract (shared with backend-mongo and the frontend)
 * is camelCase with a Mongo-style `_id`. All translation lives here.
 */
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

/** DB row(s) -> API shape. Adds `_id` next to `id`. */
export function toApi(value) {
  if (Array.isArray(value)) return value.map(toApi);
  if (!isPlain(value)) return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) out[camel(k)] = toApi(v);
  if (out.id !== undefined && out._id === undefined) out._id = out.id;
  return out;
}

/** API body -> DB columns. Top-level keys only (jsonb values are stored untouched). */
export function toDb(body, allowed) {
  const out = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (v === undefined) continue;
    const col = snake(k);
    if (allowed && !allowed.includes(col)) continue;
    out[col] = v;
  }
  return out;
}
