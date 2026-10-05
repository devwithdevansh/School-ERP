import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:school_connect/data/models/receipt_model.dart';
import 'package:school_connect/modules/fees/receipt_details/controllers/receipt_details_controller.dart';
import 'package:school_connect/modules/fees/receipt_details/views/receipt_details_view.dart';

/// Skips the network load so the screen can be rendered with fixed data.
class _FakeReceiptController extends ReceiptDetailsController {
  @override
  void onInit() {}

  @override
  Future<void> loadReceipts({bool forceRefresh = false}) async {}
}

void main() {
  tearDown(Get.reset);

  testWidgets('Receipts screen renders its ticket cards without layout errors', (tester) async {
    final controller = _FakeReceiptController();
    Get.put<ReceiptDetailsController>(controller);
    controller.isLoading.value = false;
    controller.receiptGroups.assignAll([
      ReceiptGroup(
        receiptNumber: '1001',
        paidAt: DateTime(2026, 8, 10, 10, 30),
        items: const [
          ReceiptModel(
            id: 'a',
            receiptNumber: '1001',
            studentName: 'Aarav',
            amount: 3600,
            paymentDate: '2026-08-10T10:30:00.000',
            paymentMode: 'CASH',
            pdfUrl: 'r.pdf',
            termName: 'June',
          ),
        ],
      ),
    ]);

    await tester.pumpWidget(const GetMaterialApp(home: ReceiptDetailsView()));
    await tester.pump(const Duration(seconds: 2));

    // A ticket card being built with a negative Container margin used to throw
    // here ('margin == null || margin.isNonNegative'), replacing the card with
    // the red error screen.
    expect(tester.takeException(), isNull);
    expect(find.text('Receipts'), findsWidgets);
  });
}
