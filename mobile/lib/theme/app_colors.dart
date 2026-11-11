import 'package:flutter/material.dart';

/// Neutral dark palette carried over from the Next.js app's
/// `globals.css` (the shadcn "dark" theme variables).
class AppColors {
  AppColors._();

  static const background = Color(0xFF0A0A0A);
  static const foreground = Color(0xFFFAFAFA);

  static const card = Color(0xFF171717);
  static const cardForeground = Color(0xFFFAFAFA);

  static const primary = Color(0xFFE5E5E5);
  static const primaryForeground = Color(0xFF171717);

  static const secondary = Color(0xFF262626);
  static const secondaryForeground = Color(0xFFFAFAFA);

  static const muted = Color(0xFF262626);
  static const mutedForeground = Color(0xFFA3A3A3);

  static const accent = Color(0xFF262626);
  static const accentForeground = Color(0xFFFAFAFA);

  static const destructive = Color(0xFFB33A3A);

  static const border = Color(0x1AFFFFFF); // white @ 10%
  static const input = Color(0x26FFFFFF); // white @ 15%

  /// Used for the floating bottom action bar / navbar, matching the
  /// `.solid-panel` utility class (a flat tint, no blur — cheap on scroll).
  static const solidPanel = Color(0xEB0E0E10);
}
