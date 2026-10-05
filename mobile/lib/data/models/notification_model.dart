// lib/data/models/notification_model.dart
// Represents a single notification from the backend inbox API.

class NotificationModel {
  final String id;
  final String title;
  final String body;
  final String type; // 'BROADCAST' | 'PAYMENT_RECEIVED' | 'FEE_REMINDER' | 'SYSTEM'
  final String createdAt;
  final List<String> targetStudentIds; // Empty if broadcast, else contains target student IDs
  
  // For backward compatibility (read by parent without studentId)
  bool _isGloballyRead;
  // Specific students who have read this
  final List<String> readByStudents;

  NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.createdAt,
    this.targetStudentIds = const [],
    required bool isRead,
    this.readByStudents = const [],
  }) : _isGloballyRead = isRead;

  bool get isRead => _isGloballyRead;
  set isRead(bool val) => _isGloballyRead = val;

  bool isReadFor(String sId) {
    if (_isGloballyRead) return true;
    return readByStudents.contains(sId);
  }

  void markAsReadFor(String sId) {
    if (!readByStudents.contains(sId)) {
      readByStudents.add(sId);
    }
  }

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    List<String> tStudents = [];
    if (json['targetStudentIds'] != null && json['targetStudentIds'] is List) {
      tStudents = (json['targetStudentIds'] as List).map((e) => e.toString()).toList();
    }
    
    if (json['metadata'] != null && json['metadata'] is Map) {
      final meta = json['metadata'] as Map;
      if (meta['studentId'] != null) {
        final sId = meta['studentId'].toString();
        if (!tStudents.contains(sId)) {
          tStudents.add(sId);
        }
      }
    }

    List<String> readStudents = [];
    if (json['readByStudents'] != null && json['readByStudents'] is List) {
      readStudents = (json['readByStudents'] as List).map((e) => e.toString()).toList();
    }

    return NotificationModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? json['message'] as String? ?? '',
      type: json['type'] as String? ?? 'BROADCAST',
      createdAt: json['createdAt'] as String? ?? '',
      targetStudentIds: tStudents,
      isRead: json['isRead'] as bool? ?? false,
      readByStudents: readStudents,
    );
  }
}
