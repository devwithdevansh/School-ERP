/**
 * Per-school branding. Everything school-specific lives here (or in env vars)
 * so the same build can be re-skinned for a different school without touching components.
 * Later this can be fed from the backend (tenant settings) instead of env.
 */
const env = import.meta.env;

export const brand = {
  productName: env.VITE_PRODUCT_NAME || 'School ERP',
  schoolName: env.VITE_SCHOOL_NAME || 'Your School Name',
  medium: env.VITE_SCHOOL_MEDIUM || '',
  address: env.VITE_SCHOOL_ADDRESS || 'School address line, City, State',
  phone: env.VITE_SCHOOL_PHONE || '',
  email: env.VITE_SCHOOL_EMAIL || '',
  website: env.VITE_SCHOOL_WEBSITE || '',
  logo: env.VITE_SCHOOL_LOGO || '/logo.svg',
  /** Emails shown the ERP/Fees module switcher while modules are feature-flagged. Empty = every ADMIN. */
  superAdminEmails: String(env.VITE_SUPER_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean),
};
