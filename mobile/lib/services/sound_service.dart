import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppSound { click, toggle, success, pop, error }

class SoundService {
  SoundService._internal();
  static final SoundService instance = SoundService._internal();

  bool _soundEnabled = true;
  static const _soundPrefKey = 'sound_enabled';
  
  // Keep references to prevent premature garbage collection
  final Set<AudioPlayer> _activePlayers = {};

  final Map<AppSound, String> _files = {
    AppSound.click: 'sounds/click.ogg',
    AppSound.toggle: 'sounds/toggle.ogg',
    AppSound.success: 'sounds/success.ogg',
    AppSound.pop: 'sounds/pop.ogg',
    AppSound.error: 'sounds/error.ogg',
  };

  /// Call once in main() before runApp()
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _soundEnabled = prefs.getBool(_soundPrefKey) ?? true;
  }

  Future<void> play(AppSound sound) async {
    if (!_soundEnabled) return;
    try {
      final player = AudioPlayer();
      _activePlayers.add(player);
      await player.play(AssetSource(_files[sound]!));
      player.onPlayerComplete.listen((_) {
        player.dispose();
        _activePlayers.remove(player);
      });
    } catch (e) {
      debugPrint('SoundService: failed to play ${sound.name}: $e');
    }
  }

  Future<void> setSoundEnabled(bool value) async {
    _soundEnabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_soundPrefKey, value);
  }

  bool get soundEnabled => _soundEnabled;

  Future<void> dispose() async {}
}
