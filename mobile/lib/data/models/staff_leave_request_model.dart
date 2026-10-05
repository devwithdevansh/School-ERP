class StaffLeaveRequestModel {
  final String id;
  final DateTime startDate;
  final DateTime endDate;
  final String reason;
  final String type; // 'SICK' | 'CASUAL' | 'UNPAID' | 'OTHER'
  final String status; // 'PENDING' | 'APPROVED' | 'REJECTED'
  final String? rejectionReason;
  final String? approvedByName;

  const StaffLeaveRequestModel({
    required this.id,
    required this.startDate,
    required this.endDate,
    required this.reason,
    required this.type,
    required this.status,
    this.rejectionReason,
    this.approvedByName,
  });

  factory StaffLeaveRequestModel.fromJson(Map<String, dynamic> json) {
    final approver = json['approvedBy'];
    return StaffLeaveRequestModel(
      id: (json['_id'] ?? '').toString(),
      startDate: DateTime.tryParse(json['startDate']?.toString() ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(json['endDate']?.toString() ?? '') ?? DateTime.now(),
      reason: json['reason'] as String? ?? '',
      type: json['type'] as String? ?? 'CASUAL',
      status: json['status'] as String? ?? 'PENDING',
      rejectionReason: json['rejectionReason'] as String?,
      approvedByName: approver is Map ? approver['name'] as String? : null,
    );
  }
}
