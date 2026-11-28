/**
 * enable-new-modules.js
 * ─────────────────────
 * One-off script: adds the 4 "Safety & Wellbeing" modules to every existing
 * Client (school) whose enabledModules list is missing them.
 *
 * Safe to re-run — uses $addToSet so it never duplicates entries.
 *
 * Usage (run from the backend-mongo directory):
 *   node src/scripts/enable-new-modules.js
 *
 * Or against a remote DB:
 *   MONGODB_URI="mongodb+srv://..." node src/scripts/enable-new-modules.js
 */

import '../config/tenancy.js';
import 'dotenv/config';
import mongoose from 'mongoose';
import Client from '../models/Client.js';

const NEW_MODULES = [
  'SAFE_REACH',
  'STUDENT_VOICE',
  'COUNSELING',
  'ACADEMIC_INTELLIGENCE',
];

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_erp';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB:', uri.replace(/\/\/.*@/, '//<credentials>@'));

  const result = await Client.updateMany(
    {},
    { $addToSet: { enabledModules: { $each: NEW_MODULES } } }
  );

  console.log(`✅ Updated ${result.modifiedCount} client(s) — added modules: ${NEW_MODULES.join(', ')}`);

  // Verify
  const clients = await Client.find({}, 'name code enabledModules').lean();
  for (const c of clients) {
    const has = NEW_MODULES.filter(m => c.enabledModules.includes(m));
    console.log(`   ${c.name} (${c.code}): ${has.join(', ')} ✓`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})();
