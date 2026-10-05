class AttendanceDayModel {
  final DateTime date;
  final String status; // 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'
  final String? remarks;

  const AttendanceDayModel({
    required this.date,
    required this.status,
    this.remarks,
  });

  factory AttendanceDayModel.fromJson(Map<String, dynamic> json) {
    return AttendanceDayModel(
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      status: json['status'] as String? ?? 'PRESENT',
      remarks: json['remarks'] as String?,
    );
  }
}
