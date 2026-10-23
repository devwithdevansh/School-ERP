// lib/core/services/fcm_service.dart
// Handles all Firebase Cloud Messaging lifecycle events.
// Initializes Firebase, requests permission, registers the FCM token with the
// backend, and handles foreground / background / terminated push notifications.

import 'dart:convert';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/storage_keys.dart';
import '../network/api_client.dart';
import '../../modules/dashboard/controllers/dashboard_controller.dart';
import '../../firebase_options.dart';

/// Top-level handler — required by FCM for background/terminated messages.
/// Must be a top-level function (not inside a class).
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  } catch (e) {
    if (!e.toString().contains('duplicate-app')) rethrow;
  }
  
  // We DO NOT show a local notification here if the message already has a notification payload.
  // FCM automatically displays system tray notifications for background apps.
  // Showing a manual local notification here creates a duplicate that has no tap handler,
  // causing the app to just resume without switching students when tapped!
  if (message.notification == null) {
    // Only show local notification if it's a data-only background message
    final localNotifications = FlutterLocalNotificationsPlugin();
    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );
    await localNotifications.initialize(initSettings);
    await FcmService._showLocalNotification(message);
  }
}

class FcmService {
  static final _messaging = FirebaseMessaging.instance;
  static final _localNotifications = FlutterLocalNotificationsPlugin();
  /// True once Firebase initialised (i.e. the school connected its own Firebase project).
  /// Without it the app runs fine, just without push, and never asks for notification permission.
  static bool isAvailable = false;
  static String? initialRoute; // Stores route if app launched from terminated state via push notification
  static String? initialStudentId; // Stores studentId to auto-select

  // Android notification channel
  static const _androidChannel = AndroidNotificationChannel(
    'school_connect_channel_v1',
    'School Updates',
    description: 'Fee alerts and updates from your school',
    importance: Importance.max,
    playSound: true,
  );

