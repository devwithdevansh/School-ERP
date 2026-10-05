import 'dart:convert';
import '../../core/network/api_client.dart';
import '../models/payment_model.dart';
import '../models/receipt_model.dart';

class ReceiptRepository {
  /// Fetch all payments for the given student, with ledger context (feePeriod, feeType, studentName)
  Future<List<PaymentModel>> getPaymentsForStudent(String studentId) async {
    if (studentId.isEmpty) return [];
    final allPayments = <PaymentModel>[];
    try {
      final response = await ApiClient.get(
        '/payments?studentId=$studentId&limit=500',
      );
      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        final list = body['data'] as List;
        allPayments.addAll(
          list.map((item) => PaymentModel.fromJson(item as Map<String, dynamic>)),
        );
      } else {
        throw Exception('Failed to load payments: ${response.statusCode}');
      }
    } catch (e) {
      print('Error in getPaymentsForStudent: $e');
      rethrow;
    }
    return allPayments;
  }

  /// Map payments to receipt models, carrying through termName and feeType
  Future<List<ReceiptModel>> getReceiptsForStudent(
      String studentId, String fallbackStudentName) async {
    final payments = await getPaymentsForStudent(studentId);
    // Only non-reversal payments generate receipts
    return payments
        .where((p) => !p.isReversal && p.amount > 0)
        .map((p) => ReceiptModel(
              id: p.id,
              receiptNumber: p.receiptNumber.isNotEmpty
                  ? p.receiptNumber
                  : p.transactionId.isNotEmpty
                      ? p.transactionId
                      : 'REC-${p.id.substring(p.id.length > 6 ? p.id.length - 6 : 0).toUpperCase()}',
              studentName: p.studentName.isNotEmpty ? p.studentName : fallbackStudentName,
              amount: p.amount,
              paymentDate: p.paymentDate,
              paymentMode: p.paymentMode,
              pdfUrl: 'receipt.pdf',
              termName: p.termName,
              feeType: p.feeType,
              concessionAmount: p.concessionAmount,
              totalAmount: p.totalAmount,
              isReversed: p.isReversed,
              reversalOf: p.reversalOf,
            ))
        .toList();
  }
}
