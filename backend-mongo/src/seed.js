// Creates: the platform owner (ORG_ADMIN), a first client (school) with all modules enabled, that school's
// admin login, its current academic year and system fee categories.
// Idempotent and NON-destructive: existing rows are left untouched.   Usage: npm run seed
import './config/tenancy.js';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from './models/User.js';
import Client from './models/Client.js';
import { provisionTenantDefaults } from './services/TenantProvisioningService.js';
import { MODULE_IDS } from './constants/modules.js';

const orgEmail = (process.env.SEED_ORG_EMAIL || 'org@platform.local').toLowerCase();
const orgPassword = process.env.SEED_ORG_PASSWORD || 'ChangeMe@123';
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@school.local').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123';
const schoolName = process.env.SEED_SCHOOL_NAME || process.env.VITE_SCHOOL_NAME || 'Demo School';
const schoolCode = process.env.SEED_SCHOOL_CODE || 'demo-school';

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_erp');

if (await User.findOne({ email: orgEmail })) {
  console.log(`Organization admin ${orgEmail} already exists.`);
} else {
  await User.create({ name: 'Organization Admin', email: orgEmail, passwordHash: await bcrypt.hash(orgPassword, 12), role: 'ORG_ADMIN' });
  console.log(`Created organization admin ${orgEmail} / ${orgPassword}  (change this password!)`);
}

let client = await Client.findOne({ code: schoolCode });
if (!client) {
  client = await Client.create({ name: schoolName, code: schoolCode, enabledModules: MODULE_IDS });
  console.log(`Created client "${schoolName}" (${schoolCode}) with modules: ${MODULE_IDS.join(', ')}`);
}

if (await User.findOne({ email })) {
  console.log(`School admin ${email} already exists.`);
} else {
  await User.create({ name: 'Administrator', email, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN', clientId: client._id });
  console.log(`Created school admin ${email} / ${password}  (change this password!)`);
}

await provisionTenantDefaults(client._id);

console.log('Done.');
await mongoose.disconnect();
