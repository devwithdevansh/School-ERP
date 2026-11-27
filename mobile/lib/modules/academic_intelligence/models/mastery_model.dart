class MasteryItem {
  final String id;
  final ConceptTagInfo conceptTag;
  final double avgMasteryPct;
  final List<TrendPoint> trend;

  MasteryItem({
    required this.id,
    required this.conceptTag,
    required this.avgMasteryPct,
    required this.trend,
  });

  factory MasteryItem.fromJson(Map<String, dynamic> json) {
    return MasteryItem(
      id: json['_id'] ?? '',
      conceptTag: ConceptTagInfo.fromJson(json['conceptTag'] ?? {}),
      avgMasteryPct: (json['avgMasteryPct'] as num? ?? 0).toDouble(),
      trend: (json['trend'] as List<dynamic>? ?? [])
          .map((t) => TrendPoint.fromJson(t))
          .toList(),
    );
  }
}

class ConceptTagInfo {
  final String id;
  final String conceptName;
  final String chapterName;
  final int chapterNumber;
  final String subjectId;

  ConceptTagInfo({
    required this.id,
    required this.conceptName,
    required this.chapterName,
    required this.chapterNumber,
    required this.subjectId,
  });

  factory ConceptTagInfo.fromJson(Map<String, dynamic> json) {
    return ConceptTagInfo(
      id: json['_id'] ?? '',
      conceptName: json['conceptName'] ?? '',
      chapterName: json['chapterName'] ?? '',
      chapterNumber: (json['chapterNumber'] as num? ?? 0).toInt(),
      subjectId: json['subjectId'] ?? '',
    );
  }
}

class TrendPoint {
  final String examId;
  final String date;
  final double masteryPct;

  TrendPoint({
    required this.examId,
    required this.date,
    required this.masteryPct,
  });

  factory TrendPoint.fromJson(Map<String, dynamic> json) {
    return TrendPoint(
      examId: json['examId'] ?? '',
      date: json['date'] ?? '',
      masteryPct: (json['masteryPct'] as num? ?? 0).toDouble(),
    );
  }
}

class GapItem {
  final String id;
  final ConceptTagInfo conceptTag;
  final double avgMasteryPct;

  GapItem({
    required this.id,
    required this.conceptTag,
    required this.avgMasteryPct,
  });

  factory GapItem.fromJson(Map<String, dynamic> json) {
    return GapItem(
      id: json['_id'] ?? '',
      conceptTag: ConceptTagInfo.fromJson(json['conceptTag'] ?? {}),
      avgMasteryPct: (json['avgMasteryPct'] as num? ?? 0).toDouble(),
    );
  }
}

class PlanResource {
  final String title;
  final String url;
  final String type;

  PlanResource({required this.title, required this.url, required this.type});

  factory PlanResource.fromJson(Map<String, dynamic> json) {
    return PlanResource(
      title: json['title'] ?? '',
      url: json['url'] ?? '',
      type: json['type'] ?? 'link',
    );
  }
}

class ImprovementPlan {
  final String id;
  final String description;
  final String targetDate;
  final String status;
  final String? completedAt;
  final List<PlanResource> resources;
  final ConceptTagInfo? conceptTagId;

  ImprovementPlan({
    required this.id,
    required this.description,
    required this.targetDate,
    required this.status,
    this.completedAt,
    required this.resources,
    this.conceptTagId,
  });

  factory ImprovementPlan.fromJson(Map<String, dynamic> json) {
    return ImprovementPlan(
      id: json['_id'] ?? '',
      description: json['description'] ?? '',
      targetDate: json['targetDate'] ?? '',
      status: json['status'] ?? 'active',
      completedAt: json['completedAt'],
      resources: (json['resources'] as List<dynamic>? ?? [])
          .map((r) => PlanResource.fromJson(r))
          .toList(),
      conceptTagId: json['conceptTagId'] != null
          ? ConceptTagInfo.fromJson(json['conceptTagId'])
          : null,
    );
  }
}
