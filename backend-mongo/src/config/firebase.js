// src/config/firebase.js
// Lazy-initialises Firebase Admin SDK from a service account JSON file
// or from the FIREBASE_SERVICE_ACCOUNT environment variable.

import { createRequire } from 'module';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _isInitialized = false;

/**
 * Automatically locate a service account JSON file in candidate config directories.
 */
function findServiceAccountFile() {
  const candidateDirs = [
    __dirname,                           // backend-mongo/src/config/
    join(__dirname, '../../config'),      // backend-mongo/config/
    join(__dirname, '..'),                // backend-mongo/src/
  ];

  for (const dir of candidateDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir);
      // Find any file matching firebase-adminsdk or firebase-service-account
      const match = files.find(f => 
        (f.includes('firebase-adminsdk') || f.includes('firebase-service-account')) && f.endsWith('.json')
      );
      if (match) {
        return join(dir, match);
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Returns an object compatible with the old Firebase Admin instance.
 * Returns null if Firebase is not configured.
 */
export function getFirebaseAdmin() {
  if (_isInitialized) return { messaging: () => getMessaging() };

  try {
    if (!getApps().length) {
      let serviceAccount;

      // 1. Preferred: Environment Variable (Hostinger/Vercel/Render/etc.)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let envVal = process.env.FIREBASE_SERVICE_ACCOUNT;
        // Hostinger aggressively escapes JSON strings, so we decode from Base64 if needed
        if (!envVal.trim().startsWith('{') && !envVal.trim().startsWith('\\{')) {
          envVal = Buffer.from(envVal, 'base64').toString('utf8');
        } else if (envVal.includes('\\"')) {
           // Fallback just in case they leave it as JSON with Hostinger's weird escapes
           envVal = envVal.replace(/\\"/g, '"').replace(/\\\\n/g, '\\n');
           if (envVal.startsWith('\\{')) envVal = envVal.substring(1);
           if (envVal.endsWith('\\}')) envVal = envVal.substring(0, envVal.length - 1) + '}';
        }
        serviceAccount = JSON.parse(envVal);
      }
      // 2. Local JSON file (src/config or config/)
      else {
        const localPath = findServiceAccountFile();
        if (localPath) {
          const require = createRequire(import.meta.url);
          serviceAccount = require(localPath);
          logger.info(`Loaded Firebase service account key from: ${localPath}`);
        } else {
          logger.warn(
            'Firebase service account not found. Push notifications are disabled. ' +
            'Set FIREBASE_SERVICE_ACCOUNT environment variable or place service account JSON in src/config/.'
          );
          return null;
        }
      }

      initializeApp({
        credential: cert(serviceAccount),
      });

      logger.info(`Firebase Admin SDK initialised successfully for project: ${serviceAccount.project_id || 'unknown'}`);
    }

    _isInitialized = true;
    return { messaging: () => getMessaging() };
  } catch (err) {
    logger.error('Failed to initialise Firebase Admin SDK', err);
    return null;
  }
}