import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';
import { authenticate, moduleGate, globalErrorHandler } from './middlewares/index.js';
import organizationRoutes from './routes/organization.routes.js';
import { AppError, sendResponse } from './utils/http.js';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import { academicYearRoutes, feeCategoryRoutes, feeStructureRoutes } from './routes/master.routes.js';
import { studentRoutes, parentRoutes } from './routes/students.routes.js';
import { ledgerRoutes, paymentRoutes, reportRoutes, expenseRoutes, dashboardRoutes } from './routes/finance.routes.js';

const app = express();
app.set('trust proxy', true);

app.use(helmet());
app.use(cors({ origin: env.ALLOWED_ORIGINS.length ? env.ALLOWED_ORIGINS : true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// API responses are dynamic - never let a proxy/CDN cache them.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'UP', message: `${env.APP_NAME} backend (supabase) is running` }));

const V1 = '/api/v1';
// Multi-tenancy: moduleGate(id) rejects suspended clients and clients that lack module `id`;
// moduleGate() with no id = core routes that only need an active client. See constants/modules.js.
const CORE = moduleGate();
const FEES = moduleGate('FEES');

app.use(`${V1}/auth`, authRoutes);
app.use(`${V1}/organization`, organizationRoutes); // ORG_ADMIN only
// core
app.use(`${V1}/users`, CORE, usersRoutes);
app.use(`${V1}/academic-years`, CORE, academicYearRoutes);
app.use(`${V1}/students`, CORE, studentRoutes);
app.use(`${V1}/parents`, CORE, parentRoutes);
app.use(`${V1}/dashboard`, CORE, dashboardRoutes);
// FEES module
app.use(`${V1}/fee-categories`, FEES, feeCategoryRoutes);
app.use(`${V1}/fee-structures`, FEES, feeStructureRoutes);
app.use(`${V1}/ledgers`, FEES, ledgerRoutes);
app.use(`${V1}/payments`, FEES, paymentRoutes);
app.use(`${V1}/reports`, FEES, reportRoutes);
app.use(`${V1}/expenses`, FEES, expenseRoutes);

// ERP modules (subjects, timetable, attendance, exams, ...) are not ported yet.
// The admin UI loads these lists on login, so answer with empty lists instead of errors.
app.get(`${V1}/academic-master/subjects`, CORE, authenticate, (_req, res) => sendResponse(res, 200, []));
app.get(`${V1}/academic-master/curriculum`, CORE, authenticate, (_req, res) => sendResponse(res, 200, []));

app.all('/api/{*splat}', (req, _res, next) => next(new AppError(`${req.method} ${req.originalUrl} is not implemented in backend-supabase yet`, 501)));
app.all('/{*splat}', (req, _res, next) => next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404)));

app.use(globalErrorHandler);

export default app;
