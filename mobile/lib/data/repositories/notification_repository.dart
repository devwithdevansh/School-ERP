// lib/data/repositories/notification_repository.dart
// Fetches real notifications from the backend API.
// Falls back to empty list on error so the app never crashes due to notifications.

import 'dart:convert';
import '../models/notification_model.dart';
import '../../core/network/api_client.dart';

class NotificationRepository {
  /// Fetch the parent's notification inbox from the backend.
  /// Returns a sorted list (newest first).
  Future<List<NotificationModel>> getNotifications({int page = 1, int limit = 30}) async {
    try {
      final response = await ApiClient.get('/notifications/inbox?page=$page&limit=$limit');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final data = json['data'];
        final List<dynamic> items = (data is Map ? data['notifications'] : data) ?? [];
        return items
            .map((item) => NotificationModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      print('NotificationRepository.getNotifications error: $e');
    }
    return [];
  }

  /// Fetch the unread notification count for the badge.
  Future<int> getUnreadCount() async {
    try {
      final response = await ApiClient.get('/notifications/inbox/unread-count');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final data = json['data'];
        return (data is Map ? data['unread'] as int? : null) ?? 0;
      }
    } catch (e) {
      print('NotificationRepository.getUnreadCount error: $e');
    }
    return 0;
  }

  /// Mark a specific notification as read.
  Future<void> markAsRead(String notificationId, {String? studentId}) async {
    try {
      await ApiClient.post('/notifications/inbox/$notificationId/read', {
        if (studentId != null) 'studentId': studentId,
      });
    } catch (e) {
      print('NotificationRepository.markAsRead error: $e');
    }
  }

  /// Mark all notifications as read.
  Future<void> markAllAsRead({String? studentId}) async {
    try {
      await ApiClient.post('/notifications/inbox/mark-all-read', {
        if (studentId != null) 'studentId': studentId,
      });
    } catch (e) {
      print('NotificationRepository.markAllAsRead error: $e');
    }
  }
}
