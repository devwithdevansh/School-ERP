import 'dart:convert';
import '../models/class_allocation_model.dart';
import '../models/subject_allocation_model.dart';
import '../../core/network/api_client.dart';

class AllocationRepository {
  Future<String?> getActiveAcademicYearId() async {
    try {
      final response = await ApiClient.get('/academic-years');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        for (final item in items) {
          final map = item as Map<String, dynamic>;
          if (map['isActive'] == true) return (map['_id'] ?? '').toString();
        }
      }
    } catch (e) {
      print('AllocationRepository.getActiveAcademicYearId error: $e');
    }
    return null;
  }

  /// Classes where [teacherId] is the homeroom (class) teacher, for the
  /// given academic year. The backend returns every class's allocation —
  /// filtering down to this teacher happens here.
  Future<List<ClassAllocationModel>> getMyClasses(String academicYearId, String teacherId) async {
    try {
      final response = await ApiClient.get('/erp/allocations/class-teacher?academicYearId=$academicYearId');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items
            .map((e) => e as Map<String, dynamic>)
            .where((e) => ClassAllocationModel.belongsTo(e, teacherId))
            .map((e) => ClassAllocationModel.fromJson(e))
            .toList();
      }
    } catch (e) {
      print('AllocationRepository.getMyClasses error: $e');
    }
    return [];
  }

  /// Subjects [teacherId] is assigned to teach, for the given academic
  /// year — the backend returns every class's subject allocations, filtered
  /// down to this teacher here.
  Future<List<SubjectAllocationModel>> getMySubjectAllocations(String academicYearId, String teacherId) async {
    try {
      final response = await ApiClient.get('/erp/allocations/subject-teacher?academicYearId=$academicYearId');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items
            .map((e) => e as Map<String, dynamic>)
            .where((e) => SubjectAllocationModel.belongsTo(e, teacherId))
            .map((e) => SubjectAllocationModel.fromJson(e))
            // An allocation whose subject was since deleted comes back with
            // subjectId populated as null -- exclude it rather than showing
            // a broken "Subject" placeholder the teacher can't publish against.
            .where((s) => s.subjectId.isNotEmpty)
            .toList();
      }
    } catch (e) {
      print('AllocationRepository.getMySubjectAllocations error: $e');
    }
    return [];
  }

  Future<Map<String, String>?> getClassTeacherForStudent(String academicYearId, String standard, String division, String medium) async {
    try {
      final response = await ApiClient.get('/erp/allocations/class-teacher?academicYearId=$academicYearId&standard=$standard&division=$division&medium=$medium');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        if (items.isNotEmpty) {
          final allocation = items.first as Map<String, dynamic>;
          final teacher = allocation['teacherId'];
          if (teacher != null && teacher is Map) {
            return {
              'id': teacher['_id']?.toString() ?? '',
              'name': teacher['name']?.toString() ?? 'Teacher',
            };
          }
        }
      }
    } catch (e) {
      print('AllocationRepository.getClassTeacherForStudent error: $e');
    }
    return null;
  }
}
