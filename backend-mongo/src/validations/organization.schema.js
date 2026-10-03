// src/validations/organization.schema.js
import { z } from 'zod';
import { MODULE_IDS, CLIENT_STATUSES } from '../constants/modules.js';

const modules = z.array(z.enum(MODULE_IDS)).transform((m) => [...new Set(m)]);
const optionalText = z.string().trim().max(300).nullable().optional();
const code = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, 'Code must be 3-40 chars: lowercase letters, digits, hyphens');

export const createClientSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(120),
    code: code.optional(),
    enabledModules: modules.default([]),
    contactName: optionalText,
    contactEmail: z.string().trim().email().nullable().optional(),
    contactPhone: optionalText,
    address: optionalText,
    notes: optionalText,
    admin: z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    }),
  }),
};

export const updateClientSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    status: z.enum(CLIENT_STATUSES).optional(),
    enabledModules: modules.optional(),
    contactName: optionalText,
    contactEmail: z.string().trim().email().nullable().optional(),
    contactPhone: optionalText,
    address: optionalText,
    notes: optionalText,
  }),
};

export const resetAdminPasswordSchema = {
  body: z.object({
    adminId: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
};
