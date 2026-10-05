// PLACEHOLDER — push notifications are OFF until you connect your own Firebase project.
//
//   1. Create a Firebase project and run, from the `mobile/` folder:
//        dart pub global activate flutterfire_cli
//        flutterfire configure
//      This REPLACES this file with real options for your project
//      (and adds android/app/google-services.json + ios/Runner/GoogleService-Info.plist).
//   2. Android: add the Google services Gradle plugin, see mobile/README.md → "Push notifications".
//
// Until then `FcmService.init()` catches the UnsupportedError below and the app
// simply runs without push (everything else works).
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform => throw UnsupportedError(
        'Firebase is not configured for this build. Run `flutterfire configure` (see mobile/README.md).',
      );
}
