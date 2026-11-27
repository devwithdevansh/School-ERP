class Milestone {
  final String milestone;
  final String targetDate;
  final String status;
  final String? completedAt;

  const Milestone({
    required this.milestone,
    required this.targetDate,
    required this.status,
    this.completedAt,
  });

  factory Milestone.fromJson(Map<String, dynamic> json) => Milestone(
        milestone: json['milestone'] ?? '',
        targetDate: json['targetDate'] ?? '',
        status: json['status'] ?? 'pending',
        completedAt: json['completedAt'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'milestone': milestone,
        'targetDate': targetDate,
        'status': status,
        if (completedAt != null) 'completedAt': completedAt,
      };
}

class CounselingTrigger {
  final String? source;
  final String? refId;

  const CounselingTrigger({this.source, this.refId});

  factory CounselingTrigger.fromJson(Map<String, dynamic> json) =>
      CounselingTrigger(
        source: json['source'] as String?,
        refId: json['refId'] as String?,
      );

  Map<String, dynamic> toJson() => {
        if (source != null) 'source': source,
        if (refId != null) 'refId': refId,
      };
}

class CounselingRecord {
  final String id;
  final String studentId;
  final Map<String, dynamic> createdBy;
  final String type;
  final CounselingTrigger? trigger;
  final String summary;
  final String? privateNotes;
  final List<Milestone> supportPlan;
  final String visibility;
  final bool parentConsentGiven;
  final String status;
  final String? closedAt;
  final String createdAt;

  const CounselingRecord({
    required this.id,
    required this.studentId,
    required this.createdBy,
    required this.type,
    this.trigger,
    required this.summary,
    this.privateNotes,
    required this.supportPlan,
    required this.visibility,
    required this.parentConsentGiven,
    required this.status,
    this.closedAt,
    required this.createdAt,
  });

  factory CounselingRecord.fromJson(Map<String, dynamic> json) {
    final createdByRaw = json['createdBy'];
    final Map<String, dynamic> createdByMap = createdByRaw is Map<String, dynamic>
        ? createdByRaw
        : {'_id': createdByRaw?.toString() ?? ''};

    final studentIdRaw = json['studentId'];
    final String studentIdStr = studentIdRaw is Map<String, dynamic>
        ? (studentIdRaw['_id'] ?? '').toString()
        : (studentIdRaw ?? '').toString();

    return CounselingRecord(
      id: json['_id'] ?? '',
      studentId: studentIdStr,
      createdBy: createdByMap,
      type: json['type'] ?? '',
      trigger: json['trigger'] != null
          ? CounselingTrigger.fromJson(json['trigger'] as Map<String, dynamic>)
          : null,
      summary: json['summary'] ?? '',
      privateNotes: json['privateNotes'] as String?,
      supportPlan: (json['supportPlan'] as List<dynamic>? ?? [])
          .map((m) => Milestone.fromJson(m as Map<String, dynamic>))
          .toList(),
      visibility: json['visibility'] ?? 'admin_teacher_only',
      parentConsentGiven: json['parentConsentGiven'] == true,
      status: json['status'] ?? 'open',
      closedAt: json['closedAt'] as String?,
      createdAt: json['createdAt'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'studentId': studentId,
        'createdBy': createdBy,
        'type': type,
        if (trigger != null) 'trigger': trigger!.toJson(),
        'summary': summary,
        if (privateNotes != null) 'privateNotes': privateNotes,
        'supportPlan': supportPlan.map((m) => m.toJson()).toList(),
        'visibility': visibility,
        'parentConsentGiven': parentConsentGiven,
        'status': status,
        if (closedAt != null) 'closedAt': closedAt,
        'createdAt': createdAt,
      };

  int get achievedMilestones => supportPlan.where((m) => m.status == 'achieved').length;
  double get milestoneProgress =>
      supportPlan.isEmpty ? 0 : achievedMilestones / supportPlan.length;
}
