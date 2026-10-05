import 'dart:convert';
import '../models/attendance_day_model.dart';
import '../../core/network/api_client.dart';

class AttendanceRepository {
  Future<List<AttendanceDayModel>> getAttendance(String studentId, {int? month, int? year}) async {
    try {
      final query = <String>[];
      if (month != null) query.add('month=$month');
      if (year != null) query.add('year=$year');
      final qs = query.isEmpty ? '' : '?${query.join('&')}';
      final response = await ApiClient.get('/attendance/student/$studentId$qs');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => AttendanceDayModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('AttendanceRepository.getAttendance error: $e');
    }
    return [];
  }

  /// Teacher view: today's (or any date's) attendance sheet for one class.
  /// [status] is NONE (nothing saved), SUBMITTED (waiting for admin
  /// confirmation, still editable) or CONFIRMED (locked for teachers).
  Future<({String status, Map<String, String> statuses})> getClassSheet({
    required String date,
    required String standard,
    required String division,
    required String medium,
  }) async {
    try {
      final response = await ApiClient.get('/attendance?date=$date&standard=$standard&division=$division&medium=$medium');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final data = json['data'];
        if (data == null) return (status: 'NONE', statuses: <String, String>{});
        final List<dynamic> records = data['records'] ?? [];
        return (
          // Sheets saved before the confirm workflow existed have no status.
          status: (data['status'] ?? 'CONFIRMED').toString(),
          statuses: {
            for (final r in records)
              (r['studentId'] ?? '').toString(): (r['status'] ?? 'PRESENT').toString(),
          },
        );
      }
    } catch (e) {
      print('AttendanceRepository.getClassSheet error: $e');
    }
    return (status: 'NONE', statuses: <String, String>{});
  }

  Future<({bool success, String? error})> saveClassAttendance({
    required String date,
    required String standard,
    required String division,
    required String medium,
    required List<Map<String, dynamic>> records,
  }) async {
    try {
      final response = await ApiClient.post('/attendance', {
        'date': date,
        'standard': standard,
        'division': division,
        'medium': medium,
        'records': records,
      });
      if (response.statusCode == 200) return (success: true, error: null);
      try {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        return (success: false, error: body['message'] as String?);
      } catch (_) {
        return (success: false, error: null);
      }
    } catch (e) {
      print('AttendanceRepository.saveClassAttendance error: $e');
      return (success: false, error: null);
    }
  }
}
