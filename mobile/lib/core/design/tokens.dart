import 'package:flutter/material.dart';

/// Raw brand colors. These never change with the theme — `AppColors` maps
/// them onto light/dark roles. To re-skin the app for another school, change
/// this file (and `assets/config/app.env` for the text).
///
/// Same palette as the School ERP web admin, so staff and parents see one brand.
class Brand {
  Brand._();

  /// Deep indigo: header surfaces, solid fills.
  static const Color deep = Color(0xFF1E1B4B);

  /// Near-black used for dark-mode backgrounds and dark text.
  static const Color night = Color(0xFF0B0D1A);
  static const Color white = Color(0xFFFFFFFF);

  /// Single accent: calls to action, the active state, the mark.
  static const Color accent = Color(0xFF6366F1);
  static const Color accentDeep = Color(0xFF7C3AED);

  /// Rare warm highlight (sparkles, unread dots, ratings).
  static const Color highlight = Color(0xFFFBBF24);

  /// Mid indigo, used where a softer tone of [deep] is needed.
  static const Color deepAlt = Color(0xFF312E81);
  static const Color deepAltOnDark = Color(0xFF4F46E5);
}
