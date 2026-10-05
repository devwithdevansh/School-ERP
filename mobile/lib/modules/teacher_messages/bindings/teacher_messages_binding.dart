import 'package:get/get.dart';
import '../controllers/teacher_messages_controller.dart';

class TeacherMessagesBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<TeacherMessagesController>(() => TeacherMessagesController());
  }
}
