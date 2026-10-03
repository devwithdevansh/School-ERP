// One-off migration for databases created BEFORE multi-tenancy:
//   1. creates (or reuses) a client and assigns every existing document to it,
//   2. rebuilds indexes so old global unique indexes become per-client ones.
// Safe to re-run. Usage: node src/scripts/migrate-tenancy.js   (env: MONGODB_URI, MIGRATE_CLIENT_NAME, MIGRATE_CLIENT_CODE)
import '../config/tenancy.js';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import { MODULE_IDS } from '../constants/modules.js';

const modelsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'models');
for (const f of fs.readdirSync(modelsDir).filter((n) => n.endsWith('.js'))) await import(pathToFileURL(path.join(modelsDir, f)).href);

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_erp');

const name = process.env.MIGRATE_CLIENT_NAME || 'Default School';
const code = process.env.MIGRATE_CLIENT_CODE || 'default-school';
const client = (await Client.findOne({ code })) || (await Client.create({ name, code, enabledModules: MODULE_IDS }));
console.log(`Assigning legacy data to client "${client.name}" (${client._id})`);

for (const [modelName, Model] of Object.entries(mongoose.models)) {
  if (modelName === 'Client') continue;
  const legacy = { $or: [{ clientId: { $exists: false } }, { clientId: null }] };
  const filter = modelName === 'User' ? { $and: [legacy, { role: { $ne: 'ORG_ADMIN' } }] } : legacy;
  const res = await Model.collection.updateMany(filter, { $set: { clientId: client._id } }); // raw driver: bypasses tenant hooks
  console.log(`  ${modelName}: ${res.modifiedCount} document(s) assigned`);
}

// Drops old indexes (e.g. global unique academic-year name) and creates the per-client ones.
for (const Model of Object.values(mongoose.models)) await Model.syncIndexes();
console.log('Indexes synced.');

await mongoose.disconnect();
