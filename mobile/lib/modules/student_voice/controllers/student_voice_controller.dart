import 'dart:convert';
import 'package:get/get.dart';
import '../../../core/network/api_client.dart';
import '../models/student_voice_model.dart';

class StudentVoiceController extends GetxController {
  final RxList<StudentVoiceModel> submissions = <StudentVoiceModel>[].obs;
  final RxList<StudentVoiceModel> queue = <StudentVoiceModel>[].obs;
  final RxBool loading = false.obs;
  final RxString error = ''.obs;

  Future<void> fetchMySubmissions() async {
    loading.value = true;
    error.value = '';
    try {
      final res = await ApiClient.get('/api/v1/student-voice/my');
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        final list = (body['data'] as List<dynamic>? ?? [])
            .map((e) => StudentVoiceModel.fromJson(e as Map<String, dynamic>))
            .toList();
        submissions.assignAll(list);
      } else {
        error.value = 'Failed to load submissions (${res.statusCode})';
      }
    } catch (e) {
      error.value = e.toString();
    } finally {
      loading.value = false;
    }
  }

  Future<void> fetchQueue({String? status, String? category}) async {
    loading.value = true;
    error.value = '';
    try {
      final params = <String>[];
      if (status != null && status.isNotEmpty && status != 'all') {
        params.add('status=$status');
      }
      if (category != null && category.isNotEmpty && category != 'all') {
        params.add('category=$category');
      }
      final qs = params.isEmpty ? '' : '?${params.join('&')}';
      final res = await ApiClient.get('/api/v1/student-voice/queue$qs');
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        final list = (body['data'] as List<dynamic>? ?? [])
            .map((e) => StudentVoiceModel.fromJson(e as Map<String, dynamic>))
            .toList();
        queue.assignAll(list);
      } else {
        error.value = 'Failed to load queue (${res.statusCode})';
      }
    } catch (e) {
      error.value = e.toString();
    } finally {
      loading.value = false;
    }
  }

  Future<bool> submit({
    required String category,
    required String title,
    required String description,
    bool isAnonymous = false,
    String? studentId,
  }) async {
    try {
      final res = await ApiClient.post('/api/v1/student-voice', {
        'category': category,
        'title': title,
        'description': description,
        'isAnonymous': isAnonymous,
        if (!isAnonymous && studentId != null) 'studentId': studentId,
      });
      if (res.statusCode == 201 || res.statusCode == 200) {
        await fetchMySubmissions();
        return true;
      }
      return false;
    } catch (e) {
      error.value = e.toString();
      return false;
    }
  }

  Future<bool> addThread(String id, String message) async {
    try {
      final res = await ApiClient.post('/api/v1/student-voice/$id/thread', {
        'message': message,
      });
      return res.statusCode == 201 || res.statusCode == 200;
    } catch (e) {
      error.value = e.toString();
      return false;
    }
  }

  Future<bool> updateStatus(String id, String status) async {
    try {
      final res = await ApiClient.patch('/api/v1/student-voice/$id/status', {
        'status': status,
      });
      return res.statusCode == 200;
    } catch (e) {
      error.value = e.toString();
      return false;
    }
  }
}
