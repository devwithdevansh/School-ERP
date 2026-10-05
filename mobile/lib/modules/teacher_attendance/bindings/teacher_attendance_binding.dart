import 'package:get/get.dart';
import '../controllers/teacher_attendance_controller.dart';

class TeacherAttendanceBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<TeacherAttendanceController>(() => TeacherAttendanceController());
  }
}
