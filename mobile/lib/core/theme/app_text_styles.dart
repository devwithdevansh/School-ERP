import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Brand-kit typography: Outfit for headings, Plus Jakarta Sans for UI and
/// body text, JetBrains Mono for amounts and receipt numbers.
class AppTextStyles {
  // Display
  static TextStyle get displayLarge => GoogleFonts.outfit(
        fontSize: 36, fontWeight: FontWeight.w700,
        color: AppColors.ink, letterSpacing: -1.0, height: 1.1,
      );

  static TextStyle get displayMedium => GoogleFonts.outfit(
        fontSize: 28, fontWeight: FontWeight.w700,
        color: AppColors.ink, letterSpacing: -0.6, height: 1.15,
      );

  // Headings
  static TextStyle get h1 => GoogleFonts.outfit(
        fontSize: 22, fontWeight: FontWeight.w700,
        color: AppColors.ink, letterSpacing: -0.3,
      );

  static TextStyle get h2 => GoogleFonts.outfit(
        fontSize: 18, fontWeight: FontWeight.w600,
        color: AppColors.ink, letterSpacing: -0.2,
      );

  static TextStyle get h3 => GoogleFonts.outfit(
        fontSize: 16, fontWeight: FontWeight.w600,
        color: AppColors.ink,
      );

  // Body
  static TextStyle get bodyLarge => GoogleFonts.plusJakartaSans(
        fontSize: 15, fontWeight: FontWeight.w500,
        color: AppColors.ink,
      );

  static TextStyle get bodyMedium => GoogleFonts.plusJakartaSans(
        fontSize: 13.5, fontWeight: FontWeight.w400,
        color: AppColors.inkMid, height: 1.45,
      );

  static TextStyle get bodySmall => GoogleFonts.plusJakartaSans(
        fontSize: 12, fontWeight: FontWeight.w400,
        color: AppColors.inkLight,
      );

  // Labels
  static TextStyle get labelLarge => GoogleFonts.plusJakartaSans(
        fontSize: 13, fontWeight: FontWeight.w600,
        color: AppColors.ink,
      );

  static TextStyle get labelSmall => GoogleFonts.plusJakartaSans(
        fontSize: 10.5, fontWeight: FontWeight.w600,
        color: AppColors.inkLight,
        letterSpacing: 0.8, height: 1.4,
      );

  // Mono (amounts, receipt numbers)
  static TextStyle get mono => GoogleFonts.jetBrainsMono(
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
      );

  static TextStyle get monoLarge => GoogleFonts.jetBrainsMono(
        fontSize: 28, fontWeight: FontWeight.w700,
        color: AppColors.ink, letterSpacing: -0.8,
      );

  static TextStyle get monoMedium => GoogleFonts.jetBrainsMono(
        fontSize: 18, fontWeight: FontWeight.w700,
        color: AppColors.ink, letterSpacing: -0.4,
      );

  static TextStyle get monoSmall => GoogleFonts.jetBrainsMono(
        fontSize: 13, fontWeight: FontWeight.w500,
        color: AppColors.inkMid,
      );

  // Button
  static TextStyle get button => GoogleFonts.plusJakartaSans(
        fontSize: 15, fontWeight: FontWeight.w700,
        letterSpacing: -0.1,
      );
}
