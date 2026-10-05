import '../models/student_model.dart';
import '../models/fee_model.dart';
import '../models/payment_model.dart';
import '../models/receipt_model.dart';
import '../models/notification_model.dart';

class DummyData {
  // ── Student ──────────────────────────────────────────────────────────
  static final StudentModel student = StudentModel.fromJson({
    'id': 1,
    'name': 'Rana Mitrajsinh',
    'phone': '9876543210',
    'standard': '6',
    'division': 'B',
    'medium': 'English',
    'photoUrl': 'assets/images/student.png',
  });

  // ── Fees ─────────────────────────────────────────────────────────────
  static final List<FeeModel> fees = [
    FeeModel.fromJson({
      'id': 1, 'studentId': 1,
      'termName': 'April 2026', 'amount': 3000,
      'paidAmount': 3000, 'remainingAmount': 0,
      'dueDate': '2026-04-15', 'status': 'PAID', 'academicYear': '2026-27',
    }),
    FeeModel.fromJson({
      'id': 2, 'studentId': 1,
      'termName': 'May 2026', 'amount': 3000,
      'paidAmount': 3000, 'remainingAmount': 0,
      'dueDate': '2026-05-15', 'status': 'PAID', 'academicYear': '2026-27',
    }),
    FeeModel.fromJson({
      'id': 3, 'studentId': 1,
      'termName': 'June 2026', 'amount': 3000,
      'paidAmount': 3000, 'remainingAmount': 0,
      'dueDate': '2026-06-15', 'status': 'PAID', 'academicYear': '2026-27',
    }),
    FeeModel.fromJson({
      'id': 4, 'studentId': 1,
      'termName': 'July 2026', 'amount': 3000,
      'paidAmount': 0, 'remainingAmount': 3000,
      'dueDate': '2026-07-15', 'status': 'PENDING', 'academicYear': '2026-27',
    }),
    FeeModel.fromJson({
      'id': 5, 'studentId': 1,
      'termName': 'August 2026', 'amount': 3000,
      'paidAmount': 0, 'remainingAmount': 3000,
      'dueDate': '2026-08-15', 'status': 'PENDING', 'academicYear': '2026-27',
    }),
    FeeModel.fromJson({
      'id': 6, 'studentId': 1,
      'termName': 'September 2026', 'amount': 3000,
      'paidAmount': 1500, 'remainingAmount': 1500,
      'dueDate': '2026-09-15', 'status': 'PARTIAL', 'academicYear': '2026-27',
    }),
  ];

  // ── Payments ──────────────────────────────────────────────────────────
  static final List<PaymentModel> payments = [
    PaymentModel.fromJson({
      'id': 1, 'feeId': 1, 'amount': 3000,
      'paymentDate': '2026-04-08', 'paymentMode': 'UPI',
      'transactionId': 'TXN260408001',
    }),
    PaymentModel.fromJson({
      'id': 2, 'feeId': 2, 'amount': 3000,
      'paymentDate': '2026-05-06', 'paymentMode': 'Cash',
      'transactionId': 'TXN260506001',
    }),
    PaymentModel.fromJson({
      'id': 3, 'feeId': 3, 'amount': 3000,
      'paymentDate': '2026-06-10', 'paymentMode': 'UPI',
      'transactionId': 'TXN260610001',
    }),
    PaymentModel.fromJson({
      'id': 4, 'feeId': 6, 'amount': 1500,
      'paymentDate': '2026-09-03', 'paymentMode': 'Net Banking',
      'transactionId': 'TXN260903001',
    }),
  ];

  // ── Receipts ──────────────────────────────────────────────────────────
  static final List<ReceiptModel> receipts = [
    ReceiptModel.fromJson({
      'id': 1, 'receiptNumber': 'REC260408001',
      'studentName': 'Rana Mitrajsinh', 'amount': 3000,
      'paymentDate': '2026-04-08', 'paymentMode': 'UPI',
      'pdfUrl': 'receipt_001.pdf',
    }),
    ReceiptModel.fromJson({
      'id': 2, 'receiptNumber': 'REC260506002',
      'studentName': 'Rana Mitrajsinh', 'amount': 3000,
      'paymentDate': '2026-05-06', 'paymentMode': 'Cash',
      'pdfUrl': 'receipt_002.pdf',
    }),
    ReceiptModel.fromJson({
      'id': 3, 'receiptNumber': 'REC260610003',
      'studentName': 'Rana Mitrajsinh', 'amount': 3000,
      'paymentDate': '2026-06-10', 'paymentMode': 'UPI',
      'pdfUrl': 'receipt_003.pdf',
    }),
    ReceiptModel.fromJson({
      'id': 4, 'receiptNumber': 'REC260903004',
      'studentName': 'Rana Mitrajsinh', 'amount': 1500,
      'paymentDate': '2026-09-03', 'paymentMode': 'Net Banking',
      'pdfUrl': 'receipt_004.pdf',
    }),
  ];

  // ── Notifications ─────────────────────────────────────────────────────
  static final List<NotificationModel> notifications = [
    NotificationModel.fromJson({
      'id': 1,
      'title': 'Fee Due Reminder',
      'message': 'Your July 2026 fee of ₹3,000 is due on 15 July. Please pay on time to avoid late charges.',
      'type': 'REMINDER',
      'createdAt': '2026-07-10',
      'isRead': false,
      'metadata': {'studentId': 1},
    }),
    NotificationModel.fromJson({
      'id': 2,
      'title': 'Payment Received',
      'message': 'Payment of ₹3,000 for June 2026 received successfully via UPI. Receipt #REC260610003.',
      'type': 'SUCCESS',
      'createdAt': '2026-06-10',
      'isRead': true,
    }),
    NotificationModel.fromJson({
      'id': 3,
      'title': 'Partial Payment Alert',
      'message': 'Partial payment of ₹1,500 recorded for September 2026. Remaining ₹1,500 is still pending.',
      'type': 'ALERT',
      'createdAt': '2026-09-03',
      'isRead': false,
      'metadata': {'studentId': 1},
    }),
    NotificationModel.fromJson({
      'id': 4,
      'title': 'Academic Year Update',
      'message': 'Fee structure for 2026-27 academic year has been updated. Visit Fee Summary for details.',
      'type': 'INFO',
      'createdAt': '2026-04-01',
      'isRead': true,
    }),
  ];

  // ── Aggregates ────────────────────────────────────────────────────────
  static double get totalFees => fees.fold(0, (s, f) => s + f.amount);
  static double get totalPaid => fees.fold(0, (s, f) => s + f.paidAmount);
  static double get totalPending => fees.fold(0, (s, f) => s + f.remainingAmount);
  static int get unreadCount => notifications.where((n) => !n.isRead).length;
}
