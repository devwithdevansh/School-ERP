import 'dart:convert';
import 'package:get/get.dart';
import '../../../core/network/api_client.dart';
import '../models/counseling_model.dart';

class CounselingController extends GetxController {
  final RxList<CounselingRecord> records = <CounselingRecord>[].obs;
  final RxBool loading = false.obs;
  final RxString error = ''.obs;

  Future<void> fetchForStudent(String studentId) async {
    loading.value = true;
    error.value = '';
    try {
      final res = await ApiClient.get('/api/v1/counseling/student/$studentId');
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final list = (json['data'] as List<dynamic>? ?? [])
            .map((e) => CounselingRecord.fromJson(e as Map<String, dynamic>))
            .toList();
        records.assignAll(list);
      } else {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        error.value = json['message'] ?? 'Failed to load records';
      }
    } catch (e) {
      error.value = e.toString();
    } finally {
      loading.value = false;
    }
  }

  Future<void> fetchMine() async {
    loading.value = true;
    error.value = '';
    try {
      final res = await ApiClient.get('/api/v1/counseling/mine');
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final list = (json['data'] as List<dynamic>? ?? [])
            .map((e) => CounselingRecord.fromJson(e as Map<String, dynamic>))
            .toList();
        records.assignAll(list);
      } else {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        error.value = json['message'] ?? 'Failed to load records';
      }
    } catch (e) {
      error.value = e.toString();
    } finally {
      loading.value = false;
    }
  }

  Future<bool> createRecord({
    required String studentId,
    required String type,
    String? triggerSource,
    required String summary,
    String? privateNotes,
    String visibility = 'admin_teacher_only',
    List<Map<String, dynamic>> supportPlan = const [],
  }) async {
    try {
      final res = await ApiClient.post('/api/v1/counseling', {
        'studentId': studentId,
        'type': type,
        if (triggerSource != null) 'trigger': {'source': triggerSource},
        'summary': summary,
        if (privateNotes != null && privateNotes.isNotEmpty)
          'privateNotes': privateNotes,
        'visibility': visibility,
        'supportPlan': supportPlan,
      });
      return res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateMilestoneStatus(String id, int idx, String status) async {
    try {
      final res = await ApiClient.patch(
        '/api/v1/counseling/$id/milestone/$idx',
        {'status': status},
      );
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final updated =
            CounselingRecord.fromJson(json['data'] as Map<String, dynamic>);
        final idx2 = records.indexWhere((r) => r.id == id);
        if (idx2 != -1) records[idx2] = updated;
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> closeRecord(String id) async {
    try {
      final res = await ApiClient.patch('/api/v1/counseling/$id/close', {});
      if (res.statusCode == 200) {
        records.removeWhere((r) => r.id == id);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }
}
