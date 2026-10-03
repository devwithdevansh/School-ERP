// Organization-admin operations on clients (schools): onboarding, module licensing, suspension.
// Runs UNSCOPED (an ORG_ADMIN has no tenant); every school-data query below passes clientId explicitly.
import bcrypt from 'bcrypt';
import Client from '../models/Client.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import AppError from '../utils/AppError.js';
import { invalidateClientCache } from '../middlewares/moduleGate.middleware.js';
import { provisionTenantDefaults } from './TenantProvisioningService.js';

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

const toDto = (c, extra = {}) => ({
  _id: String(c._id),
  name: c.name,
  code: c.code,
  status: c.status,
  enabledModules: c.enabledModules,
  contactName: c.contactName,
  contactEmail: c.contactEmail,
  contactPhone: c.contactPhone,
  address: c.address,
  notes: c.notes,
  createdAt: c.createdAt,
  ...extra,
});

async function usage(clientId) {
  const [users, students] = await Promise.all([
    User.countDocuments({ clientId, role: { $ne: 'ORG_ADMIN' } }),
    Student.countDocuments({ clientId, isActive: true }),
  ]);
  return { userCount: users, studentCount: students };
}

const PROFILE_FIELDS = ['name', 'contactName', 'contactEmail', 'contactPhone', 'address', 'notes'];

class ClientService {
  static async list() {
    const clients = await Client.find().sort({ createdAt: -1 }).lean();
    return Promise.all(clients.map(async (c) => toDto(c, await usage(c._id))));
  }

  static async get(id) {
    const c = await Client.findById(id).lean();
    if (!c) throw new AppError('Client not found', 404);
    const admins = await User.find({ clientId: c._id, role: 'ADMIN' }).select('name email contactNo1 isActive lastLogin').lean();
    return toDto(c, { ...(await usage(c._id)), admins });
  }

  /** Creates the client, its first school ADMIN login and default academic year / fee categories. */
  static async create({ name, code, enabledModules, admin, ...profile }) {
    const finalCode = code || slugify(name);
    if (await Client.exists({ code: finalCode })) throw new AppError(`Client code "${finalCode}" is already taken`, 409);
    const adminEmail = admin.email.toLowerCase().trim();
    if (await User.exists({ email: adminEmail })) throw new AppError('That admin email is already used by another account', 409);

    const client = await Client.create({ name, code: finalCode, enabledModules, ...profile });
    try {
      await User.create({
        name: admin.name,
        email: adminEmail,
        passwordHash: await bcrypt.hash(admin.password, 12),
        role: 'ADMIN',
        clientId: client._id,
      });
      await provisionTenantDefaults(client._id);
    } catch (err) {
      // best-effort rollback so a failed onboarding does not leave a half-created school behind
      await User.deleteMany({ clientId: client._id });
      await Client.deleteOne({ _id: client._id });
      throw err;
    }
    return ClientService.get(client._id);
  }

  static async update(id, patch) {
    const client = await Client.findById(id);
    if (!client) throw new AppError('Client not found', 404);
    for (const f of PROFILE_FIELDS) if (patch[f] !== undefined) client[f] = patch[f];
    if (patch.status) client.status = patch.status;
    if (patch.enabledModules) client.enabledModules = patch.enabledModules;
    await client.save();
    invalidateClientCache(id);
    return ClientService.get(id);
  }

  /** Sets a new password for one of the client's school admins (defaults to the oldest admin). */
  static async resetAdminPassword(id, { adminId, password }) {
    const filter = { clientId: id, role: 'ADMIN', ...(adminId ? { _id: adminId } : {}) };
    const admin = await User.findOne(filter).sort({ createdAt: 1 });
    if (!admin) throw new AppError('No matching school admin found', 404);
    admin.passwordHash = await bcrypt.hash(password, 12);
    admin.refreshTokens = []; // sign the admin out everywhere
    await admin.save();
    return { _id: String(admin._id), email: admin.email };
  }
}

export default ClientService;
