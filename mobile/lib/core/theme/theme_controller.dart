import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/storage_keys.dart';
import 'app_colors.dart';

/// Owns the app's dark/light preference.
///
/// Most screens read [AppColors] tokens directly (not via `Theme.of`), so a
/// plain `ThemeMode` switch on `MaterialApp` alone wouldn't repaint them.
/// Instead we flip [AppColors.isDark] and force the whole app to rebuild
/// with `Get.forceAppUpdate()` — the standard GetX escape hatch for state
/// that lives outside the widget tree.
class ThemeController extends GetxController {
  final RxBool isDark = false.obs;

  static ThemeController get to => Get.find();

  Future<void> loadFromDisk() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getBool(StorageKeys.isDarkMode) ?? false;
    isDark.value = saved;
    AppColors.isDark = saved;
  }

  Future<void> toggleTheme() async {
    isDark.value = !isDark.value;
    AppColors.isDark = isDark.value;
    HapticFeedback.selectionClick();
    Get.forceAppUpdate();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(StorageKeys.isDarkMode, isDark.value);
  }
}
