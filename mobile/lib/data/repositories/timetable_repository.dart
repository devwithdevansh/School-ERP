import 'dart:convert';
import '../models/timetable_period_model.dart';
import '../../core/network/api_client.dart';

class TimetableRepository {
  Future<List<TimetablePeriodModel>> getTimetable(String studentId) async {
    try {
      final response = await ApiClient.get('/erp/timetable?studentId=$studentId');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => TimetablePeriodModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('TimetableRepository.getTimetable error: $e');
    }
    return [];
  }

  /// Teacher's own weekly schedule — the backend infers the teacher from
  /// the auth token when no filters are passed.
  Future<List<TimetablePeriodModel>> getMyTimetable() async {
    try {
      final response = await ApiClient.get('/erp/timetable');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => TimetablePeriodModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('TimetableRepository.getMyTimetable error: $e');
    }
    return [];
  }
}
