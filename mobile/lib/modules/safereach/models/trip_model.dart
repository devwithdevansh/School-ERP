class TripModel {
  final String id;
  final String studentId;
  final String academicYearId;
  final DateTime date;
  final String tripType; // 'morning' | 'evening'
  final String status; // 'active' | 'arrived' | 'delayed' | 'cancelled'
  final DateTime? startTime;
  final DateTime? endTime;
  final DateTime? expectedArrivalTime;
  final bool parentAlertSent;
  final LastLocation? lastLocation;

  TripModel({
    required this.id,
    required this.studentId,
    required this.academicYearId,
    required this.date,
    required this.tripType,
    required this.status,
    this.startTime,
    this.endTime,
    this.expectedArrivalTime,
    this.parentAlertSent = false,
    this.lastLocation,
  });

  factory TripModel.fromJson(Map<String, dynamic> json) {
    final studentRaw = json['studentId'];
    final String studentId = studentRaw is Map<String, dynamic>
        ? (studentRaw['_id'] ?? '').toString()
        : studentRaw?.toString() ?? '';

    final academicRaw = json['academicYearId'];
    final String academicYearId = academicRaw is Map<String, dynamic>
        ? (academicRaw['_id'] ?? '').toString()
        : academicRaw?.toString() ?? '';

    return TripModel(
      id: json['_id']?.toString() ?? '',
      studentId: studentId,
      academicYearId: academicYearId,
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
      tripType: json['tripType'] ?? 'morning',
      status: json['status'] ?? 'active',
      startTime: json['startTime'] != null ? DateTime.parse(json['startTime']) : null,
      endTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      expectedArrivalTime: json['expectedArrivalTime'] != null
          ? DateTime.parse(json['expectedArrivalTime'])
          : null,
      parentAlertSent: json['parentAlertSent'] ?? false,
      lastLocation: json['lastLocation'] != null
          ? LastLocation.fromJson(json['lastLocation'])
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'studentId': studentId,
        'academicYearId': academicYearId,
        'date': date.toIso8601String(),
        'tripType': tripType,
        'status': status,
        'startTime': startTime?.toIso8601String(),
        'endTime': endTime?.toIso8601String(),
        'expectedArrivalTime': expectedArrivalTime?.toIso8601String(),
        'parentAlertSent': parentAlertSent,
        'lastLocation': lastLocation?.toJson(),
      };

  /// Duration of the trip, or duration so far if still active.
  Duration get tripDuration {
    if (startTime == null) return Duration.zero;
    final end = endTime ?? DateTime.now();
    return end.difference(startTime!);
  }

  String get tripDurationFormatted {
    final d = tripDuration;
    final h = d.inHours;
    final m = d.inMinutes % 60;
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }

  int get minutesOverdue {
    if (expectedArrivalTime == null) return 0;
    if (status != 'delayed' && status != 'active') return 0;
    final diff = DateTime.now().difference(expectedArrivalTime!).inMinutes;
    return diff > 0 ? diff : 0;
  }
}

class LastLocation {
  final double lat;
  final double lng;
  final DateTime updatedAt;

  LastLocation({
    required this.lat,
    required this.lng,
    required this.updatedAt,
  });

  factory LastLocation.fromJson(Map<String, dynamic> json) => LastLocation(
        lat: (json['lat'] ?? 0).toDouble(),
        lng: (json['lng'] ?? 0).toDouble(),
        updatedAt: json['updatedAt'] != null
            ? DateTime.parse(json['updatedAt'])
            : DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'updatedAt': updatedAt.toIso8601String(),
      };
}
