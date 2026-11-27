import 'package:get/get.dart';
import '../controllers/student_voice_controller.dart';

class StudentVoiceBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<StudentVoiceController>(() => StudentVoiceController());
  }
}
