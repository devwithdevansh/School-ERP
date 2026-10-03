// Registers the tenant plugin on every model. MUST be imported before any model file
// (server.js, seed.js and scripts import it first).
import mongoose from 'mongoose';
import tenantPlugin from '../plugins/tenant.plugin.js';

mongoose.plugin(tenantPlugin, { deduplicate: true, applyPluginsToChildSchemas: false });
