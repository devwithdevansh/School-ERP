import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/network/api_client.dart';
import '../models/trip_model.dart';

class SafeReachController extends GetxController {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  final RxString tripStatus = 'idle'.obs; // 'idle' | 'active' | 'arrived' | 'delayed'
  final Rx<TripModel?> currentTrip = Rx<TripModel?>(null);
  final RxList<TripModel> tripHistory = <TripModel>[].obs;
  final RxBool loading = false.obs;
  final RxBool consentGiven = false.obs;
  final RxBool isTracking = false.obs;
  final RxMap consentData = {}.obs;

  StreamSubscription<Position>? _locationSub;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  @override
  void onClose() {
    _stopTracking();
    super.onClose();
  }

  // -------------------------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------------------------
  Future<Map<String, dynamic>> _get(String path) async {
    final res = await ApiClient.get('/api/v1/safereach$path');
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) throw Exception(body['message'] ?? 'Request failed');
    return body;
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> data) async {
    final res = await ApiClient.post('/api/v1/safereach$path', data);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) throw Exception(body['message'] ?? 'Request failed');
    return body;
  }

  Future<Map<String, dynamic>> _put(String path, Map<String, dynamic> data) async {
    final res = await ApiClient.put('/api/v1/safereach$path', data);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) throw Exception(body['message'] ?? 'Request failed');
    return body;
  }

  Future<Map<String, dynamic>> _patch(String path, [Map<String, dynamic>? data]) async {
    final res = await ApiClient.patch('/api/v1/safereach$path', data ?? {});
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) throw Exception(body['message'] ?? 'Request failed');
    return body;
  }

  // -------------------------------------------------------------------------
  // Consent
  // -------------------------------------------------------------------------
  Future<void> loadConsent(String studentId, String academicYearId) async {
    loading.value = true;
    try {
      final data = await _get('/consent/$studentId?academicYearId=$academicYearId');
      final record = data['data'] as Map<String, dynamic>? ?? {};
      consentData.value = record;
      consentGiven.value = record['consentGiven'] ?? false;
    } catch (e) {
      consentGiven.value = false;
      if (kDebugMode) print('[SafeReach] loadConsent error: $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> saveConsent({
    required String studentId,
    required String academicYearId,
    required bool consentGiven,
    double? lat,
    double? lng,
    String? label,
    int radiusMeters = 200,
  }) async {
    loading.value = true;
    try {
      final payload = <String, dynamic>{
        'studentId': studentId,
        'academicYearId': academicYearId,
        'consentGiven': consentGiven,
        'homeRadiusMeters': radiusMeters,
        if (lat != null && lng != null)
          'homeAddress': {
            'lat': lat,
            'lng': lng,
            'label': label ?? 'Home',
          },
      };
      final data = await _put('/consent', payload);
      final record = data['data'] as Map<String, dynamic>? ?? {};
      consentData.value = record;
      this.consentGiven.value = record['consentGiven'] ?? consentGiven;
      Get.snackbar('SafeReach', 'Consent settings saved',
          snackPosition: SnackPosition.BOTTOM);
    } catch (e) {
      Get.snackbar('Error', e.toString(), snackPosition: SnackPosition.BOTTOM);
    } finally {
      loading.value = false;
    }
  }

  Future<bool> setConsent({
    required String studentId,
    required String academicYearId,
    required bool consent,
    Map<String, dynamic>? homeAddress,
    int? homeRadiusMeters,
    int? notifyDelayAfterMinutes,
  }) async {
    loading.value = true;
    try {
      final payload = <String, dynamic>{
        'studentId': studentId,
        'academicYearId': academicYearId,
        'consentGiven': consent,
        if (homeAddress != null) 'homeAddress': homeAddress,
        if (homeRadiusMeters != null) 'homeRadiusMeters': homeRadiusMeters,
        if (notifyDelayAfterMinutes != null) 'notifyDelayAfterMinutes': notifyDelayAfterMinutes,
      };
      final data = await _put('/consent', payload);
      final record = data['data'] as Map<String, dynamic>? ?? {};
      consentData.value = record;
      consentGiven.value = record['consentGiven'] ?? false;
      return true;
    } catch (e) {
      Get.snackbar('Error', e.toString(), snackPosition: SnackPosition.BOTTOM);
      return false;
    } finally {
      loading.value = false;
    }
  }

  // -------------------------------------------------------------------------
  // Trip Management
  // -------------------------------------------------------------------------
  Future<void> startTrip(
    String studentId,
    String tripType,
    String academicYearId, {
    DateTime? expectedArrivalTime,
  }) async {
    loading.value = true;
    try {
      final payload = <String, dynamic>{
        'studentId': studentId,
        'tripType': tripType,
        'academicYearId': academicYearId,
        if (expectedArrivalTime != null) 'expectedArrivalTime': expectedArrivalTime.toIso8601String(),
      };
      final data = await _post('/trip/start', payload);
      final trip = TripModel.fromJson(data['data'] as Map<String, dynamic>);
      currentTrip.value = trip;
      tripStatus.value = 'active';
      await _startTracking(trip.id);
      Get.snackbar('SafeReach', 'Trip started successfully 🛡️', snackPosition: SnackPosition.BOTTOM);
    } catch (e) {
      Get.snackbar('Error', e.toString(), snackPosition: SnackPosition.BOTTOM);
    } finally {
      loading.value = false;
    }
  }

  Future<void> updateLocation(String tripId, double lat, double lng) async {
    try {
      final data = await _patch('/trip/$tripId/location', {'lat': lat, 'lng': lng});
      final trip = TripModel.fromJson(data['data'] as Map<String, dynamic>);
      currentTrip.value = trip;
      tripStatus.value = trip.status;
      if (trip.status == 'arrived') {
        _stopTracking();
      }
    } catch (e) {
      if (kDebugMode) print('[SafeReach] updateLocation error: $e');
    }
  }

  Future<void> confirmArrival(String tripId) async {
    loading.value = true;
    try {
      final data = await _patch('/trip/$tripId/arrive');
      final trip = TripModel.fromJson(data['data'] as Map<String, dynamic>);
      currentTrip.value = trip;
      tripStatus.value = 'arrived';
      _stopTracking();
      Get.snackbar('SafeReach', 'Arrival confirmed ✓', snackPosition: SnackPosition.BOTTOM);
    } catch (e) {
      Get.snackbar('Error', e.toString(), snackPosition: SnackPosition.BOTTOM);
    } finally {
      loading.value = false;
    }
  }

  Future<void> cancelTrip(String tripId) async {
    loading.value = true;
    try {
      final data = await _patch('/trip/$tripId/cancel');
      final trip = TripModel.fromJson(data['data'] as Map<String, dynamic>);
      currentTrip.value = trip;
      tripStatus.value = 'idle';
      _stopTracking();
      Get.snackbar('SafeReach', 'Trip cancelled', snackPosition: SnackPosition.BOTTOM);
    } catch (e) {
      Get.snackbar('Error', e.toString(), snackPosition: SnackPosition.BOTTOM);
    } finally {
      loading.value = false;
    }
  }

  Future<void> loadHistory(String studentId, {int limit = 10}) async {
    loading.value = true;
    try {
      final data = await _get('/trip/history?studentId=$studentId&limit=$limit');
      final list = (data['data'] as List<dynamic>? ?? [])
          .map((e) => TripModel.fromJson(e as Map<String, dynamic>))
          .toList();
      tripHistory.assignAll(list);
    } catch (e) {
      if (kDebugMode) print('[SafeReach] loadHistory error: $e');
    } finally {
      loading.value = false;
    }
  }

  Future<void> loadTodayStatus(String studentId, String academicYearId) async {
    loading.value = true;
    try {
      final data = await _get('/trip/today?studentId=$studentId&academicYearId=$academicYearId');
      final list = (data['data'] as List<dynamic>? ?? [])
          .map((e) => TripModel.fromJson(e as Map<String, dynamic>))
          .toList();
      if (list.isNotEmpty) {
        final active = list.firstWhereOrNull((t) => t.status == 'active') ?? list.first;
        currentTrip.value = active;
        tripStatus.value = active.status;
      } else {
        tripStatus.value = 'idle';
        currentTrip.value = null;
      }
    } catch (e) {
      if (kDebugMode) print('[SafeReach] loadTodayStatus error: $e');
    } finally {
      loading.value = false;
    }
  }

  // -------------------------------------------------------------------------
  // GPS Tracking
  // -------------------------------------------------------------------------
  Future<bool> _requestLocationPermission() async {
    var status = await Permission.location.status;
    if (status.isDenied) {
      status = await Permission.location.request();
    }
    if (status.isPermanentlyDenied) {
      Get.snackbar(
        'Location Permission Required',
        'Please enable location access in app settings.',
        snackPosition: SnackPosition.BOTTOM,
      );
      return false;
    }
    return status.isGranted;
  }

  Future<void> _startTracking(String tripId) async {
    final granted = await _requestLocationPermission();
    if (!granted) return;

    isTracking.value = true;
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 50,
    );

    _locationSub = Geolocator.getPositionStream(locationSettings: locationSettings).listen(
      (Position pos) {
        updateLocation(tripId, pos.latitude, pos.longitude);
      },
      onError: (e) {
        if (kDebugMode) print('[SafeReach] GPS stream error: $e');
      },
    );
  }

  void _stopTracking() {
    _locationSub?.cancel();
    _locationSub = null;
    isTracking.value = false;
  }
}
