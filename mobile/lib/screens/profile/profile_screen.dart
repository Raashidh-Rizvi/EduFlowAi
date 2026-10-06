import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  final Map<String, dynamic> studentProfile;
  final VoidCallback onLogout;

  const ProfileScreen({
    Key? key,
    required this.studentProfile,
    required this.onLogout,
  }) : super(key: key);

  final List<Map<String, dynamic>> _badges = const [
    {'title': 'First Step', 'icon': '🚀', 'desc': 'Completed first lesson', 'unlocked': true},
    {'title': 'Quiz Ace', 'icon': '🎯', 'desc': 'Scored 100% on a quiz', 'unlocked': true},
    {'title': 'Unstoppable', 'icon': '🔥', 'desc': 'Maintained 7-day streak', 'unlocked': false},
    {'title': 'Boss Slayer', 'icon': '🏆', 'desc': 'Conquered 5 boss dungeons', 'unlocked': false},
    {'title': 'Team Player', 'icon': '🤝', 'desc': 'Joined a student squad', 'unlocked': true},
    {'title': 'AI Master', 'icon': '🤖', 'desc': 'Completed 10 AI study plans', 'unlocked': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgSurface,
        title: const Text('Student Profile & Badges 🎓'),
        actions: [
          IconButton(
            icon: Icon(AppTheme.isDark ? Icons.light_mode : Icons.dark_mode,
                color: AppTheme.primaryGlow),
            tooltip: 'Toggle light/dark theme',
            onPressed: () => ThemeController.toggle(context),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppTheme.accent),
            tooltip: 'Sign Out',
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppTheme.bgCard,
                  title: Text('Sign Out', style: TextStyle(color: AppTheme.textMain)),
                  content: Text('Are you sure you want to log out of EduFlow AI?', style: TextStyle(color: AppTheme.textMuted)),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: Text('Cancel', style: TextStyle(color: AppTheme.textMuted)),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        onLogout();
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accent),
                      child: const Text('Logout', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            // User Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.bgSurface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.borderAccent),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppTheme.primary.withOpacity(0.25),
                    child: Text(
                      (studentProfile['studentName'] as String)[0],
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: AppTheme.primary),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          studentProfile['studentName'] as String,
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.textMain),
                        ),
                        Text(
                          studentProfile['levelName'] as String,
                          style: const TextStyle(fontSize: 12, color: AppTheme.secondary, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Text('⭐ ${studentProfile['totalXp']} XP', style: const TextStyle(color: AppTheme.warning, fontSize: 12, fontWeight: FontWeight.w800)),
                            const SizedBox(width: 12),
                            Text('🪙 ${studentProfile['coins']} Coins', style: const TextStyle(color: AppTheme.secondary, fontSize: 12, fontWeight: FontWeight.w800)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Badge Collection Grid
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'EARNED BADGES & TROPHIES',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textSubtle, letterSpacing: 0.08),
              ),
            ),
            const SizedBox(height: 12),

            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.2,
              ),
              itemCount: _badges.length,
              itemBuilder: (context, index) {
                final b = _badges[index];
                final isUnlocked = b['unlocked'] as bool;

                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isUnlocked ? AppTheme.bgCard : AppTheme.bgSurface.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isUnlocked ? AppTheme.borderAccent : AppTheme.borderSubtle,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isUnlocked ? b['icon'] : '🔒',
                        style: const TextStyle(fontSize: 28),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        b['title'],
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: isUnlocked ? AppTheme.textMain : AppTheme.textSubtle,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        b['desc'],
                        style: TextStyle(fontSize: 10.5, color: AppTheme.textMuted),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
