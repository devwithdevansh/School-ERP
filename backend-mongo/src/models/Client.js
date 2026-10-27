import mongoose from 'mongoose';
import { MODULE_IDS, CLIENT_STATUSES } from '../constants/modules.js';

// A client = one school (tenant). Managed only by ORG_ADMIN users.
// Exempt from the tenant plugin: it IS the tenant registry.
const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Client name is required'], trim: true, maxlength: 120 },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, 'Code must be 3-40 chars: lowercase letters, digits, hyphens'],
    },
    status: { type: String, enum: CLIENT_STATUSES, default: 'ACTIVE', index: true },
    enabledModules: {
      type: [String],
      enum: { values: MODULE_IDS, message: '{VALUE} is not a valid module' },
      default: [],
    },
    contactName: { type: String, trim: true, default: null },
    contactEmail: { type: String, trim: true, lowercase: true, default: null },
    contactPhone: { type: String, trim: true, default: null },
    address: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, default: null },
    plan: { type: String, enum: ['BASIC', 'STANDARD', 'CUSTOM'], default: 'STANDARD' },
    appId: { type: String, trim: true, default: null, index: true },
    appType: { type: String, enum: ['NONE', 'UNIVERSAL', 'CUSTOM'], default: 'UNIVERSAL' },
    branding: {
      appName: { type: String, trim: true, default: '' },
      tagline: { type: String, trim: true, default: '' },
      wordmark: { type: String, trim: true, default: '' },
      wordmarkSub: { type: String, trim: true, default: '' },
      logoUrl: { type: String, trim: true, default: '' },
      primaryColor: { type: String, trim: true, default: '#4f46e5' },
      secondaryColor: { type: String, trim: true, default: '#06b6d4' },
    },
  },
  { timestamps: true, tenantExempt: true }
);

export default mongoose.model('Client', clientSchema);
