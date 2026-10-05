import 'package:get/get.dart';
import '../controllers/teacher_leaves_controller.dart';

class TeacherLeavesBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<TeacherLeavesController>(() => TeacherLeavesController());
  }
}
