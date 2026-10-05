import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/env.dart';

/// A robust widget that renders a student's profile photo (from URL, base64, asset, or relative path)
/// or fallback widget (e.g. initials circle avatar) when photo is missing or fails to load.
class StudentImageWidget extends StatelessWidget {
  final String? photoUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget fallback;

  const StudentImageWidget({
    super.key,
    required this.photoUrl,
    required this.fallback,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
  });

  /// Helper to get clean absolute image URL if valid
  static String? resolveUrl(String? rawUrl) {
    if (rawUrl == null) return null;
    final trimmed = rawUrl.trim();
    if (trimmed.isEmpty || trimmed == 'assets/images/student.png') return null;

    if (trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:image') ||
        trimmed.startsWith('assets/')) {
      return trimmed;
    }

    // Relative URL (e.g., /uploads/xxx or uploads/xxx)
    final base = Env.baseUrl;
    try {
      final uri = Uri.parse(base);
      final origin = '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
      final path = trimmed.startsWith('/') ? trimmed : '/$trimmed';
      return '$origin$path';
    } catch (_) {
      return trimmed;
    }
  }

  @override
  Widget build(BuildContext context) {
    final resolved = resolveUrl(photoUrl);

    if (resolved == null) {
      return fallback;
    }

    // Base64 data URL
    if (resolved.startsWith('data:image')) {
      try {
        final commaIdx = resolved.indexOf(',');
        if (commaIdx != -1) {
          final bytes = base64Decode(resolved.substring(commaIdx + 1));
          return Image.memory(
            bytes,
            width: width,
            height: height,
            fit: fit,
            errorBuilder: (_, __, ___) => fallback,
          );
        }
      } catch (_) {
        return fallback;
      }
    }

    // Local asset path
    if (resolved.startsWith('assets/')) {
      return Image.asset(
        resolved,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => fallback,
      );
    }

    // Network image (HTTP / HTTPS / resolved server path)
    return Image.network(
      resolved,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, __, ___) => fallback,
    );
  }
}
