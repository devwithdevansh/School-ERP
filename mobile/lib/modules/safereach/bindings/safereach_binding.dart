import 'package:get/get.dart';
import '../controllers/safereach_controller.dart';

class SafeReachBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<SafeReachController>(() => SafeReachController());
  }
}
