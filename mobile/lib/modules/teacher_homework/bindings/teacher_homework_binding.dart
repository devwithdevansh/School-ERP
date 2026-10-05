import 'package:get/get.dart';
import '../controllers/teacher_homework_controller.dart';

class TeacherHomeworkBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<TeacherHomeworkController>(() => TeacherHomeworkController());
  }
}
