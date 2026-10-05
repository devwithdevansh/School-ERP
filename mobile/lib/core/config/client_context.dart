import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/storage_keys.dart';

/// The school (client) the signed-in user belongs to, as reported by the
/// backend at login: its name and which product modules the organization has
/// licensed to it (`FEES`, `ERP`, …).
///
/// Until a login has happened — or against an older backend that does not send
/// it — the modules are "unknown" and everything is allowed, so the app keeps
/// working exactly as before.
class ClientContext {
  ClientContext._();

  static String? _name;
  static List<String>? _modules;

  /// School name from the server (null if unknown).
  static String? get name => _name;

  /// True when [module] is licensed — or when licences are unknown.
  static bool has(String module) => _modules == null || _modules!.contains(module);

  /// Restore the last login's context. Call once from main().
  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _name = prefs.getString(StorageKeys.clientName);
    final raw = prefs.getString(StorageKeys.clientModules);
    if (raw == null) {
      _modules = null;
    } else {
      try {
        _modules = (json.decode(raw) as List).map((e) => e.toString()).toList();
      } catch (_) {
        _modules = null;
      }
    }
  }

  /// Store the `client` object from a login response (`{name, enabledModules, …}`).
  static Future<void> save(Object? client) async {
    final prefs = await SharedPreferences.getInstance();
    if (client is Map && client['enabledModules'] is List) {
      _name = client['name']?.toString();
      _modules = (client['enabledModules'] as List).map((e) => e.toString()).toList();
      if (_name != null) {
        await prefs.setString(StorageKeys.clientName, _name!);
      }
      await prefs.setString(StorageKeys.clientModules, json.encode(_modules));
    } else {
      await clear();
    }
  }

  static Future<void> clear() async {
    _name = null;
    _modules = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(StorageKeys.clientName);
    await prefs.remove(StorageKeys.clientModules);
  }
}
