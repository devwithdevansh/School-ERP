import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// Generic placeholder screen for modules that are not built yet.
/// Keeps the dashboard grid fully tappable while each module is
/// developed one at a time.
class ComingSoonView extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final String? description;

  const ComingSoonView({
    super.key,
    required this.title,
    required this.icon,
    required this.color,
    this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        elevation: 0,
        title: Text(title, style: AppTextStyles.h2),
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded,
              color: AppColors.ink, size: 20),
          onPressed: () => Get.back(),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 44),
              ),
              const SizedBox(height: 24),
              Text('$title — Coming Soon', style: AppTextStyles.h2, textAlign: TextAlign.center),
              const SizedBox(height: 10),
              Text(
                description ??
                    'This module is under development and will be available in an upcoming update.',
                style: AppTextStyles.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
