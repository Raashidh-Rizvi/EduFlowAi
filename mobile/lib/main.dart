import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/main_navigation_screen.dart';

void main() {
  runApp(const EduFlowApp());
}

class EduFlowApp extends StatefulWidget {
  const EduFlowApp({super.key});

  @override
  State<EduFlowApp> createState() => _EduFlowAppState();
}

class _EduFlowAppState extends State<EduFlowApp> with WidgetsBindingObserver {
  Map<String, dynamic>? _currentUser = {
    'name': 'Alex Rivera',
    'email': 'student@eduflow.ai',
    'level': 'Level 2 • 1,250 XP',
  };

  void _handleLoginSuccess(Map<String, dynamic> user) {
    setState(() {
      _currentUser = user;
    });
  }

  void _handleLogout() {
    setState(() {
      _currentUser = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.mode,
      builder: (context, mode, _) {
        final platformDark =
            WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
        final isDark = mode == ThemeMode.dark || (mode == ThemeMode.system && platformDark);
        AppTheme.isDark = isDark;
        return MaterialApp(
          title: 'EduFlow AI Student',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: mode,
          // Rebuild the whole tree when the mode flips so every
          // AppTheme getter is re-read.
          home: KeyedSubtree(
            key: ValueKey(isDark),
            child: _currentUser == null
                ? LoginScreen(onLoginSuccess: _handleLoginSuccess)
                : MainNavigationScreen(
                    user: _currentUser!,
                    onLogout: _handleLogout,
                  ),
          ),
        );
      },
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangePlatformBrightness() {
    // Re-evaluate when following the system theme.
    if (ThemeController.mode.value == ThemeMode.system) {
      setState(() {});
    }
  }
}
