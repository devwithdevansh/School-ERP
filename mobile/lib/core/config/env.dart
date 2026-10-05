import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Central environment configuration, read from `assets/config/app.env`
/// (see that file for every key). A `--dart-define=KEY=value` build flag wins
/// over the file, so CI can point one build at any backend without editing it.
class Env {
  Env._();

  /// Base API path (the backends mount everything under `/api/v1`).
  static const String _apiPath = '/api/v1';

  static String _baseUrl = '';

  // `String.fromEnvironment` only works with a compile-time constant key, so every
  // setting that may be overridden with --dart-define is listed here explicitly.
  static const Map<String, String> _defines = {
    'BACKEND_URL': String.fromEnvironment('BACKEND_URL'),
    'APP_NAME': String.fromEnvironment('APP_NAME'),
    'SCHOOL_NAME': String.fromEnvironment('SCHOOL_NAME'),
    'SCHOOL_TAGLINE': String.fromEnvironment('SCHOOL_TAGLINE'),
    'SCHOOL_WORDMARK': String.fromEnvironment('SCHOOL_WORDMARK'),
    'SCHOOL_WORDMARK_SUB': String.fromEnvironment('SCHOOL_WORDMARK_SUB'),
    'SCHOOL_ADDRESS': String.fromEnvironment('SCHOOL_ADDRESS'),
    'SCHOOL_PHONE': String.fromEnvironment('SCHOOL_PHONE'),
    'SCHOOL_EMAIL': String.fromEnvironment('SCHOOL_EMAIL'),
    'SCHOOL_WEBSITE': String.fromEnvironment('SCHOOL_WEBSITE'),
    'RAZORPAY_KEY_ID': String.fromEnvironment('RAZORPAY_KEY_ID'),
  };

  /// Reads one setting: `--dart-define` first, then the env file, then [fallback].
  static String get(String key, [String fallback = '']) {
    final defined = _defines[key];
    if (defined != null && defined.isNotEmpty) return defined;
    final fromFile = dotenv.maybeGet(key)?.trim();
    return (fromFile == null || fromFile.isEmpty) ? fallback : fromFile;
  }

  /// Single source of truth for the backend URL (including `/api/v1`).
  /// Never hardcode a host anywhere else.
  static String get baseUrl =>
      _baseUrl.isNotEmpty ? _baseUrl : 'http://${_resolveHost()}:3000$_apiPath';

  /// Call from main() after `dotenv.load`.
  static Future<void> init() async {
    var url = get('BACKEND_URL');
    while (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    if (url.endsWith(_apiPath)) url = url.substring(0, url.length - _apiPath.length);
    _baseUrl = url.isEmpty ? '' : '$url$_apiPath';
  }

  /// Host used when BACKEND_URL is empty.
  /// TIP: on a physical device on the same Wi-Fi as the backend, set BACKEND_URL
  /// to `http://<that machine's LAN IP>:3000` instead.
  static String _resolveHost() {
    if (kIsWeb) return 'localhost';
    try {
      // The Android emulator reaches the host machine through 10.0.2.2.
      if (Platform.isAndroid) return '10.0.2.2';
    } catch (_) {
      // Platform isn't available (e.g. a test harness).
    }
    return 'localhost';
  }
}
