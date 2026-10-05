import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

/// Loads staff-bypass credentials from a local, gitignored JSON asset
/// (assets/config/staff_config.json) instead of hardcoding them in source.
///
/// SECURITY NOTE — please read before relying on this:
/// Keeping this file out of git stops the credentials from leaking through
/// your GitHub history, but it does NOT stop them from being extracted from
/// a built APK/IPA. Flutter bundles whatever is on disk at build time
/// straight into the compiled app, and Dart string constants / JSON assets
/// are trivially recoverable with free tools (apktool, jadx, etc).
/// Anyone who downloads the published app can pull this staff login back
/// out. Treat this as a temporary workaround, not a real fix — the durable
/// fix is parent-scoped backend endpoints (see ApiClient docstring) so the
/// app never needs to carry staff-level credentials at all.
class StaffConfig {
  static Map<String, dynamic>? _cached;

  static Future<Map<String, dynamic>> _load() async {
    if (_cached != null) return _cached!;
    try {
      final raw = await rootBundle.loadString('assets/config/staff_config.json');
      _cached = json.decode(raw) as Map<String, dynamic>;
    } catch (e) {
      // Missing/invalid file (e.g. fresh checkout that only has the
      // .example template). Fail soft so the app doesn't crash —
      // ApiClient will simply be unable to obtain a staff token.
      // ignore: avoid_print
      print(
        'StaffConfig: could not load assets/config/staff_config.json ($e). '
        'Copy assets/config/staff_config.example.json to '
        'assets/config/staff_config.json and fill in real credentials.',
      );
      _cached = <String, dynamic>{};
    }
    return _cached!;
  }

  static Future<String> get email async => (await _load())['staffEmail'] as String? ?? '';
  static Future<String> get password async => (await _load())['staffPassword'] as String? ?? '';
}
