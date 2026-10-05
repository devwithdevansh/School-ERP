import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'tokens.dart';

class Space {
  Space._();
  static const double xxs = 4;
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 20;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 40;
}

class Radii {
  Radii._();
  // Deliberately tight corners (matches the web admin): cards 12, sheets 16.
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
}

enum SurfaceLevel { flat, raised, floating }

class Elevation {
  Elevation._();

  static List<BoxShadow> of(SurfaceLevel level) {
    final dark = AppColors.isDark;
    final tint = dark ? Colors.black : Brand.deep;
    // light mode: a faint indigo-tinted shadow reads softer than neutral grey
    return switch (level) {
      SurfaceLevel.flat => const [],
      SurfaceLevel.raised => [
          BoxShadow(
            color: tint.withValues(alpha: dark ? 0.28 : 0.06),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      SurfaceLevel.floating => [
          BoxShadow(
            color: tint.withValues(alpha: dark ? 0.45 : 0.12),
            blurRadius: 36,
            offset: const Offset(0, 16),
          ),
          BoxShadow(
            color: tint.withValues(alpha: dark ? 0.2 : 0.04),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
    };
  }
}
