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

class _EduFlowAppState extends State<EduFlowApp> {
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
    return MaterialApp(
      title: 'EduFlow AI Student',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: _currentUser == null
          ? LoginScreen(onLoginSuccess: _handleLoginSuccess)
          : MainNavigationScreen(
              user: _currentUser!,
              onLogout: _handleLogout,
            ),
    );
  }
}
