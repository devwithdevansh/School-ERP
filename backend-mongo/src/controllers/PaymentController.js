// src/controllers/PaymentController.js
import PaymentService from '../services/PaymentService.js';
import RazorpayService from '../services/RazorpayService.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/response.js';
import AppError from '../utils/AppError.js';
import ledgerRepository from '../repositories/ledgerRepository.js';
import studentRepository from '../repositories/studentRepository.js';
import GatewayLog from '../models/GatewayLog.js';
import env from '../config/env.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

class PaymentController {
  /** POST /api/v1/payments */
  static createPayment = catchAsync(async (req, res) => {
    if (req.user?.role === 'parent') {
      const ledger = await ledgerRepository.findById(req.body.ledgerId);
      if (!ledger) throw new AppError('Ledger not found', 404);
      const student = await studentRepository.findOne({ _id: ledger.studentId, parentId: req.user.id });
      if (!student) throw new AppError('You do not have permission to pay for this ledger', 403);
    }
    const payment = await PaymentService.createPayment({ ...req.body, performedBy: req.user?.id ?? null });
    sendResponse(res, 201, payment);
  });

  /** POST /api/v1/payments/batch */
  static createBatchPayments = catchAsync(async (req, res) => {
    const { payments } = req.body;
    if (req.user?.role === 'parent') {
      const ledgerIds = payments.map(p => p.ledgerId);
      const studentIds = await ledgerRepository.findDistinct('studentId', { _id: { $in: ledgerIds } });
      const studentCount = await studentRepository.countDocuments({
        _id: { $in: studentIds },
        parentId: req.user.id
      });
      const uniqueStudentIds = [...new Set(studentIds.map(id => id.toString()))];
      if (studentCount !== uniqueStudentIds.length) {
        throw new AppError('You do not have permission to pay for one or more selected ledgers', 403);
      }
    }
    const results = await PaymentService.createBatchPayments({
      payments,
      performedBy: req.user?.id ?? null
    });
    sendResponse(res, 201, results);
  });

  /** GET /api/v1/payments */
  static listPayments = catchAsync(async (req, res) => {
    const { limit = 20, skip = 0, ...filter } = req.query;
    
    // Dynamic import to avoid circular dependencies at top level if any, or just import it at top.
    const mongoose = (await import('mongoose')).default;

    if (filter.studentId) {
      let sId;
      try {
        sId = new mongoose.Types.ObjectId(filter.studentId);
      } catch (e) {
        return sendResponse(res, 400, 'Invalid studentId');
      }
      const ledgerIds = await ledgerRepository.findDistinct('_id', { studentId: sId });
      if (ledgerIds.length === 0) {
        return sendResponse(res, 200, []);
      }
      filter.ledgerIds = ledgerIds.map(id => id.toString()).join(',');
      delete filter.studentId;
    }
    
    if (req.user?.role === 'parent') {
      let parentId;
      try {
        parentId = new mongoose.Types.ObjectId(req.user.id);
      } catch (e) {
        return sendResponse(res, 400, 'Invalid parentId');
      }
      const studentIds = await studentRepository.findDistinct('_id', { parentId: parentId });
      const parentLedgerIds = await ledgerRepository.findDistinct('_id', { studentId: { $in: studentIds } });
      const parentLedgerIdStrs = parentLedgerIds.map(id => id.toString());

      if (filter.ledgerIds) {
        const requestedIds = filter.ledgerIds.split(',').map(id => id.trim()).filter(Boolean);
        const allowedIds = requestedIds.filter(id => parentLedgerIdStrs.includes(id));
        if (allowedIds.length === 0) {
          return sendResponse(res, 200, []);
        }
        filter.ledgerIds = allowedIds.join(',');
      } else if (filter.ledgerId) {
        if (!parentLedgerIdStrs.includes(filter.ledgerId)) {
          return sendResponse(res, 200, []);
        }
      } else {
        if (parentLedgerIdStrs.length === 0) {
          return sendResponse(res, 200, []);
        }
        filter.ledgerIds = parentLedgerIdStrs.join(',');
      }
    }
    const payments = await PaymentService.listPayments(filter, { limit: Number(limit), skip: Number(skip) });
    sendResponse(res, 200, payments);
  });

