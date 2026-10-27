// src/routes/platform.routes.js — Platform developer endpoints for mobile app config, school discovery, and deployment management.
import { Router } from 'express';
import Client from '../models/Client.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/response.js';
import AppError from '../utils/AppError.js';
import { MODULE_CATALOG, MODULE_IDS } from '../constants/modules.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';

const router = Router();

// Universal Fallback Configuration for School Connect
const UNIVERSAL_APP_CONFIG = {
  appId: 'com.schoolerp.school_connect',
  appName: 'School Connect',
  appType: 'UNIVERSAL',
  schoolCode: null,
  schoolName: 'School Connect',
  branding: {
    appName: 'School Connect',
    tagline: 'Learning, together',
    wordmark: 'SCHOOL',
    wordmarkSub: 'CONNECT',
    logoUrl: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#06b6d4',
  },
  enabledModules: MODULE_IDS,
};

/**
 * GET /api/v1/platform/app-config?appId=...
 * Public runtime boot endpoint called by Flutter apps upon startup.
 * Returns branding, school context, and enabled modules.
 */
router.get(
  '/app-config',
  catchAsync(async (req, res) => {
    const appId = String(req.query.appId || '').trim();

    if (!appId || appId === 'com.schoolerp.school_connect') {
      return sendResponse(res, 200, UNIVERSAL_APP_CONFIG);
    }

    // Look for client with matching appId
    let client = await Client.findOne({ appId, status: 'ACTIVE' }).lean();

    // If appId is educonnect or matches standard custom seed, fallback to code match
    if (!client && appId.includes('educonnect')) {
      client = await Client.findOne({ code: 'educonnect' }).lean();
    }

    if (!client) {
      // Default to universal if not found
      return sendResponse(res, 200, {
        ...UNIVERSAL_APP_CONFIG,
        requestedAppId: appId,
      });
    }

    const branding = client.branding || {};
    return sendResponse(res, 200, {
      appId: client.appId || appId,
      appName: branding.appName || client.name,
      appType: client.appType || 'CUSTOM',
      schoolCode: client.code,
      schoolName: client.name,
      branding: {
        appName: branding.appName || client.name,
        tagline: branding.tagline || 'Learning, together',
        wordmark: branding.wordmark || client.code.toUpperCase(),
        wordmarkSub: branding.wordmarkSub || 'CONNECT',
        logoUrl: branding.logoUrl || '',
        primaryColor: branding.primaryColor || '#4f46e5',
        secondaryColor: branding.secondaryColor || '#06b6d4',
      },
      enabledModules: client.enabledModules || [],
      contact: {
        phone: client.contactPhone || '',
        email: client.contactEmail || '',
        address: client.address || '',
      },
    });
  })
);

/**
 * GET /api/v1/platform/school-lookup?code=...
 * Public endpoint for Universal App (School Connect) to resolve school codes entered by parents.
 */
router.get(
  '/school-lookup',
  catchAsync(async (req, res) => {
    const code = String(req.query.code || '').trim().toLowerCase();
    if (!code) throw new AppError('School code is required', 400);

    const client = await Client.findOne({ code, status: 'ACTIVE' }).lean();
    if (!client) throw new AppError('School not found. Please verify the code with your school.', 404);

    const branding = client.branding || {};
    return sendResponse(res, 200, {
      schoolCode: client.code,
      schoolName: client.name,
      branding: {
        appName: branding.appName || client.name,
        tagline: branding.tagline || '',
        wordmark: branding.wordmark || client.code.toUpperCase(),
        wordmarkSub: branding.wordmarkSub || 'CONNECT',
        logoUrl: branding.logoUrl || '',
        primaryColor: branding.primaryColor || '#4f46e5',
        secondaryColor: branding.secondaryColor || '#06b6d4',
      },
      enabledModules: client.enabledModules || [],
      contact: {
        phone: client.contactPhone || '',
        email: client.contactEmail || '',
        address: client.address || '',
      },
    });
  })
);

/**
 * GET /api/v1/platform/apps
 * Developer / Platform Admin endpoint listing all deployed and registered Play Store apps.
 */
router.get(
  '/apps',
  authenticate,
  authorize('ORG_ADMIN'),
  catchAsync(async (_req, res) => {
    const clients = await Client.find().lean();

    // Universal app entry
    const apps = [
      {
        id: 'universal-school-connect',
        name: 'School Connect',
        appId: 'com.schoolerp.school_connect',
        appType: 'UNIVERSAL',
        targetSchool: 'Multi-Tenant (All Schools)',
        schoolCode: '*',
        iconPath: 'apps/school_connect/app_icon.png',
        activeModulesCount: MODULE_CATALOG.length,
        status: 'DEPLOYED',
      },
    ];

    // Client custom apps
    for (const c of clients) {
      if (c.appId || c.code === 'educonnect') {
        apps.push({
          id: String(c._id),
          name: c.branding?.appName || c.name || 'EduConnect',
          appId: c.appId || (c.code === 'educonnect' ? 'com.schoolerp.educonnect' : `com.schoolerp.${c.code}`),
          appType: 'CUSTOM',
          targetSchool: c.name,
          schoolCode: c.code,
          iconPath: `schools/${c.code}/app_icon.png`,
          activeModulesCount: (c.enabledModules || []).length,
          status: c.status,
          enabledModules: c.enabledModules || [],
          branding: c.branding || {},
        });
      }
    }

    return sendResponse(res, 200, {
      catalog: MODULE_CATALOG,
      apps,
    });
  })
);

export default router;
