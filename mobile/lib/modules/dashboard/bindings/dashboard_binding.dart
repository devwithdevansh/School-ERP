import 'package:get/get.dart';
import '../controllers/dashboard_controller.dart';

class DashboardBinding extends Bindings {
  @override
  void dependencies() {
    // Permanent, not fenix: many screens (Profile, Messages, teacher_*)
    // call Get.find<DashboardController>() assuming its state (students,
    // activeProfile, isTeacher) survives navigation. fenix disposes the
    // controller once nothing is "using" it and recreates a fresh instance
    // on the next find() -- for a dual-role account in teacher view, that
    // fresh instance's init only loads teacher data, never re-fetching the
    // parent's student list, which silently emptied the sibling switcher.
    if (!Get.isRegistered<DashboardController>()) {
      Get.put<DashboardController>(DashboardController(), permanent: true);
    }
  }
}
