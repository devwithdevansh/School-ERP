import 'dart:convert';
import 'dart:math';
import '../../core/network/api_client.dart';
import '../models/fee_model.dart';

class FeeRepository {
  Future<List<FeeModel>> getFees(String studentId) async {
    try {
      final response = await ApiClient.get('/ledgers?studentId=$studentId&limit=100');
      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        final list = body['data'] as List;
        return list.map((item) => FeeModel.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        throw Exception('Failed to load fees: ${response.statusCode}');
      }
    } catch (e) {
      print('Error in getFees: $e');
      rethrow;
    }
  }

  Future<List<FeeModel>> getPendingFees(String studentId) async {
    final all = await getFees(studentId);
    return all.where((f) => !f.isPaid).toList();
  }

  Future<Map<String, double>> getAggregate(String studentId) async {
    final all = await getFees(studentId);
    double total = 0;
    double paid = 0;
    double pending = 0;
    for (final f in all) {
      total += f.amount;
      paid += f.paidAmount;
      pending += f.remainingAmount;
    }
    return {
      'total': total,
      'paid': paid,
      'pending': pending,
    };
  }

  /// Pay fee in full
  Future<bool> payFee(String ledgerId, double amount, String method, {String? transactionId}) async {
    try {
      // Generate a random idempotency key to prevent duplicate charge replays
      final random = Random.secure();
      final bytes = List<int>.generate(16, (_) => random.nextInt(256));
      final idempotencyKey = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

      final txnId = transactionId ?? 'TXN${DateTime.now().millisecondsSinceEpoch}';

      final response = await ApiClient.post(
        '/payments',
        {
          'ledgerId': ledgerId,
          'amount': amount,
          'method': method.toUpperCase(),
          'details': {
            'transactionId': txnId,
            'bankName': 'Online Gateway'
          }
        },
        extraHeaders: {
          'Idempotency-Key': idempotencyKey,
        }
      );
      return response.statusCode == 201;
    } catch (e) {
      print('Error in payFee: $e');
      return false;
    }
  }

  Future<String?> createRazorpayOrder(double amount) async {
    try {
      final response = await ApiClient.post('/payments/razorpay/order', {'amount': amount});
      if (response.statusCode == 201) {
        final body = json.decode(response.body);
        return body['data']['id'] as String?;
      }
    } catch (e) {
      print('Error in createRazorpayOrder: $e');
    }
    return null;
  }

  Future<bool> verifyRazorpayPayment(String orderId, String paymentId, String signature, List<Map<String, dynamic>> payments) async {
    try {
      final random = Random.secure();
      final bytes = List<int>.generate(16, (_) => random.nextInt(256));
      final idempotencyKey = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

      final response = await ApiClient.post(
        '/payments/razorpay/verify',
        {
          'razorpay_order_id': orderId,
          'razorpay_payment_id': paymentId,
          'razorpay_signature': signature,
          'payments': payments,
        },
        extraHeaders: {
          'Idempotency-Key': idempotencyKey,
        }
      );
      return response.statusCode == 201;
    } catch (e) {
      print('Error in verifyRazorpayPayment: $e');
      return false;
    }
  }
}