  /// Call once from main.dart before runApp().
  static Future<void> init() async {
    // 1. ALWAYS initialize Flutter Local Notifications and Android channel first,
    // so notification bar alerts always work on device even without Firebase!
    try {
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_androidChannel);

      const initSettings = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      );
      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _onNotificationTap,
      );

      // On Android 13+, request runtime POST_NOTIFICATIONS permission
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    } catch (e) {
      debugPrint('Local notifications init error: $e');
    }

    // 2. Initialize Firebase if configured (optional push fallback)
    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      isAvailable = true;

      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        _showLocalNotification(message);
      });

      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        _handleNotificationTap(message);
      });

      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        initialRoute = '/notifications';
        if (initialMessage.data.containsKey('studentId')) {
          initialStudentId = initialMessage.data['studentId'].toString();
        }
      }

      _messaging.onTokenRefresh.listen((newToken) async {
        await _sendTokenToBackend(newToken);
      });
    } on UnsupportedError catch (e) {
      debugPrint('Firebase push not configured: ${e.message}');
    } catch (e) {
      if (!e.toString().contains('duplicate-app')) {
        debugPrint('Firebase init error: $e');
      } else {
        isAvailable = true;
      }
    }

    // 3. Register device token with backend so backend knows this device is active
    await registerToken();
  }

  /// Request permissions manually (usually after showing a custom dialogue)
  static Future<void> requestPermissions() async {
    try {
      if (isAvailable) {
        await _messaging.requestPermission(
          alert: true,
          badge: true,
          sound: true,
        );
      }
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
      await registerToken();
    } catch (e) {
      debugPrint('requestPermissions error: $e');
    }
  }

  /// Get current FCM token or unique persistent device token and register it with the backend.
  static Future<void> registerToken() async {
    try {
      String? token;
      if (isAvailable) {
        try {
          token = await _messaging.getToken();
        } catch (_) {}
      }
      if (token == null || token.isEmpty) {
        // Fallback: persistent unique device ID so backend registers device for this parent
        final prefs = await SharedPreferences.getInstance();
        token = prefs.getString('device_push_token');
        if (token == null || token.isEmpty) {
          token = 'device_${DateTime.now().millisecondsSinceEpoch}_${(100000 + (DateTime.now().microsecond % 900000))}';
          await prefs.setString('device_push_token', token);
        }
      }
      await _sendTokenToBackend(token);
    } catch (e) {
      debugPrint('Device token registration error: $e');
    }
  }

  /// POST the token to the backend endpoint.
  static Future<void> _sendTokenToBackend(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isLoggedIn = prefs.getBool(StorageKeys.isLoggedIn) ?? false;
      if (!isLoggedIn) return;

      final role = prefs.getString(StorageKeys.userRole);
      final endpoint = role == 'teacher'
          ? '/notifications/staff/fcm-token'
          : '/notifications/fcm-token';

      await ApiClient.post(
        endpoint,
        {'token': token, 'platform': 'android'},
      );
      debugPrint('Device token registered with backend: $endpoint');
    } catch (e) {
      debugPrint('Failed to register device token with backend: $e');
    }
  }

  /// Remove the FCM token from the backend on logout.
  static Future<void> removeToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('device_push_token');
      if (token != null && token.isNotEmpty) {
        final role = prefs.getString(StorageKeys.userRole);
        final endpoint = role == 'teacher'
            ? '/notifications/staff/fcm-token'
            : '/notifications/fcm-token';
        await ApiClient.delete(endpoint, {'token': token});
      }
      if (isAvailable) {
        final fcmToken = await _messaging.getToken();
        if (fcmToken != null) {
          await ApiClient.delete('/notifications/fcm-token', {'token': fcmToken});
        }
      }
    } catch (e) {
      debugPrint('FCM token removal error: $e');
    }
  }

  /// Direct method to display a system notification in the phone's top notification bar.
  static Future<void> showNotificationBarAlert({
    required int id,
    required String title,
    required String body,
    Map<String, dynamic>? data,
  }) async {
    try {
      await _localNotifications.show(
        id,
        title,
        body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _androidChannel.id,
            _androidChannel.name,
            channelDescription: _androidChannel.description,
            importance: Importance.max,
            priority: Priority.max,
            icon: '@mipmap/ic_launcher',
            playSound: true,
          ),
        ),
        payload: json.encode(data ?? {}),
      );
    } catch (e) {
      debugPrint('Failed to show notification bar alert: $e');
    }
  }

  /// Show a local notification (for foreground + background messages).
  static Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await showNotificationBarAlert(
      id: notification.hashCode,
      title: notification.title ?? 'School Update',
      body: notification.body ?? '',
      data: message.data,
    );

    // Refresh notifications real-time on dashboard if it's currently loaded
    if (Get.isRegistered<DashboardController>()) {
      Get.find<DashboardController>().refreshNotifications();
    }
  }

  /// Navigate to the Notifications screen when a notification is tapped.
  static void _handleNotificationTap(RemoteMessage message) {
    _navigateToNotifications(message.data);
  }

  /// Local notification tap handler.
  static void _onNotificationTap(NotificationResponse response) {
    if (response.payload != null) {
      try {
        final Map<String, dynamic> data = json.decode(response.payload!);
        _navigateToNotifications(data);
      } catch (e) {
        Get.toNamed('/notifications');
      }
    } else {
      Get.toNamed('/notifications');
    }
  }

  static Future<void> _navigateToNotifications(Map<String, dynamic> data) async {
    if (data.containsKey('studentId')) {
      FcmService.initialStudentId = data['studentId'].toString();
    }

    if (!Get.isRegistered<DashboardController>()) {
      Get.put<DashboardController>(DashboardController(), permanent: true);
    }

    if (Get.isRegistered<DashboardController>()) {
      final controller = Get.find<DashboardController>();
      bool switched = false;
      
      if (data.containsKey('studentId')) {
        final String sId = data['studentId'].toString();
        final s = controller.students.firstWhereOrNull((student) => student.id == sId);
        if (s != null && s.id != controller.student.value?.id) {
          await controller.switchStudent(s);
          switched = true;
        }
      }
      
      if (!switched) {
        await controller.refreshNotifications();
      }
    }
    
    // Clear initialStudentId so subsequent manual student switches aren't overridden
    FcmService.initialStudentId = null;

    if (Get.currentRoute == '/notifications') {
      return;
    }
    
    Get.until((route) => route.settings.name == '/dashboard' || route.isFirst);
    Future.delayed(const Duration(milliseconds: 200), () {
      if (Get.currentRoute != '/notifications') {
        Get.toNamed('/notifications');
      }
    });
  }
}
