import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/widgets/custom_button.dart';
import '../controllers/onboarding_controller.dart';
import 'package:flutter_animate/flutter_animate.dart';

class OnboardingView extends GetView<OnboardingController> {
  const OnboardingView({super.key});

  static List<_OnboardPage> get _pages => [
    _OnboardPage(
      icon: Icons.account_balance_wallet_rounded,
      iconColor: AppColors.accent,
      iconBg: AppColors.primaryLight,
      title: 'Track Fees\nEasily',
      subtitle: 'Stay on top of every fee deadline and never miss a payment for your child.',
    ),
    _OnboardPage(
      icon: Icons.receipt_long_rounded,
      iconColor: AppColors.teal,
      iconBg: AppColors.tealPale,
      title: 'Instant\nReceipts',
      subtitle: 'Download digital receipts for every payment made — anytime, anywhere.',
    ),
    _OnboardPage(
      icon: Icons.notifications_active_rounded,
      iconColor: AppColors.primaryMid,
      iconBg: AppColors.primaryLight,
      title: 'Smart\nReminders',
      subtitle: 'Get notified before due dates so you\'re always prepared and never charged late fees.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: controller.pageController,
                onPageChanged: controller.onPageChanged,
                itemCount: _pages.length,
                itemBuilder: (_, i) => _pages[i],
              ),
            ),
            // Dots + CTA
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: Column(
                children: [
                  Obx(() => Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _pages.length,
                          (i) => AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            width: controller.currentPage.value == i ? 24 : 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: controller.currentPage.value == i
                                  ? AppColors.primaryMid
                                  : AppColors.border,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ),
                      )),
                  const SizedBox(height: 32),
                  Obx(() => CustomButton(
                        label: controller.currentPage.value == _pages.length - 1
                            ? 'Get Started'
                            : 'Next',
                        onTap: controller.next,
                      )),
                  if (true) ...[
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: controller.skip,
                      child: Text('Skip', style: AppTextStyles.labelLarge.copyWith(color: AppColors.inkLight)),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardPage extends StatelessWidget {
  final IconData? icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String subtitle;
  final String? imageAsset;

  const _OnboardPage({
    this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.subtitle,
    this.imageAsset,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            padding: imageAsset != null ? const EdgeInsets.all(16) : null,
            child: imageAsset != null
                ? Image.asset(imageAsset!, fit: BoxFit.contain)
                : Icon(icon, size: 60, color: iconColor),
          ),
          const SizedBox(height: 48),
          Text(title, style: AppTextStyles.displayMedium, textAlign: TextAlign.center)
              .animate().fade(duration: 400.ms).slideY(begin: 0.2),
          const SizedBox(height: 16),
          Text(subtitle, style: AppTextStyles.bodyMedium, textAlign: TextAlign.center)
              .animate().fade(delay: 200.ms).slideY(begin: 0.2),
        ],
      ),
    );
  }
}
