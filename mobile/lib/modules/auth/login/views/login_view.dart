import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/config/school_brand.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_textfield.dart';
import '../../../../core/ui/ui.dart';
import '../../../../core/utils/validators.dart';
import '../controllers/login_controller.dart';

class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _mobileController = TextEditingController();
  final _passwordController = TextEditingController();
  late final LoginController _controller;

  @override
  void initState() {
    super.initState();
    _controller = Get.find<LoginController>();
  }

  @override
  void dispose() {
    _mobileController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showRoleSelectionSheet(BuildContext context, Map<String, dynamic> clashData, String phone) {
    final teacherUser = (clashData['teacher'] as Map<String, dynamic>?)?['user'] as Map<String, dynamic>?;
    final teacherName = teacherUser?['name'] as String? ?? 'Teacher';

    showModalBottomSheet<void>(
      context: context,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.inkLight.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text('Select Account', style: AppTextStyles.h1),
                const SizedBox(height: 6),
                Text(
                  'This mobile number is registered as both a Teacher and a Student/Parent. Please select how you would like to continue.',
                  style: AppTextStyles.bodyMedium,
                ),
                const SizedBox(height: 24),
                // Teacher Card Option
                InkWell(
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _controller.selectClashRole(
                      role: LoginRole.teacher,
                      data: clashData,
                      phone: phone,
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.primaryMid.withOpacity(0.3), width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                      color: AppColors.primaryMid.withOpacity(0.04),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.primaryMid.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(Icons.school_rounded, color: AppColors.primaryMid, size: 28),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Teacher Account', style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text(teacherName, style: AppTextStyles.bodySmall.copyWith(color: AppColors.inkLight)),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: AppColors.inkLight),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Student/Parent Card Option
                InkWell(
                  onTap: () {
                    Navigator.of(ctx).pop();
                    _controller.selectClashRole(
                      role: LoginRole.student,
                      data: clashData,
                      phone: phone,
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.primaryMid.withOpacity(0.3), width: 1.5),
                      borderRadius: BorderRadius.circular(12),
                      color: AppColors.primaryMid.withOpacity(0.04),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.primaryMid.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(Icons.family_restroom_rounded, color: AppColors.primaryMid, size: 28),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Student / Parent Account', style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text('View attendance, homework & fees', style: AppTextStyles.bodySmall.copyWith(color: AppColors.inkLight)),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: AppColors.inkLight),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final heroHeight = (size.height * 0.34).clamp(220.0, 320.0);
    final reduce = Motion.reduced(context);
    Duration d(int ms) => reduce ? Duration.zero : Duration(milliseconds: ms);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          // ── Brand hero ────────────────────────────────────────────────
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            height: heroHeight + 28,
            child: DecoratedBox(
              decoration: BoxDecoration(gradient: AppColors.primaryGradient),
              child: Stack(
                clipBehavior: Clip.hardEdge,
                children: [
                  Positioned(right: -60, top: -50, child: _LoginOrb(size: 230, color: Brand.accent, seconds: 8)),
                  Positioned(left: -70, bottom: -40, child: _LoginOrb(size: 200, color: Brand.accentDeep, seconds: 10)),
                  SafeArea(
                    child: Align(
                      alignment: Alignment.center,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              SchoolBrand.schoolName,
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTextStyles.displayMedium.copyWith(color: Colors.white),
                            ).animate().fadeIn(delay: d(250), duration: d(500)).slideY(begin: 0.3, end: 0, duration: d(500), curve: Motion.emphasized),
                            const SizedBox(height: 2),
                            Text(
                              SchoolBrand.appName.toUpperCase(),
                              style: AppTextStyles.labelSmall.copyWith(color: Colors.white.withValues(alpha: 0.6), letterSpacing: 2.4),
                            ).animate().fadeIn(delay: d(400), duration: d(500)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Form card, slides up over the hero ────────────────────────
          Positioned.fill(
            top: heroHeight,
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: Elevation.of(SurfaceLevel.floating),
              ),
              child: SafeArea(
                top: false,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Welcome back', style: AppTextStyles.displayMedium),
                        const SizedBox(height: 6),
                        Text(
                          'Enter your 10-digit mobile number and password to log in.',
                          style: AppTextStyles.bodyMedium,
                        ),
                        const SizedBox(height: 24),
                        CustomTextField(
                          label: 'Mobile Number',
                          hint: '98765 43210',
                          controller: _mobileController,
                          validator: Validators.phone,
                          keyboardType: TextInputType.phone,
                          maxLength: 10,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          prefix: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text('+91', style: AppTextStyles.bodyLarge.copyWith(color: AppColors.ink)),
                          ),
                        ).animate().fadeIn(delay: d(350)).slideY(begin: 0.25, end: 0, duration: d(450), curve: Motion.emphasized),
                        const SizedBox(height: 16),
                        CustomTextField(
                          label: 'Password',
                          hint: '••••••••',
                          controller: _passwordController,
                          obscureText: true,
                          validator: (val) {
                            if (val == null || val.isEmpty) return 'Password is required';
                            return null;
                          },
                        ).animate().fadeIn(delay: d(450)).slideY(begin: 0.25, end: 0, duration: d(450), curve: Motion.emphasized),
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: _controller.goToOnboarding,
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              'Forgot Password?',
                              style: AppTextStyles.bodyMedium.copyWith(
                                color: AppColors.primaryMid,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ).animate().fadeIn(delay: d(500)),
                        const SizedBox(height: 20),
                        Obx(() => CustomButton(
                              label: 'Login',
                              loading: _controller.isLoading.value,
                              onTap: () {
                                if (_formKey.currentState!.validate()) {
                                  final phone = _mobileController.text.trim();
                                  _controller.login(
                                    mobileNumber: phone,
                                    password: _passwordController.text,
                                    onDualRoleClash: (clashData) {
                                      _showRoleSelectionSheet(context, clashData, phone);
                                    },
                                  );
                                }
                              },
                            )).animate().fadeIn(delay: d(560)).slideY(begin: 0.25, end: 0, duration: d(450), curve: Motion.emphasized),
                        const SizedBox(height: 16),
                        Center(
                          child: TextButton(
                            onPressed: _controller.goToOnboarding,
                            child: Text(
                              'First time here? Set up password',
                              style: AppTextStyles.labelLarge.copyWith(color: AppColors.primaryMid),
                            ),
                          ).animate().fadeIn(delay: d(650)),
                        ),
                        const SizedBox(height: 8),
                        Center(
                          child: Text(
                            'By continuing, you agree to our Terms & Privacy Policy.',
                            style: AppTextStyles.bodySmall,
                            textAlign: TextAlign.center,
                          ).animate().fadeIn(delay: d(750)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          )
              .animate()
              .slideY(begin: 0.12, end: 0, duration: d(600), curve: Motion.emphasized)
              .fadeIn(duration: d(400)),
        ],
      ),
    );
  }
}

/// Slowly drifting radial blob used behind the login hero.
class _LoginOrb extends StatelessWidget {
  final double size;
  final Color color;
  final int seconds;

  const _LoginOrb({required this.size, required this.color, required this.seconds});

  @override
  Widget build(BuildContext context) {
    final orb = IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color.withValues(alpha: 0.5), color.withValues(alpha: 0)]),
        ),
      ),
    );
    if (Motion.reduced(context)) return orb;
    return orb
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .move(begin: Offset.zero, end: const Offset(16, 12), duration: Duration(seconds: seconds), curve: Curves.easeInOut)
        .scaleXY(begin: 1, end: 1.12, duration: Duration(seconds: seconds), curve: Curves.easeInOut);
  }
}
