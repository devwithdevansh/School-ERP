import supabase from '../config/supabase.js';
import { unwrap } from './http.js';

const PAGE = 1000; // PostgREST default max-rows

/**
 * Fetch every row of a query, paging past PostgREST's 1000-row cap.
 * `build` receives a fresh query builder each page: (q) => q.eq('is_active', true).order('created_at')
 */
export async function selectAll(table, columns, build = (q) => q, max = 100000) {
  const rows = [];
  for (let from = 0; from < max; from += PAGE) {
    const q = build(supabase.from(table).select(columns)).range(from, from + PAGE - 1);
    const page = unwrap(await q);
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

/** Split an array into chunks (for `.in()` filters, which are limited by URL length). */
export function chunk(arr, size = 150) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
