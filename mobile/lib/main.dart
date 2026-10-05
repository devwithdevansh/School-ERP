import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'core/routes/app_pages.dart';
import 'core/routes/app_routes.dart';
import 'core/config/client_context.dart';
import 'core/config/env.dart';
import 'core/config/school_brand.dart';
import 'core/services/fcm_service.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'core/design/motion.dart';
import 'core/ui/transitions.dart';
import 'services/sound_service.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: 'assets/config/app.env');
  await Env.init();
  await ClientContext.load();
  await SoundService.instance.init();

  final themeController = Get.put(ThemeController());
  await themeController.loadFromDisk();

  // Initialize Firebase & FCM push notifications
  // Errors here are caught gracefully — the app still runs without push support
  try {
    await FcmService.init();
  } catch (e) {
    debugPrint('FCM init failed (non-critical): $e');
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: SchoolBrand.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      customTransition: AppTransition(),
      transitionDuration: Motion.screen,
      initialRoute: AppRoutes.splash,
      getPages: AppPages.pages,
    );
  }
}
