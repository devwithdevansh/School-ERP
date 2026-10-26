import { z } from 'zod';

const installmentPartZodSchema = z.object({
  name: z.string().min(1),
  feeType: z.string().default('EDUCATION'),
  amount: z.number().nonnegative(),
  dueMonth: z.string().optional(),
  dueDate: z.union([z.string(), z.date()]).optional(),
  order: z.number().optional(),
});

export const createFeeStructureSchema = {
  body: z.object({
    academicYear: z.string().min(1),
    medium: z.enum(['English', 'Gujarati']),
    standard: z.string().min(1),
    annualFee: z.number().nonnegative(),
    educationPartCount: z.number().int().positive().default(12),
    termPartCount: z.number().int().nonnegative().default(2),
    termFee: z.number().nonnegative().default(0),
    admissionFee: z.number().nonnegative().default(0),
    bagKitFee: z.number().nonnegative().default(0),
    scheduleType: z.enum(['DEFAULT_12_2', 'MONTHLY_12', 'QUARTERLY_4', 'HALF_YEARLY_2', 'ANNUAL_1', 'CUSTOM']).default('DEFAULT_12_2'),
    installmentParts: z.array(installmentPartZodSchema).optional(),
    applicableFeeCategories: z.array(z.string()).optional(),
  }),
};

export const createTransportFeeStructureSchema = {
  body: z.object({
    academicYear: z.string().min(1),
    transportType: z.string().min(1, 'Transport type is required'),
    amount: z.number().nonnegative(),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  }),
};

export const updateFeeStructureSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    annualFee: z.number().nonnegative().optional(),
    educationPartCount: z.number().int().positive().optional(),
    termPartCount: z.number().int().nonnegative().optional(),
    termFee: z.number().nonnegative().optional(),
    admissionFee: z.number().nonnegative().optional(),
    bagKitFee: z.number().nonnegative().optional(),
    scheduleType: z.enum(['DEFAULT_12_2', 'MONTHLY_12', 'QUARTERLY_4', 'HALF_YEARLY_2', 'ANNUAL_1', 'CUSTOM']).optional(),
    installmentParts: z.array(installmentPartZodSchema).optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateTransportFeeStructureSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    amount: z.number().nonnegative().optional(),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
    isActive: z.boolean().optional(),
  }),
};
