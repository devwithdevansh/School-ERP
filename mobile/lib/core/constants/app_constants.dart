import '../config/school_brand.dart';

class AppConstants {
  static String get appName         => SchoolBrand.appName;
  static const String appVersion    = '1.0.0';
  /// Current academic year label (a new year starts in June), e.g. "2026-27".
  static String get academicYear {
    final now = DateTime.now();
    final start = now.month >= 6 ? now.year : now.year - 1;
    final end = ((start + 1) % 100).toString().padLeft(2, '0');
    return '$start-$end';
  }

  // Durations
  static const Duration splashDuration       = Duration(seconds: 3);
  static const Duration animationFast        = Duration(milliseconds: 200);
  static const Duration animationNormal      = Duration(milliseconds: 350);
  static const Duration animationSlow        = Duration(milliseconds: 600);

  // Paddings
  static const double paddingXS  = 4.0;
  static const double paddingS   = 8.0;
  static const double paddingM   = 16.0;
  static const double paddingL   = 24.0;
  static const double paddingXL  = 32.0;

  // Radius
  static const double radiusS    = 8.0;
  static const double radiusM    = 12.0;
  static const double radiusL    = 16.0;
  static const double radiusXL   = 24.0;
}
