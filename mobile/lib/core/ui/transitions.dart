import 'package:animations/animations.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../theme/app_colors.dart';

/// Default screen transition: Material "shared axis (scaled)" — the new
/// screen grows in from 80% while the old one scales past and fades. Reads
/// as moving *deeper* into the app, which fits a hub-and-spoke layout.
class AppTransition extends CustomTransition {
  @override
  Widget buildTransition(
    BuildContext context,
    Curve? curve,
    Alignment? alignment,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return SharedAxisTransition(
      animation: animation,
      secondaryAnimation: secondaryAnimation,
      transitionType: SharedAxisTransitionType.scaled,
      fillColor: AppColors.bg,
      child: child,
    );
  }
}
