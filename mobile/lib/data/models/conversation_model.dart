/// A chat thread between a parent and either a specific staff member
/// (usually a class/subject teacher) or "the office" (staffId null).
class ConversationModel {
  final String id;
  final String parentId;
  final String parentName;
  final String? parentMobile;
  final String? staffId;
  final String? staffName;
  final String? studentId;
  final String? studentName;
  final String? subject;
  final DateTime? lastMessageAt;
  final String lastMessagePreview;
  final String? lastSenderRole; // 'parent' | 'staff'
  final int unreadCountParent;
  final int unreadCountStaff;

  const ConversationModel({
    required this.id,
    required this.parentId,
    required this.parentName,
    this.parentMobile,
    this.staffId,
    this.staffName,
    this.studentId,
    this.studentName,
    this.subject,
    this.lastMessageAt,
    required this.lastMessagePreview,
    this.lastSenderRole,
    required this.unreadCountParent,
    required this.unreadCountStaff,
  });

  static String _idOf(dynamic v) {
    if (v == null) return '';
    if (v is Map) return (v['_id'] ?? '').toString();
    return v.toString();
  }

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    final parentId = json['parentId'];
    final staffId = json['staffId'];
    final studentId = json['studentId'];

    return ConversationModel(
      id: (json['_id'] ?? '').toString(),
      parentId: _idOf(parentId),
      parentName: parentId is Map ? (parentId['parentName'] as String? ?? 'Parent') : 'Parent',
      parentMobile: parentId is Map ? parentId['primaryMobileNumber'] as String? : null,
      staffId: staffId == null ? null : _idOf(staffId),
      staffName: staffId is Map ? staffId['name'] as String? : null,
      studentId: studentId == null ? null : _idOf(studentId),
      studentName: studentId is Map ? studentId['studentName'] as String? : null,
      subject: json['subject'] as String?,
      lastMessageAt: DateTime.tryParse(json['lastMessageAt']?.toString() ?? ''),
      lastMessagePreview: json['lastMessagePreview'] as String? ?? '',
      lastSenderRole: json['lastSenderRole'] as String?,
      unreadCountParent: (json['unreadCountParent'] as num?)?.toInt() ?? 0,
      unreadCountStaff: (json['unreadCountStaff'] as num?)?.toInt() ?? 0,
    );
  }

  /// Display name for "the other side" from a parent's point of view.
  String get counterpartName => staffName ?? subject ?? 'School Office';
}
