import 'dart:convert';
import '../models/exam_result_model.dart';
import '../models/exam_model.dart';
import '../../core/network/api_client.dart';

class ResultsRepository {
  /// Teacher view: exams scheduled for a class (standard + medium).
  Future<List<ExamModel>> getExams({required String standard, required String medium}) async {
    try {
      final response = await ApiClient.get('/erp/exams?standard=$standard&medium=$medium');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => ExamModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('ResultsRepository.getExams error: $e');
    }
    return [];
  }

  /// Teacher view: existing marks for one exam+subject+division, keyed by
  /// studentId. Empty map means nothing entered yet.
  Future<Map<String, num>> getClassResults({
    required String examId,
    required String subjectId,
    required String division,
  }) async {
    try {
      final response = await ApiClient.get('/erp/exams/$examId/results?subjectId=$subjectId&division=$division');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        final map = <String, num>{};
        for (final item in items) {
          final map0 = item as Map<String, dynamic>;
          final student = map0['studentId'];
          final sId = student is Map ? (student['_id'] ?? '').toString() : (student ?? '').toString();
          final marks = map0['marksObtained'];
          if (sId.isNotEmpty && marks != null) map[sId] = marks as num;
        }
        return map;
      }
    } catch (e) {
      print('ResultsRepository.getClassResults error: $e');
    }
    return {};
  }

  Future<bool> saveClassResults({
    required String examId,
    required String subjectId,
    required String division,
    required List<Map<String, dynamic>> results,
  }) async {
    try {
      final response = await ApiClient.post('/erp/exams/$examId/results', {
        'subjectId': subjectId,
        'division': division,
        'results': results,
      });
      return response.statusCode == 200;
    } catch (e) {
      print('ResultsRepository.saveClassResults error: $e');
      return false;
    }
  }

  Future<List<ExamResultModel>> getResults(String studentId) async {
    try {
      final response = await ApiClient.get('/erp/exams/results/student/$studentId');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => ExamResultModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('ResultsRepository.getResults error: $e');
    }
    return [];
  }
}
