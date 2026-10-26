import 'package:flutter/material.dart';

enum MilestoneStatus { completed, inProgress, planned }

class RoadmapMilestoneModel {
  final String id;
  final String title;
  final String description;
  final String type;
  final String category;
  final DateTime startDate;
  final DateTime endDate;
  final String colorHex;
  final MilestoneStatus status;
  final String quarter;
  final String term;
  final bool isSchoolClosed;

  RoadmapMilestoneModel({
    required this.id,
    required this.title,
    this.description = '',
    required this.type,
    this.category = 'SCHOOL_HOLIDAY',
    required this.startDate,
    required this.endDate,
    this.colorHex = '#10B981',
    required this.status,
    this.quarter = 'NONE',
    this.term = 'NONE',
    this.isSchoolClosed = false,
  });

  factory RoadmapMilestoneModel.fromJson(Map<String, dynamic> json) {
    MilestoneStatus parseStatus(String? s) {
      switch ((s ?? '').toUpperCase()) {
        case 'COMPLETED':
          return MilestoneStatus.completed;
        case 'IN_PROGRESS':
          return MilestoneStatus.inProgress;
        default:
          return MilestoneStatus.planned;
      }
    }

    DateTime parseDate(dynamic d) {
      if (d == null) return DateTime.now();
      if (d is DateTime) return d;
      try {
        return DateTime.parse(d.toString());
      } catch (_) {
        return DateTime.now();
      }
    }

    final roadmapObj = json['roadmap'] is Map<String, dynamic> ? json['roadmap'] as Map<String, dynamic> : null;

    final q = (json['quarter'] ?? roadmapObj?['quarter'] ?? 'NONE').toString();
    final t = (json['term'] ?? roadmapObj?['term'] ?? 'NONE').toString();
    final st = parseStatus(json['status'] ?? roadmapObj?['progressStatus']);

    return RoadmapMilestoneModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Milestone').toString(),
      description: (json['description'] ?? '').toString(),
      type: (json['type'] ?? 'EVENT').toString(),
      category: (json['category'] ?? 'OTHER').toString(),
      startDate: parseDate(json['startDate']),
      endDate: parseDate(json['endDate'] ?? json['startDate']),
      colorHex: (json['color'] ?? '#10B981').toString(),
      status: st,
      quarter: q,
      term: t,
      isSchoolClosed: json['isSchoolClosed'] == true,
    );
  }

  Color get color {
    try {
      final hex = colorHex.replaceAll('#', '');
      if (hex.length == 6) {
        return Color(int.parse('FF$hex', radix: 16));
      }
    } catch (_) {}
    return const Color(0xFF10B981);
  }

  bool get isSingleDay {
    return startDate.year == endDate.year &&
        startDate.month == endDate.month &&
        startDate.day == endDate.day;
  }

  bool get isExam => type == 'EXAM';
  bool get isVacation => type == 'VACATION';
  bool get isHoliday => type == 'HOLIDAY';
  bool get isEvent => type == 'EVENT';
  bool get isPtm => type == 'PTM';
  bool get isMilestone => type == 'ACADEMIC_MILESTONE';

  int get durationDays => endDate.difference(startDate).inDays + 1;

  String get categoryDisplayName {
    if (isExam) return 'EXAM & ASSESSMENT';
    if (isVacation) return 'VACATION & BREAK';
    if (isHoliday) return 'HOLIDAY & FESTIVAL';
    if (isEvent) return 'SCHOOL CELEBRATION';
    if (isPtm) return 'PARENT-TEACHER MEETING';
    return 'ACADEMIC MILESTONE';
  }

  IconData get categoryIcon {
    if (isExam) return Icons.assignment_outlined;
    if (isVacation) return Icons.beach_access_rounded;
    if (isHoliday) return Icons.celebration_outlined;
    if (isEvent) return Icons.emoji_events_outlined;
    if (isPtm) return Icons.groups_outlined;
    return Icons.flag_circle_outlined;
  }
}
