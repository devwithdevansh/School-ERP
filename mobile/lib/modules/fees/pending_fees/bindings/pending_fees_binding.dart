import 'package:get/get.dart';
import '../controllers/pending_fees_controller.dart';

class PendingFeesBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<PendingFeesController>(() => PendingFeesController());
  }
}
