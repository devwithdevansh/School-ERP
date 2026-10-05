import 'package:get/get.dart';
import '../controllers/teacher_marks_controller.dart';

class TeacherMarksBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<TeacherMarksController>(() => TeacherMarksController());
  }
}
