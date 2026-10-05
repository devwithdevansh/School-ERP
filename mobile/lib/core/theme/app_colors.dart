import 'package:flutter/material.dart';
import '../design/tokens.dart';

/// Theme-aware color roles, mapped from the brand kit ([Brand]). Every value
/// is a getter because the palette flips between [_light] and [_dark] based
/// on [AppColors.isDark] — ThemeController sets it and forces a rebuild,
/// since most screens read these tokens directly.
///
/// Brand rule: indigo carries the UI, the violet accent marks calls to action
/// and the active state, amber is a rare highlight. Modules are told apart by
/// icon, not by color. Legacy role names (purple, amber, teal…) are kept so
/// older screens compile, but they now resolve to on-brand tones.
class AppColors {
  AppColors._();

  static bool isDark = false;

  static _Palette get _p => isDark ? _dark : _light;

  // ---- Primary (indigo) ----
  static Color get primary => _p.primary;
  static Color get primaryMid => _p.primaryMid;
  static Color get primaryLight => _p.primaryLight;
  static Color get primaryDark => _p.primaryDark;

  // ---- Accent ----
  static Color get accent => _p.accent;
  static Color get accentDeep => _p.accentDeep;
  static Color get accentPale => _p.accentPale;
  static Color get accentAlt => _p.accentAlt;

  // ---- Status ----
  static Color get teal => _p.teal;
  static Color get tealPale => _p.tealPale;
  static Color get red => _p.red;
  static Color get redPale => _p.redPale;
  static Color get amber => _p.amber;
  static Color get amberPale => _p.amberPale;
  static Color get purple => _p.purple;
  static Color get purplePale => _p.purplePale;

  // ---- Ink (text) ----
  static Color get ink => _p.ink;
  static Color get inkMid => _p.inkMid;
  static Color get inkLight => _p.inkLight;

  // ---- Surface ----
  static Color get border => _p.border;
  static Color get bg => _p.bg;
  static Color get white => _p.white;
  static Color get cardBg => _p.white;
  static Color get surfaceMuted => _p.surfaceMuted;

  // ---- Form fields (deliberately stronger than [border] so inputs stay
  // clearly visible against sheets and cards in both themes) ----
  static Color get fieldBorder => _p.fieldBorder;
  static Color get fieldFill => _p.fieldFill;

  /// Text/icon color to draw on top of a solid [primary] fill. [primary] is
  /// deep indigo in light mode but a pale periwinkle in dark mode, so it
  /// can't be a hardcoded white.
  static Color get onPrimary => isDark ? _p.bg : Colors.white;

  // ---- Glass surfaces ----
  static Color get glassFill =>
      Colors.white.withValues(alpha: isDark ? 0.055 : 0.50);
  static Color get glassStroke =>
      Colors.white.withValues(alpha: isDark ? 0.14 : 0.65);
  static Color get glassHighlight =>
      Colors.white.withValues(alpha: isDark ? 0.08 : 0.85);
  static Color get glassShadow => isDark
      ? Colors.black.withValues(alpha: 0.45)
      : Brand.deep.withValues(alpha: 0.12);

  // ---- Gradients ----
  /// Header / hero surfaces.
  static LinearGradient get primaryGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: isDark
            ? const [Color(0xFF070816), Brand.night, Color(0xFF1E1B4B)]
            : const [Brand.night, Brand.deep, Color(0xFF4338CA)],
        stops: const [0.0, 0.45, 1.0],
      );

  /// Buttons and highlights: indigo into violet.
  static LinearGradient get accentGradient => const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Brand.accent, Brand.accentDeep],
      );

  static LinearGradient get tealGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [teal, Color.lerp(teal, Colors.black, 0.2)!],
      );
}

class _Palette {
  final Color primary, primaryMid, primaryLight, primaryDark;
  final Color accent, accentDeep, accentPale, accentAlt;
  final Color teal, tealPale, red, redPale, amber, amberPale, purple, purplePale;
  final Color ink, inkMid, inkLight;
  final Color border, bg, white, surfaceMuted, fieldBorder, fieldFill;

  const _Palette({
    required this.primary,
    required this.primaryMid,
    required this.primaryLight,
    required this.primaryDark,
    required this.accent,
    required this.accentDeep,
    required this.accentPale,
    required this.accentAlt,
    required this.teal,
    required this.tealPale,
    required this.red,
    required this.redPale,
    required this.amber,
    required this.amberPale,
    required this.purple,
    required this.purplePale,
    required this.ink,
    required this.inkMid,
    required this.inkLight,
    required this.border,
    required this.bg,
    required this.white,
    required this.surfaceMuted,
    required this.fieldBorder,
    required this.fieldFill,
  });
}

const _light = _Palette(
  primary: Color(0xFF4338CA),
  primaryMid: Color(0xFF6366F1),
  primaryLight: Color(0xFFEEF2FF),
  primaryDark: Brand.deep,
  accent: Brand.accent,
  accentDeep: Brand.accentDeep,
  accentPale: Color(0xFFEEF2FF),
  accentAlt: Color(0xFF8B5CF6),
  teal: Color(0xFF10B981),
  tealPale: Color(0xFFE6F8F1),
  red: Color(0xFFE5484D),
  redPale: Color(0xFFFDECEC),
  amber: Color(0xFFF59E0B),
  amberPale: Color(0xFFFEF3C7),
  purple: Color(0xFF8B5CF6),
  purplePale: Color(0xFFF3E8FF),
  ink: Color(0xFF12142B),
  inkMid: Color(0xFF4B5170),
  inkLight: Color(0xFF8F94B3),
  border: Color(0xFFE2E4F4),
  bg: Color(0xFFF3F4FB),
  white: Brand.white,
  surfaceMuted: Color(0xFFEEF0FA),
  fieldBorder: Color(0xFFC7CAE6),
  fieldFill: Color(0xFFFFFFFF),
);

const _dark = _Palette(
  primary: Color(0xFFA5B4FC),
  primaryMid: Color(0xFF818CF8),
  primaryLight: Color(0xFF1E2145),
  primaryDark: Brand.night,
  accent: Color(0xFF818CF8),
  accentDeep: Color(0xFFA78BFA),
  accentPale: Color(0xFF23224A),
  accentAlt: Color(0xFFA78BFA),
  teal: Color(0xFF34D399),
  tealPale: Color(0xFF0F2E26),
  red: Color(0xFFFF7A7F),
  redPale: Color(0xFF3A1719),
  amber: Color(0xFFFBBF24),
  amberPale: Color(0xFF3A2D0E),
  purple: Color(0xFFA78BFA),
  purplePale: Color(0xFF26214A),
  ink: Color(0xFFEEF0FB),
  inkMid: Color(0xFFB4B9D6),
  inkLight: Color(0xFF7E84A8),
  border: Color(0xFF262B4D),
  bg: Brand.night,
  white: Color(0xFF14172B),
  surfaceMuted: Color(0xFF1B1F3B),
  fieldBorder: Color(0xFF3D4475),
  fieldFill: Color(0xFF1B1F3B),
);
