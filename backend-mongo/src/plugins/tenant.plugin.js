// Global Mongoose plugin that makes every model multi-tenant.
//
//  1. adds `clientId` to the schema
//  2. confines find/update/delete/count/aggregate to the current tenant (utils/tenantContext.js)
//  3. stamps `clientId` on new documents (save / create / insertMany / bulkWrite upserts)
//  4. turns every UNIQUE index into a per-client unique index, so two schools can both have
//     e.g. an academic year "2025-2026" or a subject code "MAT".
//
// Schema options:  tenantExempt: true         -> skip entirely (e.g. the Client collection itself)
//                  tenantGlobalUnique: true   -> keep unique indexes global (User: login ids are looked up
//                                                before the tenant is known)
import mongoose from 'mongoose';
import { getTenantId } from '../utils/tenantContext.js';

const QUERY_OPS = [
  'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace',
  'updateOne', 'updateMany', 'replaceOne', 'deleteOne', 'deleteMany', 'countDocuments', 'distinct',
];

const oid = (id) => new mongoose.Types.ObjectId(id);

/** Rewrites unique indexes to be prefixed with clientId. Exported for tests. */
export function scopeUniqueIndexes(schema) {
  const scoped = [];

  // path-level `unique: true`
  for (const [key, path] of Object.entries(schema.paths)) {
    const idx = path._index;
    if (!idx || typeof idx !== 'object' || !idx.unique) continue;
    const { unique, sparse, ...rest } = idx;
    const options = { ...rest, unique: true };
    if (sparse) options.partialFilterExpression = { [key]: { $exists: true } };
    scoped.push([{ clientId: 1, [key]: 1 }, options]);
    path._index = null;
  }

  // schema.index({...}, { unique: true })
  schema._indexes = schema._indexes.map(([fields, options]) => {
    if (!options?.unique || 'clientId' in fields) return [fields, options];
    const next = { ...options };
    if (next.sparse) {
      delete next.sparse;
      next.partialFilterExpression = {
        ...(next.partialFilterExpression || {}),
        ...Object.fromEntries(Object.keys(fields).map((k) => [k, { $exists: true }])),
      };
    }
    return [{ clientId: 1, ...fields }, next];
  });

  schema._indexes.push(...scoped);
}

export default function tenantPlugin(schema) {
  if (schema.options.tenantExempt) return;

  schema.add({ clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null, index: true } });

  if (!schema.options.tenantGlobalUnique) scopeUniqueIndexes(schema);

  // ── reads / updates / deletes ───────────────────────────────────────────────
  schema.pre(QUERY_OPS, { document: false, query: true }, function tenantQueryScope() {
    const id = getTenantId();
    if (id) this.setQuery({ ...this.getQuery(), clientId: id });
  });

  schema.pre('aggregate', function tenantAggregateScope() {
    const id = getTenantId();
    if (id) this.pipeline().unshift({ $match: { clientId: oid(id) } });
  });

  // ── writes ──────────────────────────────────────────────────────────────────
  schema.pre('validate', function tenantStamp() {
    if (this.isNew && !this.clientId) {
      const id = getTenantId();
      if (id) this.clientId = id;
    }
  });

  // Mongoose passes (docs) — older majors passed (next, docs); accept both.
  schema.pre('insertMany', function tenantInsertMany(...args) {
    const docs = args.find(Array.isArray);
    const id = getTenantId();
    if (!id || !docs) return;
    for (const d of docs) if (d && !d.clientId) d.clientId = id;
  });

  schema.pre('bulkWrite', function tenantBulkWrite(...args) {
    const ops = args.find(Array.isArray);
    const id = getTenantId();
    if (!id || !ops) return;
    for (const op of ops) {
      const [kind, body] = Object.entries(op)[0] || [];
      if (!body) continue;
      if (kind === 'insertOne') body.document = { ...body.document, clientId: id };
      else if (body.filter) body.filter = { ...body.filter, clientId: id };
    }
  });
}
