import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

/// The one app bar used by every inner page, so student and teacher screens
/// share the same surface color, title style and back affordance in both
/// themes.
class AppPageBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? actions;
  final bool showBack;
  final PreferredSizeWidget? bottom;

  const AppPageBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
    this.showBack = true,
    this.bottom,
  });

  @override
  Size get preferredSize => Size.fromHeight(
        kToolbarHeight + (subtitle != null ? 6 : 0) + (bottom?.preferredSize.height ?? 0),
      );

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      systemOverlayStyle:
          AppColors.isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      shape: Border(bottom: BorderSide(color: AppColors.border)),
      leading: showBack
          ? IconButton(
              tooltip: 'Back',
              icon: Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.ink, size: 20),
              onPressed: () => Get.back(),
            )
          : null,
      automaticallyImplyLeading: false,
      title: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title, style: AppTextStyles.h2),
          if (subtitle != null)
            Text(subtitle!, style: AppTextStyles.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
      actions: actions,
      bottom: bottom,
    );
  }
}
