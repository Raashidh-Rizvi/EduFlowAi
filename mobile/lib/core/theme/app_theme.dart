import 'package:flutter/material.dart';

/// EduFlow mobile theme — mirrors the web palette in
/// `frontend/src/index.css` (purple brand, dark + light modes).
///
/// Brand/status colours are identical in both modes and stay `const`.
/// Surface, text and border colours are mode-dependent getters that read
/// [AppTheme.isDark]; [ThemeController] rebuilds the app when it changes.
class AppTheme {
  AppTheme._();

  /// Resolved brightness currently applied to the app. Kept in sync by
  /// [EduFlowApp] on every build (including system theme changes).
  static bool isDark = true;

  // ── Brand colours (same in dark and light, as on web) ──
  static const Color primary = Color(0xFF8B5CF6); // Vibrant purple
  static const Color primaryDeep = Color(0xFF6D28D9);
  static const Color secondary = Color(0xFF3B82F6); // Bright blue
  static const Color accent = Color(0xFFEC4899); // Pink
  static const Color warning = Color(0xFFF59E0B); // Amber
  static const Color success = Color(0xFF10B981); // Emerald
  static const Color error = Color(0xFFEF4444); // Red

  // ── Mode-dependent colours ──
  static Color get bgMain => isDark ? const Color(0xFF0A0A16) : const Color(0xFFF5F3FF);
  static Color get bgSurface => isDark ? const Color(0xFF121226) : const Color(0xFFFFFFFF);
  static Color get bgCard => isDark ? const Color(0xFF191932) : const Color(0xFFFFFFFF);

  /// Purple that stays readable on the current surface (web `--primary-text`).
  static Color get primaryGlow => isDark ? const Color(0xFFC4B5FD) : const Color(0xFF6D28D9);

  static Color get textMain => isDark ? const Color(0xFFFFFFFF) : const Color(0xFF1E1B4B);
  static Color get textMuted => isDark ? const Color(0xFF94A3B8) : const Color(0xFF6B63A0);
  static Color get textSubtle => isDark ? const Color(0xFF64748B) : const Color(0xFF8A84B5);

  static Color get borderSubtle =>
      isDark ? const Color(0xFF2A2447) : const Color(0xFFE2E8F0);
  static Color get borderAccent =>
      isDark ? const Color(0x808B5CF6) : const Color(0x598B5CF6);

  // ── Gradients ──
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient bossGradient = LinearGradient(
    colors: [accent, Color(0xFFE11D48)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static ThemeData get darkTheme => _build(Brightness.dark);
  static ThemeData get lightTheme => _build(Brightness.light);

  static ThemeData _build(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final previous = isDark;
    isDark = dark; // resolve the getters below for this brightness
    final bg = bgMain;
    final surface = bgSurface;
    final card = bgCard;
    final text = textMain;
    final border = borderSubtle;
    isDark = previous;

    final base = dark
        ? ColorScheme.dark(
            primary: primary,
            secondary: secondary,
            surface: surface,
            error: accent,
            onSurface: text,
          )
        : ColorScheme.light(
            primary: primary,
            secondary: secondary,
            surface: surface,
            error: accent,
            onSurface: text,
          );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: bg,
      primaryColor: primary,
      colorScheme: base,
      canvasColor: bg,
      dividerColor: border,
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: text,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: text,
          fontSize: 18,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.02,
        ),
      ),
      cardTheme: CardThemeData(
        color: card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: border, width: 1),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: dark ? const Color(0xFFC4B5FD) : primaryDeep,
        unselectedItemColor: dark ? const Color(0xFF94A3B8) : const Color(0xFF6B63A0),
      ),
    );
  }
}

/// App-wide theme mode (system by default, toggle-able at runtime).
class ThemeController {
  ThemeController._();

  static final ValueNotifier<ThemeMode> mode = ValueNotifier(ThemeMode.system);

  static void toggle(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    mode.value = dark ? ThemeMode.light : ThemeMode.dark;
  }
}
