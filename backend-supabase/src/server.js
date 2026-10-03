import app from './app.js';
import env from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`[${env.APP_NAME}] supabase backend listening on http://localhost:${env.PORT}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
