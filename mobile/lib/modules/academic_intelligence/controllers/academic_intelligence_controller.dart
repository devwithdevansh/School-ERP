import 'dart:convert';
import 'package:get/get.dart';
import '../../../core/network/api_client.dart';
import '../models/mastery_model.dart';

class AcademicIntelligenceController extends GetxController {
  final RxList<MasteryItem> masteryData = <MasteryItem>[].obs;
  final RxList<GapItem> gaps = <GapItem>[].obs;
  final RxList<ImprovementPlan> plans = <ImprovementPlan>[].obs;
  final RxBool loading = false.obs;
  final RxString error = ''.obs;

  Future<void> fetchMastery(String studentId, {String? subjectId}) async {
    loading.value = true;
    error.value = '';
    try {
      var path = '/api/v1/academic-intelligence/mastery/student/$studentId';
      if (subjectId != null && subjectId.isNotEmpty) {
        path += '?subjectId=$subjectId';
      }
      final response = await ApiClient.get(path);
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> rawData = json['data'] ?? [];
        masteryData.value = rawData.map((e) => MasteryItem.fromJson(e)).toList();
      } else {
        error.value = 'Failed to fetch mastery data (${response.statusCode})';
      }
    } catch (e) {
      error.value = 'Error: $e';
    } finally {
      loading.value = false;
    }
  }

  Future<void> fetchGaps(String studentId, {double threshold = 60.0}) async {
    loading.value = true;
    error.value = '';
    try {
      final path =
          '/api/v1/academic-intelligence/gaps/student/$studentId?threshold=$threshold';
      final response = await ApiClient.get(path);
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> rawData = json['data'] ?? [];
        gaps.value = rawData.map((e) => GapItem.fromJson(e)).toList();
      } else {
        error.value = 'Failed to fetch gaps (${response.statusCode})';
      }
    } catch (e) {
      error.value = 'Error: $e';
    } finally {
      loading.value = false;
    }
  }

  Future<void> fetchPlans(String studentId) async {
    loading.value = true;
    error.value = '';
    try {
      final path = '/api/v1/academic-intelligence/plans/student/$studentId';
      final response = await ApiClient.get(path);
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> rawData = json['data'] ?? [];
        plans.value = rawData.map((e) => ImprovementPlan.fromJson(e)).toList();
      } else {
        error.value = 'Failed to fetch plans (${response.statusCode})';
      }
    } catch (e) {
      error.value = 'Error: $e';
    } finally {
      loading.value = false;
    }
  }

  void clearAll() {
    masteryData.clear();
    gaps.clear();
    plans.clear();
    error.value = '';
  }
}
