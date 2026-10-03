// Bootstraps a brand-new client (school): current academic year + system fee categories.
// Idempotent and non-destructive. Also used by the seed script.
import AcademicYear from '../models/AcademicYear.js';
import FeeCategory from '../models/FeeCategory.js';
import { runWithTenant } from '../utils/tenantContext.js';

const FEE_CATEGORIES = [
  ['EDUCATION', 'Education Fees', 'Standard monthly education fee'],
  ['TERM', 'Term Fees', 'Bi-annual term fee'],
  ['TRANSPORT', 'Transport Fees', 'Monthly transport fee'],
  ['ADMISSION', 'Admission Fees', 'One-time admission fee'],
  ['BAG_KIT', 'Bag & Kit', 'Bag & Kit fee category'],
];

export async function provisionTenantDefaults(clientId) {
  return runWithTenant(clientId, async () => {
    if (!(await AcademicYear.countDocuments())) {
      const now = new Date();
      const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1; // academic year starts in June
      await AcademicYear.create({
        name: `${start}-${start + 1}`,
        startDate: new Date(`${start}-06-01`),
        endDate: new Date(`${start + 1}-05-31`),
        isActive: true,
      });
    }
    for (const [type, name, description] of FEE_CATEGORIES) {
      if (!(await FeeCategory.findOne({ type }))) await FeeCategory.create({ name, type, description, isActive: true });
    }
  });
}
