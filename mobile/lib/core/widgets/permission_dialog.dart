import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import 'custom_button.dart';

class PermissionSheet extends StatelessWidget {
  final VoidCallback onAllow;
  final VoidCallback onDeny;

  const PermissionSheet({
    super.key,
    required this.onAllow,
    required this.onDeny,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(18),
          topRight: Radius.circular(18),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 20,
            spreadRadius: 5,
          )
        ],
      ),
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          // Icon with glowing effect
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [AppColors.primaryLight, Colors.white],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryMid.withOpacity(0.3),
                  blurRadius: 24,
                  spreadRadius: -4,
                  offset: const Offset(0, 8),
                )
              ],
            ),
            child: Icon(
              Icons.notifications_active_rounded,
              color: AppColors.primaryMid,
              size: 48,
            ),
          ).animate().scale(delay: 200.ms, duration: 500.ms, curve: Curves.easeOutBack),
          
          const SizedBox(height: 28),
          
          Text(
            'Never Miss an Update',
            style: AppTextStyles.h2.copyWith(color: AppColors.ink, fontSize: 22, fontWeight: FontWeight.w800),
            textAlign: TextAlign.center,
          ).animate().fade(delay: 300.ms).slideY(begin: 0.2, curve: Curves.easeOut),
          
          const SizedBox(height: 12),
          
          Text(
            'Allow notifications to receive instant fee reminders, payment receipts, and important school announcements directly on your device.',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.inkLight, height: 1.5),
            textAlign: TextAlign.center,
          ).animate().fade(delay: 400.ms).slideY(begin: 0.2, curve: Curves.easeOut),
          
          const SizedBox(height: 36),
          
          CustomButton(
            label: 'Enable Notifications',
            onTap: onAllow,
          ).animate().fade(delay: 500.ms).scale(curve: Curves.easeOutBack),
          
          const SizedBox(height: 12),
          
          TextButton(
            onPressed: onDeny,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.inkLight,
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              'Maybe Later',
              style: AppTextStyles.labelLarge.copyWith(
                color: AppColors.inkLight,
                fontWeight: FontWeight.w600,
              ),
            ),
          ).animate().fade(delay: 600.ms),
        ],
      ),
    );
  }
}
