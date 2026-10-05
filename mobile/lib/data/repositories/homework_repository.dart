import 'dart:convert';
import '../models/homework_model.dart';
import '../../core/network/api_client.dart';

class HomeworkRepository {
  Future<List<HomeworkModel>> getHomework(String studentId) async {
    try {
      final response = await ApiClient.get('/erp/homework?studentId=$studentId');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => HomeworkModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('HomeworkRepository.getHomework error: $e');
    }
    return [];
  }

  /// Teacher view: every homework this teacher has published, across all
  /// their classes -- the backend scopes this to req.user._id automatically.
  Future<List<HomeworkModel>> getMyHomework() async {
    try {
      final response = await ApiClient.get('/erp/homework');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => HomeworkModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('HomeworkRepository.getMyHomework error: $e');
    }
    return [];
  }

  /// Publish a new homework assignment. Only works for a class+subject the
  /// teacher is actually assigned to teach -- the backend enforces that.
  Future<({bool success, String? error})> createHomework({
    required String standard,
    required String division,
    required String medium,
    required String subjectId,
    required String title,
    required String description,
    required DateTime dueDate,
  }) async {
    try {
      final response = await ApiClient.post('/erp/homework', {
        'standard': standard,
        'division': division,
        'medium': medium,
        'subjectId': subjectId,
        'title': title,
        'description': description,
        'dueDate': dueDate.toIso8601String(),
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        return (success: true, error: null);
      }
      try {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        return (success: false, error: body['message'] as String?);
      } catch (_) {
        return (success: false, error: null);
      }
    } catch (e) {
      print('HomeworkRepository.createHomework error: $e');
      return (success: false, error: null);
    }
  }

  Future<bool> deleteHomework(String id) async {
    try {
      final response = await ApiClient.delete('/erp/homework/$id', {});
      return response.statusCode == 200;
    } catch (e) {
      print('HomeworkRepository.deleteHomework error: $e');
      return false;
    }
  }
}
