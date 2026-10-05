import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/storage_keys.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/services/fcm_service.dart';

class SplashController extends GetxController {
  @override
  void onInit() {
    super.onInit();
    _navigate();
  }

  Future<void> _navigate() async {
    try {
      // Matches the splash brand-reveal animation (~2.4s) plus a short hold.
      await Future.delayed(const Duration(milliseconds: 2900));
      final prefs = await SharedPreferences.getInstance();
      
      final isOnboarded = prefs.getBool(StorageKeys.isOnboarded) ?? false;
      final isLoggedIn = prefs.getBool(StorageKeys.isLoggedIn) ?? false;
      final parentId = prefs.getString(StorageKeys.parentId) ?? '';

      if (!isOnboarded) {
        Get.offAllNamed(AppRoutes.onboarding);
      } else if (!isLoggedIn || parentId.isEmpty) {
        Get.offAllNamed(AppRoutes.login);
      } else {
        Get.offAllNamed(AppRoutes.dashboard);
        
        // Handle deep-link from push notification if app was terminated
        if (FcmService.initialRoute != null) {
          Get.toNamed(FcmService.initialRoute!);
          FcmService.initialRoute = null; // Clear so it only triggers once
        }
      }
    } catch (e) {
      Get.offAllNamed(AppRoutes.login);
    }
  }
}
