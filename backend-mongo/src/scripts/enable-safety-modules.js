/**
 * enable-safety-modules.js
 *
 * One-time script to add the 4 "Safety & Wellbeing" modules to every
 * active Client's enabledModules array so the moduleGate middleware
 * stops blocking those routes.
 *
 * Usage:
 *   node src/scripts/enable-safety-modules.js
 *
 * Or against the live/Render DB:
 *   MONGODB_URI="mongodb+srv://..." node src/scripts/enable-safety-modules.js
 */

import mongoose from 'mongoose';
import env from '../config/env.js';

// Import Client directly (tenant-exempt model)
import Client from '../models/Client.js';

const MODULES_TO_ENABLE = [
  'SAFE_REACH',
  'STUDENT_VOICE',
  'COUNSELING',
  'ACADEMIC_INTELLIGENCE',
];

(async () => {
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected to:', env.MONGODB_URI.replace(/:([^@]+)@/, ':***@'));

  // Find all clients
  const clients = await Client.find({}).lean();
  console.log(`📋 Found ${clients.length} client(s)`);

  let updated = 0;
  for (const client of clients) {
    const existing = client.enabledModules || [];
    const toAdd = MODULES_TO_ENABLE.filter((m) => !existing.includes(m));

    if (toAdd.length === 0) {
      console.log(`  ⏭  ${client.name} (${client.code}) — already has all 4 modules`);
      continue;
    }

    await Client.updateOne(
      { _id: client._id },
      { $addToSet: { enabledModules: { $each: toAdd } } }
    );

    console.log(`  ✅ ${client.name} (${client.code}) — enabled: ${toAdd.join(', ')}`);
    updated++;
  }

  console.log(`\n🎉 Done! Updated ${updated} client(s).`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
