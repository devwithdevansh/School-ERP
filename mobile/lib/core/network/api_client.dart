import '../config/client_context.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/constants/storage_keys.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/routes/app_routes.dart';

import '../config/env.dart';

class ApiClient {
  // Single source of truth for the backend base URL — see Env.
  static String get baseUrl => Env.baseUrl;

  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static const _timeout = Duration(seconds: 15);

  static bool _isRefreshing = false;
  static Completer<bool>? _refreshCompleter;

  /// Helper to decode JWT token to extract claims
  static Map<String, dynamic> decodeJwt(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) {
        return {};
      }
      var payload = parts[1];
      // Pad base64url string length by padding with '='
      final rem = payload.length % 4;
      if (rem > 0) {
        payload += '=' * (4 - rem);
      }
      final resp = utf8.decode(base64Url.decode(payload));
      return json.decode(resp) as Map<String, dynamic>;
    } catch (e) {
      print('JWT Decode error: $e');
      return {};
    }
  }

  /// Get Parent token from SecureStorage
  static Future<String?> getParentToken() async {
    try {
      return await _secureStorage.read(key: StorageKeys.accessToken);
    } catch (e) {
      print('Error reading parent token: $e');
      return null;
    }
  }

  static Future<bool> _refreshToken() async {
    // If a refresh is already in progress, await its result
    if (_isRefreshing && _refreshCompleter != null) {
      return await _refreshCompleter!.future;
    }

    _isRefreshing = true;
    _refreshCompleter = Completer<bool>();

    try {
      String? rToken;
      try {
        rToken = await _secureStorage.read(key: 'refresh_token');
      } catch (e) {
        print('Error reading refresh token: $e');
      }

      final prefs = await SharedPreferences.getInstance();
      // Teachers are `User` docs (domain 'user'), parents are `Parent` docs
      // (domain 'parent') — the refresh endpoint needs to know which
      // collection to look the refresh token up in.
      final isTeacher = prefs.getString(StorageKeys.userRole) == 'teacher';
      final entityId = isTeacher
          ? prefs.getString(StorageKeys.staffId)
          : prefs.getString(StorageKeys.parentId);

      if (rToken == null || rToken.isEmpty) {
        if (entityId == null || entityId.isEmpty) {
          await _forceLogout();
          _refreshCompleter?.complete(false);
          return false;
        }
        _refreshCompleter?.complete(false);
        return false;
      }

      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SchoolConnectApp/1.0.0',
        },
        body: json.encode({
          'refreshToken': rToken,
          'domain': isTeacher ? 'user' : 'parent',
          if (entityId != null && entityId.isNotEmpty) 'userId': entityId,
        }),
      ).timeout(_timeout);

      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        final newAccess = body['data']['accessToken'] as String?;
        final newRefresh = body['data']['refreshToken'] as String?;
        // Dual-role accounts keep a separate access/refresh token per role
        // (see StorageKeys.parentAccessToken/teacherAccessToken) so a later
        // profile switch can restore it — keep that slot in sync too,
        // otherwise switching away and back would revert to the stale
        // pre-refresh token.
        final roleAccessKey = isTeacher ? StorageKeys.teacherAccessToken : StorageKeys.parentAccessToken;
        final roleRefreshKey = isTeacher ? StorageKeys.teacherRefreshToken : StorageKeys.parentRefreshToken;
        if (newAccess != null) {
          try {
            await _secureStorage.write(key: StorageKeys.accessToken, value: newAccess);
            await _secureStorage.write(key: roleAccessKey, value: newAccess);
          } catch (e) {
            print('Error writing new access token: $e');
          }
        }
        if (newRefresh != null) {
          try {
            await _secureStorage.write(key: 'refresh_token', value: newRefresh);
            await _secureStorage.write(key: roleRefreshKey, value: newRefresh);
          } catch (e) {
            print('Error writing new refresh token: $e');
          }
        }
        _refreshCompleter?.complete(true);
        return true;
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        // Refresh token is explicitly invalid or expired on server. Force logout.
        await _forceLogout();
        _refreshCompleter?.complete(false);
        return false;
      } else {
        // Temporary server error (500, 502, 503). Do NOT logout user!
        _refreshCompleter?.complete(false);
        return false;
      }
    } catch (e) {
      // Network error or timeout. Do NOT logout user!
      _refreshCompleter?.complete(false);
      return false;
    } finally {
      _isRefreshing = false;
      _refreshCompleter = null;
    }
  }

  static Future<void> _forceLogout() async {
    try {
      try {
        await _secureStorage.delete(key: StorageKeys.accessToken);
        await _secureStorage.delete(key: 'refresh_token');
        await _secureStorage.delete(key: StorageKeys.parentAccessToken);
        await _secureStorage.delete(key: StorageKeys.teacherAccessToken);
        await _secureStorage.delete(key: StorageKeys.parentRefreshToken);
        await _secureStorage.delete(key: StorageKeys.teacherRefreshToken);
      } catch (_) {}
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(StorageKeys.parentId);
      await prefs.remove(StorageKeys.studentId);
      await prefs.remove(StorageKeys.staffId);
      await prefs.remove(StorageKeys.userRole);
      await prefs.remove(StorageKeys.hasDualRole);
      await prefs.setBool(StorageKeys.isLoggedIn, false);
      await ClientContext.clear();
      if (Get.currentRoute != AppRoutes.login && Get.currentRoute != '/login') {
        Get.offAllNamed(AppRoutes.login);
      }
    } catch (e) {
      print('Error during force logout: $e');
    }
  }

  static Future<http.Response> _handleRequest(Future<http.Response> Function() requestFunc) async {
    try {
      var response = await requestFunc();
      if (response.statusCode == 401) {
        final success = await _refreshToken();
        if (success) {
          response = await requestFunc();
        }
      }
      return response;
    } catch (e) {
      String message = 'Unable to connect to the server. Please check your internet connection.';
      if (e is TimeoutException) {
        message = 'The connection timed out. Please try again.';
      } else if (e is SocketException || e.toString().contains('SocketException')) {
        message = 'No internet connection. Please check your network and try again.';
      } else if (e is FormatException) {
        message = 'Received invalid data from the server.';
      }
      return http.Response(json.encode({'message': message}), 500);
    }
  }

  /// Perform a GET request.
  static Future<http.Response> get(String path) async {
    return _handleRequest(() async {
      final token = await getParentToken();
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'User-Agent': 'SchoolConnectApp/1.0.0',
      };
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      return await http.get(
        Uri.parse('$baseUrl$path'),
        headers: headers,
      ).timeout(_timeout);
    });
  }

  /// Perform a POST request.
  static Future<http.Response> post(String path, Map<String, dynamic> body, {Map<String, String>? extraHeaders}) async {
    return _handleRequest(() async {
      final token = await getParentToken();
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'User-Agent': 'SchoolConnectApp/1.0.0',
      };
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
      if (extraHeaders != null) {
        headers.addAll(extraHeaders);
      }

      return await http.post(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: json.encode(body),
      ).timeout(_timeout);
    });
  }

  /// Perform a PATCH request.
  static Future<http.Response> patch(String path, Map<String, dynamic> body) async {
    return _handleRequest(() async {
      final token = await getParentToken();
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'User-Agent': 'SchoolConnectApp/1.0.0',
      };
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      return await http.patch(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: json.encode(body),
      ).timeout(_timeout);
    });
  }

  /// Perform a DELETE request with a JSON body.
  static Future<http.Response> delete(String path, Map<String, dynamic> body) async {
    return _handleRequest(() async {
      final token = await getParentToken();
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'User-Agent': 'SchoolConnectApp/1.0.0',
      };
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }

      final request = http.Request('DELETE', Uri.parse('$baseUrl$path'));
      request.headers.addAll(headers);
      request.body = json.encode(body);
      final streamedResponse = await request.send().timeout(_timeout);
      return await http.Response.fromStream(streamedResponse);
    });
  }
}
