// File generated from your project: school-erp-12159 (google-services.json)
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions have not been configured for web',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAebqERp6oAyyCDr5V6OFaHJbELkeerO6s',
    appId: '1:393684099106:android:35d34c0ad6a68008246a7b',
    messagingSenderId: '393684099106',
    projectId: 'school-erp-12159',
    storageBucket: 'school-erp-12159.firebasestorage.app',
  );
}
