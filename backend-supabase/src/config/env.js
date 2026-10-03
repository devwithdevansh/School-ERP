import 'dotenv/config';

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3001,
  APP_NAME: process.env.APP_NAME || 'School ERP',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_DAYS: parseInt(process.env.REFRESH_TOKEN_DAYS, 10) || 7,
  ALLOWED_ORIGINS: list(process.env.ALLOWED_ORIGINS || 'http://localhost:5173'),
  SUPER_ADMIN_EMAILS: list(process.env.SUPER_ADMIN_EMAILS).map((e) => e.toLowerCase()),
};

if (env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is required in production.');
}

export default env;
