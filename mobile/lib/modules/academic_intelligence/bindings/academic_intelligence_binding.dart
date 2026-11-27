import 'package:get/get.dart';
import '../controllers/academic_intelligence_controller.dart';

class AcademicIntelligenceBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<AcademicIntelligenceController>(
      () => AcademicIntelligenceController(),
    );
  }
}
