import 'client_context.dart';
import 'env.dart';

/// Everything school-specific that parents see. Values come from
/// `assets/config/app.env`, so one build can be re-skinned for any school
/// without touching widgets. (Colours live in `core/design/tokens.dart`.)
class SchoolBrand {
  SchoolBrand._();

  static String get appName => Env.get('APP_NAME', 'School Connect');
  /// The app's own SCHOOL_NAME wins; otherwise the school name the backend reported at login.
  static String get schoolName {
    final configured = Env.get('SCHOOL_NAME');
    if (configured.isNotEmpty) return configured;
    return ClientContext.name ?? 'Your School Name';
  }
  static String get tagline => Env.get('SCHOOL_TAGLINE', 'Learning, together');

  /// Short word for the splash screen (upper-cased, max ~10 letters look best).
  static String get wordmark => Env.get('SCHOOL_WORDMARK', 'SCHOOL').toUpperCase();

  /// Second splash line under the wordmark.
  static String get wordmarkSub => Env.get('SCHOOL_WORDMARK_SUB', 'CONNECT').toUpperCase();

  static String get address => Env.get('SCHOOL_ADDRESS');
  static String get phone => Env.get('SCHOOL_PHONE');
  static String get email => Env.get('SCHOOL_EMAIL');
  static String get website => Env.get('SCHOOL_WEBSITE');

  /// OPTIONAL school logo. The generic app ships without one; drop your file at this path and add it to
  /// pubspec assets and receipts will print it. Nothing else in the app shows a logo.
  static const String logoAsset = 'assets/images/logo.png';

  /// "Ph: … | email" style contact line for receipts; skips blank parts.
  static String get contactLine => [
        if (phone.isNotEmpty) 'Ph: $phone',
        if (email.isNotEmpty) email,
        if (website.isNotEmpty) website,
      ].join('  |  ');
}
