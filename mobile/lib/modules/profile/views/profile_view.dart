
import '../../../core/config/client_context.dart';
import '../../../core/config/school_brand.dart';
import '../../../core/constants/app_constants.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/constants/storage_keys.dart';
import '../../../core/services/fcm_service.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/ui/ui.dart';
import '../../dashboard/controllers/dashboard_controller.dart';
import '../../../services/sound_service.dart';
import 'package:flutter_animate/flutter_animate.dart';

class ProfileView extends StatelessWidget {
  const ProfileView({super.key});

  Future<void> _logout() async {
    SoundService.instance.play(AppSound.pop);

    // Unregister FCM token from backend to stop receiving notifications
    await FcmService.removeToken();

    final prefs = await SharedPreferences.getInstance();
    const secureStorage = FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    );
    try {
      await secureStorage.delete(key: StorageKeys.accessToken);
      await secureStorage.delete(key: 'refresh_token');
      await secureStorage.delete(key: StorageKeys.parentAccessToken);
      await secureStorage.delete(key: StorageKeys.teacherAccessToken);
      await secureStorage.delete(key: StorageKeys.parentRefreshToken);
      await secureStorage.delete(key: StorageKeys.teacherRefreshToken);
    } catch (e) {
      print('Error deleting tokens during logout: $e');
    }
    await prefs.remove(StorageKeys.parentId);
    await prefs.remove(StorageKeys.studentId);
    await prefs.remove(StorageKeys.phone);
    await prefs.remove(StorageKeys.staffId);
    await prefs.remove(StorageKeys.staffName);
    await prefs.remove(StorageKeys.userRole);
    await prefs.remove(StorageKeys.hasDualRole);
    await prefs.setBool(StorageKeys.isLoggedIn, false);
    await ClientContext.clear();

    // DashboardController is permanent -- clear its state now so a
    // subsequent login (same device, same app process) doesn't briefly show
    // this session's leftover data before its own load completes.
    if (Get.isRegistered<DashboardController>()) {
      await Get.find<DashboardController>().reinitialize();
    }

    Get.offAllNamed(AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    if (!Get.isRegistered<DashboardController>()) {
      Get.put<DashboardController>(DashboardController(), permanent: true);
    }
    final controller = Get.find<DashboardController>();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const AppPageBar(title: 'My profile'),
      body: Obx(() {
        final isTeacherView = controller.activeProfile.value == 'teacher';
        final s = controller.student.value;
        if (!isTeacherView && s == null) {
          return const Center(child: Text('No student records found'));
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.1), width: 1),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryMid.withValues(alpha: 0.3),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      width: 84,
                      height: 84,
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(shape: BoxShape.circle, gradient: AppColors.accentGradient),
                      child: ClipOval(
                        child: Container(
                          color: Brand.deep,
                          alignment: Alignment.center,
                          child: isTeacherView || s == null
                              ? Text(
                                  controller.teacherInitials.value,
                                  style: AppTextStyles.displayMedium.copyWith(color: Colors.white, fontSize: 28),
                                )
                              : StudentImageWidget(
                                  photoUrl: s.photoUrl,
                                  width: 84,
                                  height: 84,
                                  fit: BoxFit.cover,
                                  fallback: Center(
                                    child: Text(
                                      s.initials,
                                      style: AppTextStyles.displayMedium.copyWith(color: Colors.white, fontSize: 28),
                                    ),
                                  ),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(isTeacherView ? controller.teacherName.value : s!.name, style: AppTextStyles.h2.copyWith(color: Colors.white)),
                    const SizedBox(height: 4),
                    Text(
                      isTeacherView ? 'Teacher' : 'Student Code: ${s!.studentCode}',
                      style: AppTextStyles.bodyMedium.copyWith(color: Colors.white70),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              if (isTeacherView) ...[
                Text('Today', style: AppTextStyles.h2),
                const SizedBox(height: 12),
                SurfaceCard(
                  child: Column(
                    children: [
                      _buildInfoRow('Classes Today', '${controller.teacherTodayClasses.length}'),
                      Divider(height: 24, color: AppColors.border),
                      _buildInfoRow('Pending Leave Requests', '${controller.teacherPendingLeavesCount.value}'),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ] else ...[
              Text('Academic Details', style: AppTextStyles.h2),
              const SizedBox(height: 12),
              SurfaceCard(
                child: Column(
                  children: [
                    _buildInfoRow('Standard', s!.standard),
                    Divider(height: 24, color: AppColors.border),
                    _buildInfoRow('Division', s.division),
                    Divider(height: 24, color: AppColors.border),
                    _buildInfoRow('Medium', s.medium),
                    Divider(height: 24, color: AppColors.border),
                    _buildInfoRow('Transport Route', s.transportType.isEmpty ? 'None' : s.transportType),
                    Divider(height: 24, color: AppColors.border),
                    _buildInfoRow('RTE Status', s.isRTE ? 'Yes' : 'No'),
                    Divider(height: 24, color: AppColors.border),
                    _buildInfoRow(
                      'Fee Status',
                      controller.totalPending.value <= 0 ? 'All Paid' : 'Pending',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              ],

              Text('School Details', style: AppTextStyles.h2),
              const SizedBox(height: 12),
              SurfaceCard(
                child: Column(
                  children: [
                    _buildInfoRow('School Name', SchoolBrand.schoolName),
                    Divider(height: 24, color: AppColors.border),
                    _buildInfoRow('Academic Year', AppConstants.academicYear),
                  ],
                ),
              ).animate().fade(delay: 250.ms).slideY(begin: 0.2, curve: Curves.easeOutQuad),
              const SizedBox(height: 24),
              Text('App Settings', style: AppTextStyles.h2),
              const SizedBox(height: 12),
              SurfaceCard(
                padding: EdgeInsets.zero,
                child: Material(
                  color: Colors.transparent,
                  child: Column(
                    children: [
                      Obx(() => SwitchListTile(
                            title: Text('Dark Mode', style: AppTextStyles.bodyMedium),
                            secondary: Icon(
                              ThemeController.to.isDark.value
                                  ? Icons.dark_mode_rounded
                                  : Icons.light_mode_rounded,
                              color: AppColors.primaryMid,
                            ),
                            value: ThemeController.to.isDark.value,
                            activeColor: AppColors.primaryMid,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            onChanged: (_) => ThemeController.to.toggleTheme(),
                          )),
                      Divider(height: 1, color: AppColors.border),
                      StatefulBuilder(
                        builder: (context, setState) {
                          return SwitchListTile(
                            title: Text('App Sounds', style: AppTextStyles.bodyMedium),
                            secondary: Icon(Icons.volume_up_rounded, color: AppColors.primaryMid),
                            value: SoundService.instance.soundEnabled,
                            activeColor: AppColors.primaryMid,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            onChanged: (val) async {
                              SoundService.instance.play(AppSound.toggle);
                              await SoundService.instance.setSoundEnabled(val);
                              setState(() {});
                            },
                          );
                        }
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Logout Button
              ElevatedButton.icon(
                onPressed: _logout,
                icon: const Icon(Icons.logout_rounded, color: Colors.white),
                label: const Text('Log Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.red,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTextStyles.bodyMedium),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            value,
            style: AppTextStyles.labelLarge,
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }
}
