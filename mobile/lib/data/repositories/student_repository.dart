import 'dart:convert';
import '../../core/network/api_client.dart';
import '../models/student_model.dart';

class StudentRepository {
  Future<List<StudentModel>> getStudentsForParent(String parentId) async {
    try {
      final response = await ApiClient.get('/students?parentId=$parentId');
      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        final list = body['data'] as List;
        return list.map((item) => StudentModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('Error in getStudentsForParent: $e');
    }
    return [];
  }

  /// A teacher's roster for one class — only works for a class the teacher
  /// is the homeroom (class) teacher for; the backend enforces that.
  Future<List<StudentModel>> getStudentsForClass({
    required String standard,
    required String division,
    required String medium,
  }) async {
    try {
      final response = await ApiClient.get('/students?standard=$standard&division=$division&medium=$medium');
      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        final list = body['data'] as List;
        return list.map((item) => StudentModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('Error in getStudentsForClass: $e');
    }
    return [];
  }
}
