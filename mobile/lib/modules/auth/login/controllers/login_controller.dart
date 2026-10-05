import 'dart:convert';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../core/config/client_context.dart';
import '../../../../core/constants/storage_keys.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/fcm_service.dart';
import '../../../dashboard/controllers/dashboard_controller.dart';

enum LoginRole { student, teacher }

class LoginController extends GetxController {
  final isLoading = false.obs;
  final role = LoginRole.student.obs;

  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  /// Unified login: takes the 10-digit mobile number and password.
  /// Resolves Teacher vs Student directly based on password.
  /// In the rare clash scenario where both passwords are the same, triggers onDualRoleClash.
  Future<void> login({
    required String mobileNumber,
    required String password,
    void Function(Map<String, dynamic> clashData)? onDualRoleClash,
  }) async {
    isLoading.value = true;

    try {
      final response = await ApiClient.post('/auth/login', {
        'mobileNumber': mobileNumber,
        'password': password,
      });

      if (response.statusCode != 200) {
        _showLoginError(response);
        return;
      }

      final decoded = json.decode(response.body) as Map<String, dynamic>;
      final data = decoded['data'] as Map<String, dynamic>;
      final roleStr = data['role'] as String? ?? '';

      if (roleStr == 'dual') {
        // Clash scenario: both teacher & student accounts matched this exact password
        if (onDualRoleClash != null) {
          onDualRoleClash(data);
        } else {
          await selectClashRole(role: LoginRole.student, data: data, phone: mobileNumber);
        }
      } else if (roleStr == 'teacher') {
        role.value = LoginRole.teacher;
        await _completeTeacherLogin(data);
      } else {
        role.value = LoginRole.student;
        await _completeParentLogin(data, mobileNumber);
      }
    } catch (e) {
      print('Error during login: $e');
      Get.snackbar(
        'No Internet Connection',
        'Please check your internet and try again.',
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> selectClashRole({
    required LoginRole role,
    required Map<String, dynamic> data,
    required String phone,
  }) async {
    this.role.value = role;
    final parentData = data['parent'] as Map<String, dynamic>;
    final teacherData = data['teacher'] as Map<String, dynamic>;
    await _completeDualLogin(
      primaryRole: role,
      primaryData: role == LoginRole.student ? parentData : teacherData,
      secondaryData: role == LoginRole.student ? teacherData : parentData,
    );
  }

  Future<void> _completeParentLogin(Map<String, dynamic> data, String phone) async {
    final accessToken = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String?;

    final jwtData = ApiClient.decodeJwt(accessToken);
    final parentId = jwtData['id'] as String? ?? '';

    try {
      await _secureStorage.write(key: StorageKeys.accessToken, value: accessToken);
      if (refreshToken != null) {
        await _secureStorage.write(key: 'refresh_token', value: refreshToken);
      }
    } catch (e) {
      print('Error writing auth tokens: $e');
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(StorageKeys.userRole);
    await prefs.remove(StorageKeys.staffId);
    await prefs.remove(StorageKeys.staffName);
    await prefs.remove(StorageKeys.hasDualRole);
    await ClientContext.save(data['client']);
    await prefs.setString(StorageKeys.parentId, parentId);
    await prefs.setString(StorageKeys.phone, phone);
    await prefs.setBool(StorageKeys.isLoggedIn, true);
    await prefs.setBool(StorageKeys.isOnboarded, true);

    await FcmService.registerToken();

    await _refreshDashboardIfAlreadyRegistered();
    Get.offAllNamed(AppRoutes.dashboard);
  }

  Future<void> _completeTeacherLogin(Map<String, dynamic> data) async {
    final accessToken = data['accessToken'] as String;
    final refreshToken = data['refreshToken'] as String?;
    final name = (data['user'] as Map?)?['name'] as String? ?? 'Teacher';
    final contactNo1 = data['contactNo1'] as String? ?? '';

    final jwtData = ApiClient.decodeJwt(accessToken);
    final staffId = jwtData['id'] as String? ?? '';

    try {
      await _secureStorage.write(key: StorageKeys.accessToken, value: accessToken);
      if (refreshToken != null) {
        await _secureStorage.write(key: 'refresh_token', value: refreshToken);
      }
    } catch (e) {
      print('Error writing auth tokens: $e');
    }

    final prefs = await SharedPreferences.getInstance();
    await ClientContext.save(data['client']);
    await prefs.remove(StorageKeys.parentId);
    await prefs.remove(StorageKeys.hasDualRole);
    await prefs.setString(StorageKeys.staffId, staffId);
    await prefs.setString(StorageKeys.staffName, name);
    await prefs.setString(StorageKeys.userRole, 'teacher');
    if (contactNo1.isNotEmpty) await prefs.setString(StorageKeys.phone, contactNo1);
    await prefs.setBool(StorageKeys.isLoggedIn, true);
    await prefs.setBool(StorageKeys.isOnboarded, true);

    await _refreshDashboardIfAlreadyRegistered();
    Get.offAllNamed(AppRoutes.dashboard);
  }

  /// Both login endpoints resolve dual-role server-side now (a single
  /// request each), so the client no longer has to guess by trying both
  /// endpoints itself -- whichever role the user picked at login becomes
  /// the active session; the other role's tokens are stashed for the
  /// in-app switcher (profile chips) exactly like before.
  Future<void> _completeDualLogin({
    required LoginRole primaryRole,
    required Map<String, dynamic> primaryData,
    required Map<String, dynamic> secondaryData,
  }) async {
    final parentData = primaryRole == LoginRole.student ? primaryData : secondaryData;
    final teacherData = primaryRole == LoginRole.student ? secondaryData : primaryData;

    final pToken = parentData['accessToken'] as String;
    final pRefresh = parentData['refreshToken'] as String?;
    final tToken = teacherData['accessToken'] as String;
    final tRefresh = teacherData['refreshToken'] as String?;
    final tName = (teacherData['user'] as Map?)?['name'] as String? ?? 'Teacher';
    final contactNo1 = teacherData['contactNo1'] as String? ?? '';

    final pJwt = ApiClient.decodeJwt(pToken);
    final parentId = pJwt['id'] as String? ?? '';
    final tJwt = ApiClient.decodeJwt(tToken);
    final staffId = tJwt['id'] as String? ?? '';

    try {
      await _secureStorage.write(key: StorageKeys.parentAccessToken, value: pToken);
      await _secureStorage.write(key: StorageKeys.teacherAccessToken, value: tToken);
      if (pRefresh != null) {
        await _secureStorage.write(key: StorageKeys.parentRefreshToken, value: pRefresh);
      }
      if (tRefresh != null) {
        await _secureStorage.write(key: StorageKeys.teacherRefreshToken, value: tRefresh);
      }

      // Active token is whichever role the user explicitly picked at login.
      final activeToken = primaryRole == LoginRole.student ? pToken : tToken;
      final activeRefresh = primaryRole == LoginRole.student ? pRefresh : tRefresh;
      await _secureStorage.write(key: StorageKeys.accessToken, value: activeToken);
      if (activeRefresh != null) {
        await _secureStorage.write(key: 'refresh_token', value: activeRefresh);
      }
    } catch (e) {
      print('Error writing dual auth tokens: $e');
    }

    final prefs = await SharedPreferences.getInstance();
    await ClientContext.save(parentData['client'] ?? teacherData['client']);
    await prefs.setString(StorageKeys.parentId, parentId);
    await prefs.setString(StorageKeys.staffId, staffId);
    await prefs.setString(StorageKeys.staffName, tName);
    await prefs.setString(StorageKeys.userRole, primaryRole == LoginRole.student ? 'parent' : 'teacher');
    await prefs.setBool(StorageKeys.hasDualRole, true);
    if (contactNo1.isNotEmpty) await prefs.setString(StorageKeys.phone, contactNo1);
    await prefs.setBool(StorageKeys.isLoggedIn, true);
    await prefs.setBool(StorageKeys.isOnboarded, true);

    await FcmService.registerToken();

    await _refreshDashboardIfAlreadyRegistered();
    Get.offAllNamed(AppRoutes.dashboard);
  }

  void _showLoginError(response) {
    String friendlyMsg;
    try {
      final body = json.decode(response.body);
      final statusCode = response.statusCode as int;
      if (body['message'] != null && body['message'].toString().isNotEmpty) {
        friendlyMsg = body['message'];
      } else if (statusCode == 401 || statusCode == 403) {
        friendlyMsg = role.value == LoginRole.student
            ? 'Mobile number or password is wrong. Please check and try again.'
            : 'The last 5 digits or password is wrong. Please check and try again.';
      } else if (statusCode == 404) {
        friendlyMsg = 'This mobile number is not registered. Please contact your school.';
      } else {
        friendlyMsg = 'Login failed. Please try again after some time.';
      }
    } catch (_) {
      friendlyMsg = 'Login failed. Please try again after some time.';
    }
    Get.snackbar(
      'Could Not Login',
      friendlyMsg,
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  /// DashboardController is permanent (survives logout) so its onInit()
  /// only ever runs once per app process -- without this, logging out and
  /// back in (same user or a different one) without killing the app would
  /// keep showing whatever the previous session had loaded.
  Future<void> _refreshDashboardIfAlreadyRegistered() async {
    if (Get.isRegistered<DashboardController>()) {
      await Get.find<DashboardController>().reinitialize();
    }
  }

  void goToOnboarding() {
    Get.toNamed(AppRoutes.otp); // repurpose OtpView for first-time setup
  }
}