  /** GET /api/v1/payments/:id */
  static getPayment = catchAsync(async (req, res) => {
    const payment = await PaymentService.getPayment(req.params.id);
    sendResponse(res, 200, payment);
  });

  /** POST /api/v1/payments/:id/reverse (ADMIN only) */
  static reversePayment = catchAsync(async (req, res) => {
    const reversal = await PaymentService.reversePayment({ paymentId: req.params.id, ...req.body, performedBy: req.user?.id ?? null });
    sendResponse(res, 200, reversal);
  });

  /** POST /api/v1/payments/razorpay/order */
  static createRazorpayOrder = catchAsync(async (req, res) => {
    const { amount, notes } = req.body;
    const order = await RazorpayService.createOrder({ 
      amount, 
      receipt: `receipt_${Date.now()}`,
      notes: notes || {}
    });
    sendResponse(res, 201, {
      ...order,
      key_id: env.RAZORPAY_KEY_ID
    });
  });

  /** POST /api/v1/payments/razorpay/verify */
  static verifyRazorpayPayment = catchAsync(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payments } = req.body;

    const isValid = RazorpayService.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      throw new AppError('Invalid payment signature', 400);
    }

    if (req.user?.role === 'parent') {
      const ledgerIds = payments.map(p => p.ledgerId);
      const studentIds = await ledgerRepository.findDistinct('studentId', { _id: { $in: ledgerIds } });
      const studentCount = await studentRepository.countDocuments({
        _id: { $in: studentIds },
        parentId: req.user.id
      });
      const uniqueStudentIds = [...new Set(studentIds.map(id => id.toString()))];
      if (studentCount !== uniqueStudentIds.length) {
        throw new AppError('You do not have permission to pay for one or more selected ledgers', 403);
      }
    }

    // Capture the raw gateway response safely (don't block parent payments if this fails)
    try {
      const rpPayment = await RazorpayService.fetchPayment(razorpay_payment_id);
      if (rpPayment) {
        // Use upsert to handle idempotency replays gracefully
        await GatewayLog.findOneAndUpdate(
          { paymentId: razorpay_payment_id },
          {
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            method: rpPayment.method,
            amount: (rpPayment.amount || 0) / 100, // convert paisa to INR
            status: rpPayment.status,
            gateway: 'RAZORPAY',
            rawResponse: rpPayment,
          },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      console.error('Failed to capture GatewayLog:', err);
    }

    // Embed razorpay details in each payment
    const enrichedPayments = payments.map(p => ({
      ...p,
      method: 'ONLINE',
      gatewayTransactionId: razorpay_payment_id, // indexed first-class field for reconciliation
      details: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        ...(p.details || {})
      }
    }));

    const results = await PaymentService.createBatchPayments({
      payments: enrichedPayments,
      performedBy: req.user?.id ?? null
    });
    
    sendResponse(res, 201, results);
  });

  /** POST /api/v1/payments/razorpay/webhook & /api/v1/payments/razorpay-webhook */
  static handleRazorpayWebhook = catchAsync(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      throw new AppError('Missing Razorpay signature header', 400);
    }

    const secret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      logger.warn('[Razorpay Webhook] Secret not configured, ignoring webhook');
      return res.status(200).json({ status: 'ignored', message: 'Webhook secret not configured' });
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.error('[Razorpay Webhook] Invalid webhook signature');
      throw new AppError('Invalid webhook signature', 400);
    }

    const event = req.body?.event;
    logger.info(`[Razorpay Webhook] Received verified event: ${event}`);

    const paymentEntity = req.body?.payload?.payment?.entity || {};
    const orderEntity = req.body?.payload?.order?.entity || {};

    const paymentId = paymentEntity.id;
    const orderId = paymentEntity.order_id || orderEntity.id;
    const amount = (paymentEntity.amount || orderEntity.amount_paid || 0) / 100;
    const method = paymentEntity.method || 'ONLINE';
    const notes = paymentEntity.notes || orderEntity.notes || {};

    // 1. Upsert GatewayLog idempotently
    if (paymentId) {
      try {
        await GatewayLog.findOneAndUpdate(
          { paymentId },
          {
            paymentId,
            orderId,
            method,
            amount,
            status: paymentEntity.status || 'captured',
            gateway: 'RAZORPAY',
            rawResponse: req.body,
          },
          { upsert: true, new: true }
        );
      } catch (logErr) {
        logger.error('[Razorpay Webhook] Error updating GatewayLog', logErr);
      }
    }

    // Only process successful capture or paid orders
    if (event !== 'payment.captured' && event !== 'order.paid') {
      return res.status(200).json({ status: 'acknowledged', event });
    }

    // 2. Check if payment already exists in Payment table
    if (paymentId) {
      const Payment = (await import('../models/Payment.js')).default;
      const existingPayment = await Payment.findOne({
        $or: [
          { gatewayTransactionId: paymentId },
          { 'details.razorpay_payment_id': paymentId }
        ]
      });

      if (existingPayment) {
        logger.info(`[Razorpay Webhook] Payment ${paymentId} already recorded in DB`);
        return res.status(200).json({ status: 'ok', already_processed: true });
      }
    }

    // 3. Extract and reconcile ledgers if notes contain ledgerIds
    const rawLedgers = notes.ledgerIds || notes.ledgerId;
    let ledgerIds = [];
    if (rawLedgers) {
      if (Array.isArray(rawLedgers)) {
        ledgerIds = rawLedgers;
      } else if (typeof rawLedgers === 'string') {
        if (rawLedgers.trim().startsWith('[')) {
          try {
            ledgerIds = JSON.parse(rawLedgers);
          } catch (_) {
            ledgerIds = rawLedgers.split(',').map((s) => s.trim()).filter(Boolean);
          }
        } else {
          ledgerIds = rawLedgers.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
    }

    if (ledgerIds.length > 0) {
      const StudentFeeLedger = (await import('../models/StudentFeeLedger.js')).default;
      const ledgers = await StudentFeeLedger.find({ _id: { $in: ledgerIds } });

      if (ledgers.length > 0) {
        let remainingPayment = amount;
        const paymentBatch = [];

        for (const l of ledgers) {
          if (remainingPayment <= 0) break;
          if (l.status === 'PAID') continue;
          const due = l.remainingAmount > 0 ? l.remainingAmount : (l.totalAmount - (l.paidAmount || 0) - (l.concessionAmount || 0));
          if (due <= 0) continue;
          const payAmt = Math.min(due, remainingPayment);
          remainingPayment -= payAmt;

          paymentBatch.push({
            ledgerId: l._id.toString(),
            amount: payAmt,
            concessionAmount: 0,
            method: 'ONLINE',
            gatewayTransactionId: paymentId,
            remark: 'Reconciled via Razorpay Webhook',
            details: {
              source: 'RAZORPAY_WEBHOOK',
              event,
              orderId,
              paymentId,
              method,
              webhook: true
            }
          });
        }

        if (paymentBatch.length > 0) {
          logger.info(`[Razorpay Webhook] Settling ${paymentBatch.length} ledgers for payment ${paymentId}`);
          await PaymentService.createBatchPayments({
            payments: paymentBatch,
            performedBy: null
          });
          return res.status(200).json({ status: 'ok', reconciled: paymentBatch.length });
        }
      }
    }

    return res.status(200).json({ status: 'ok', message: 'logged_awaiting_reconciliation' });
  });
}

export default PaymentController;
