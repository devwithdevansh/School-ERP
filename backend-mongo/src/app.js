// src/app.js
import './config/tenancy.js'; // multi-tenant plugin — must be registered before any model is imported
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';
import logger from './config/logger.js';
import AppError from './utils/AppError.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import moduleGate from './middlewares/moduleGate.middleware.js';
import organizationRoutes from './routes/organization.routes.js';

// Route imports
import authRoutes      from './routes/auth.routes.js';
import parentRoutes    from './routes/parent.routes.js';
import studentRoutes   from './routes/student.routes.js';
import ledgerRoutes    from './routes/ledger.routes.js';
import paymentRoutes   from './routes/payment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import migrationRoutes from './routes/migration.routes.js';
import auditRoutes     from './routes/audit.routes.js';
import feeStructureRoutes from './routes/fee-structure.routes.js';
import feeCategoryRoutes from './routes/fee-category.routes.js';
import academicYearRoutes from './routes/academic-year.routes.js';
import userRoutes             from './routes/user.routes.js';
import reportRoutes           from './routes/report.routes.js';
import notificationRoutes     from './routes/notification.routes.js';
import whatsappRoutes         from './routes/whatsapp.routes.js';
import expenseRoutes          from './routes/expense.routes.js';
import attendanceRoutes       from './routes/attendance.routes.js';
import academicMasterRoutes   from './routes/academic-master.routes.js';
import uploadRoutes           from './routes/upload.routes.js';

const app = express();

app.set('trust proxy', true);

// ─── Global Middleware ────────────────────────────────────────────────────────
// Security headers (XSS, clickjacking, content-type sniffing, etc.)
app.use(helmet());

app.use(cors({
  origin: true,
  credentials: true,
}));

// Limit body size to prevent memory-exhaustion attacks
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ─── Disable Caching for all API routes ───────────────────────────────────────
// Prevents Hostinger LiteSpeed (and any proxy/CDN) from caching dynamic API
// responses which would cause stale badge counts and outdated fee data in UI.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'UP', message: `${env.APP_NAME} backend (mongo) is running` });
});

import erpRoutes              from './routes/erp.routes.js';
import allocationRoutes       from './routes/allocation.routes.js';
import homeworkRoutes         from './routes/homework.routes.js';
import leaveRoutes            from './routes/leave.routes.js';
import examRoutes             from './routes/exam.routes.js';
import timetableRoutes        from './routes/timetable.routes.js';
import chatRoutes             from './routes/chat.routes.js';

// ─── API Routes ───────────────────────────────────────────────────────────────
const V1 = '/api/v1';
// Multi-tenancy: moduleGate(id) rejects suspended clients and clients that lack module `id`;
// moduleGate() with no id = core routes that only need an active client. See constants/modules.js.
const CORE = moduleGate();
const FEES = moduleGate('FEES');
const ERP  = moduleGate('ERP');

app.use(`${V1}/auth`,       authRoutes);
app.use(`${V1}/organization`, organizationRoutes); // ORG_ADMIN only
// core
app.use(`${V1}/parents`,    CORE, parentRoutes);
app.use(`${V1}/students`,   CORE, studentRoutes);
app.use(`${V1}/dashboard`,  CORE, dashboardRoutes);
app.use(`${V1}/audit`,      CORE, auditRoutes);
app.use(`${V1}/academic-years`, CORE, academicYearRoutes);
app.use(`${V1}/users`,          CORE, userRoutes);
app.use(`${V1}/academic-master`, CORE, academicMasterRoutes);
app.use(`${V1}/upload`,         CORE, uploadRoutes);
// FEES module
app.use(`${V1}/ledgers`,    FEES, ledgerRoutes);
app.use(`${V1}/payments`,   FEES, paymentRoutes);
app.use(`${V1}/migration`,  FEES, migrationRoutes);
app.use(`${V1}/fee-structures`, FEES, feeStructureRoutes);
app.use(`${V1}/fee-categories`, FEES, feeCategoryRoutes);
app.use(`${V1}/reports`,        FEES, reportRoutes);
app.use(`${V1}/notifications`,  FEES, notificationRoutes);
app.use(`${V1}/whatsapp`,       FEES, whatsappRoutes);
app.use(`${V1}/expenses`,       FEES, expenseRoutes);
// ERP module
app.use(`${V1}/erp/allocations`, ERP, allocationRoutes); // Mount before erpRoutes
app.use(`${V1}/erp/homework`,   ERP, homeworkRoutes);
app.use(`${V1}/erp/leave`,      ERP, leaveRoutes);
app.use(`${V1}/erp/exams`,      ERP, examRoutes);
app.use(`${V1}/erp/timetable`,  ERP, timetableRoutes);
app.use(`${V1}/erp`,            ERP, erpRoutes);
app.use(`${V1}/attendance`,     ERP, attendanceRoutes);
app.use(`${V1}/chat`,           ERP, chatRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.all('/{*splat}', (req, _res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
