class LeaveRequestModel {
  final String id;
  final DateTime startDate;
  final DateTime endDate;
  final String reason;
  final String status; // 'PENDING' | 'APPROVED' | 'REJECTED'
  final String? reviewRemarks;
  final String? reviewedByName;
  final String? studentName;
  final String? standard;
  final String? division;

  const LeaveRequestModel({
    required this.id,
    required this.startDate,
    required this.endDate,
    required this.reason,
    required this.status,
    this.reviewRemarks,
    this.reviewedByName,
    this.studentName,
    this.standard,
    this.division,
  });

  String get classLabel =>
      (standard != null && division != null) ? 'Std $standard-$division' : '';

  factory LeaveRequestModel.fromJson(Map<String, dynamic> json) {
    final reviewer = json['reviewedBy'];
    final student = json['studentId'];
    return LeaveRequestModel(
      id: (json['_id'] ?? '').toString(),
      startDate: DateTime.tryParse(json['startDate']?.toString() ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(json['endDate']?.toString() ?? '') ?? DateTime.now(),
      reason: json['reason'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      reviewRemarks: json['reviewRemarks'] as String?,
      reviewedByName: reviewer is Map ? reviewer['name'] as String? : null,
      studentName: student is Map ? student['studentName'] as String? : null,
      standard: json['standard'] as String?,
      division: json['division'] as String?,
    );
  }
}
