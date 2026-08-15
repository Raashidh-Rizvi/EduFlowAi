import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'home/home_screen.dart';
import 'journey/journey_screen.dart';
import 'quiz/quiz_screen.dart';
import 'ai_coach/ai_coach_screen.dart';
import 'leaderboard/leaderboard_screen.dart';
import 'profile/profile_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const MainNavigationScreen({
    Key? key,
    required this.user,
    required this.onLogout,
  }) : super(key: key);

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  late Map<String, dynamic> _studentProfile;

  @override
  void initState() {
    super.initState();
    _studentProfile = {
      'studentName': widget.user['name'] ?? 'Alex Rivera',
      'email': widget.user['email'] ?? 'student@eduflow.ai',
      'totalXp': 1250,
      'currentLevel': 2,
      'levelName': 'Code Apprentice',
      'xpProgressInLevel': 750,
      'xpRequiredForNext': 1000,
      'coins': 180,
      'currentStreak': 5,
      'freezeTokens': 2,
      'isMissionClaimed': false,
    };
  }

  void _claimDailyMission() {
    if (_studentProfile['isMissionClaimed']) return;

    setState(() {
      _studentProfile['totalXp'] += 100;
      _studentProfile['xpProgressInLevel'] += 100;
      _studentProfile['coins'] += 40;
      _studentProfile['isMissionClaimed'] = true;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: AppTheme.success,
        content: Text('🎉 Claimed +100 XP & +40 Coins! Daily Mission Conquered!'),
      ),
    );
  }

  void _useStreakFreeze() {
    if (_studentProfile['freezeTokens'] <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.accent,
          content: Text('No Streak Freeze tokens remaining in inventory!'),
        ),
      );
      return;
    }

    setState(() {
      _studentProfile['freezeTokens'] -= 1;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppTheme.secondary,
        content: Text('🛡️ Streak Freeze Shield Active for today! (${_studentProfile['freezeTokens']} remaining)'),
      ),
    );
  }

  void _openQuizOrBoss(Map<String, dynamic> node) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => QuizScreen(
          quizData: node,
          onQuizCompleted: (earnedXp, earnedCoins) {
            setState(() {
              _studentProfile['totalXp'] += earnedXp;
              _studentProfile['xpProgressInLevel'] += earnedXp;
              _studentProfile['coins'] += earnedCoins;
            });
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      HomeScreen(
        studentProfile: _studentProfile,
        onClaimDailyMission: _claimDailyMission,
        onUseStreakFreeze: _useStreakFreeze,
        onNavigate: (route) {
          if (route == 'coach') {
            setState(() => _currentIndex = 2); // Switch to AI Coach tab
          }
        },
      ),
      JourneyScreen(
        onSelectNode: _openQuizOrBoss,
      ),
      const AiCoachScreen(),
      const LeaderboardScreen(),
      ProfileScreen(
        studentProfile: _studentProfile,
        onLogout: widget.onLogout,
      ),
    ];

    return Scaffold(
      body: pages[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.bgSurface,
          border: Border(top: BorderSide(color: AppTheme.borderSubtle, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (idx) => setState(() => _currentIndex = idx),
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppTheme.bgSurface,
          selectedItemColor: AppTheme.secondary,
          unselectedItemColor: AppTheme.textSubtle,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.map_outlined), label: 'Journey'),
            BottomNavigationBarItem(icon: Icon(Icons.smart_toy_outlined), label: 'AI Coach'),
            BottomNavigationBarItem(icon: Icon(Icons.leaderboard_outlined), label: 'Ranks'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
          ],
        ),
      ),
    );
  }
}
