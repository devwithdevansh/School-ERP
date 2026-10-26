import 'package:get/get.dart';
import '../controllers/roadmap_controller.dart';

class RoadmapBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<RoadmapController>(() => RoadmapController());
  }
}
