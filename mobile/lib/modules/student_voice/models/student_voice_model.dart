class ThreadEntry {
  final String by;
  final String byRole;
  final String message;
  final DateTime ts;

  ThreadEntry({
    required this.by,
    required this.byRole,
    required this.message,
    required this.ts,
  });

  factory ThreadEntry.fromJson(Map<String, dynamic> json) {
    return ThreadEntry(
      by: (json['by'] ?? '').toString(),
      byRole: (json['byRole'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      ts: DateTime.tryParse((json['ts'] ?? '').toString()) ?? DateTime.now(),
    );
  }
}

class StudentVoiceModel {
  final String id;
  final String category;
  final String title;
  final String description;
  final bool isAnonymous;
  final String status;
  final String? assignedToName;
  final String? studentName;
  final List<ThreadEntry> thread;
  final DateTime createdAt;

  StudentVoiceModel({
    required this.id,
    required this.category,
    required this.title,
    required this.description,
    required this.isAnonymous,
    required this.status,
    this.assignedToName,
    this.studentName,
    required this.thread,
    required this.createdAt,
  });

  factory StudentVoiceModel.fromJson(Map<String, dynamic> json) {
    final assigned = json['assignedTo'];
    final student = json['studentId'];
    final rawThread = json['thread'] as List<dynamic>? ?? [];
    return StudentVoiceModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      category: (json['category'] ?? 'other').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      isAnonymous: json['isAnonymous'] == true,
      status: (json['status'] ?? 'submitted').toString(),
      assignedToName: assigned is Map ? assigned['name']?.toString() : null,
      studentName: student is Map ? student['studentName']?.toString() : null,
      thread: rawThread
          .map((e) => ThreadEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.now(),
    );
  }
}
