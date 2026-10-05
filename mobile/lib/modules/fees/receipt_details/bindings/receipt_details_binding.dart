import 'package:get/get.dart';
import '../controllers/receipt_details_controller.dart';

class ReceiptDetailsBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ReceiptDetailsController>(() => ReceiptDetailsController());
  }
}
