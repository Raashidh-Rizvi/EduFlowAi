import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class HomeScreen extends StatelessWidget {
  final Map<String, dynamic> studentProfile;
  final VoidCallback onClaimDailyMission;
  final VoidCallback onUseStreakFreeze;
  final Function(String route) onNavigate;

  const HomeScreen({
    Key? key,
    required this.studentProfile,
    required this.onClaimDailyMission,
    required this.onUseStreakFreeze,
    required this.onNavigate,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final double levelProgress = (studentProfile['xpProgressInLevel'] as num).toDouble() /
        (studentProfile['xpRequiredForNext'] as num).toDouble();

    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgSurface,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppTheme.primary.withOpacity(0.25),
              child: Text(
                (studentProfile['studentName'] as String)[0],
                style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.primary),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  studentProfile['studentName'] as String,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.textMain),
                ),
                Text(
                  studentProfile['levelName'] as String,
                  style: const TextStyle(fontSize: 11, color: AppTheme.secondary, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Coins Pill
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppTheme.warning.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.warning.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.monetization_on, color: AppTheme.warning, size: 16),
                const SizedBox(width: 4),
                Text(
                  '${studentProfile['coins']}',
                  style: const TextStyle(color: AppTheme.warning, fontWeight: FontWeight.w800, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Level Progress Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E1B4B), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppTheme.borderAccent),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withOpacity(0.15),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'LEVEL ${studentProfile['currentLevel']} • ${studentProfile['levelName']}',
                        style: const TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.w800, fontSize: 11.5, letterSpacing: 0.05),
                      ),
                      Text(
                        '${studentProfile['totalXp']} Total XP',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: LinearProgressIndicator(
                      value: levelProgress,
                      minHeight: 10,
                      backgroundColor: Colors.white.withOpacity(0.1),
                      valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.secondary),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${(studentProfile['xpRequiredForNext'] as num) - (studentProfile['xpProgressInLevel'] as num)} XP until Level ${(studentProfile['currentLevel'] as int) + 1}',
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 2. Streak Flame & Protection Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: AppTheme.bgSurface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderSubtle),
              ),
              child: Row(
                children: [
                  const Text('🔥', style: TextStyle(fontSize: 28)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${studentProfile['currentStreak']} Day Streak!',
                          style: const TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w800, fontSize: 14),
                        ),
                        Text(
                          '${studentProfile['freezeTokens']} Freeze Shields Active',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: onUseStreakFreeze,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white.withOpacity(0.06),
                      foregroundColor: AppTheme.secondary,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('🛡️ Use Freeze', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 3. Daily Mission Card
            const Text(
              'TODAY\'S ADAPTIVE MISSION',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textSubtle, letterSpacing: 0.08),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: (studentProfile['isMissionClaimed'] as bool) ? AppTheme.success.withOpacity(0.4) : AppTheme.borderAccent,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('MEDIUM DIFFICULTY', style: TextStyle(color: AppTheme.secondary, fontSize: 10, fontWeight: FontWeight.w800)),
                      ),
                      const Text('+100 XP • +40 🪙', style: TextStyle(color: AppTheme.warning, fontWeight: FontWeight.w800, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Clean Architecture Deep Dive',
                    style: TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Complete 1 lesson on Dependency Inversion and score >= 75% on the diagnostic quiz.',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12.5, height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: (studentProfile['isMissionClaimed'] as bool) ? null : onClaimDailyMission,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: (studentProfile['isMissionClaimed'] as bool) ? AppTheme.success : AppTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        (studentProfile['isMissionClaimed'] as bool) ? '✓ Completed & Claimed' : 'Complete & Claim (+100 XP)',
                        style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 4. Explore Course Catalog Banner
            InkWell(
              onTap: () => onNavigate('explore'),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF065F46), Color(0xFF047857)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.success.withOpacity(0.4)),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.success.withOpacity(0.2),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Text('🧭', style: TextStyle(fontSize: 32)),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Explore Course Catalog',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                          ),
                          Text(
                            'Browse courses in Web Dev, AI, Data Science & Enroll now.',
                            style: TextStyle(color: Colors.white70, fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 14),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // 5. AI Coach Shortcut Banner
            InkWell(
              onTap: () => onNavigate('coach'),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF312E81), Color(0xFF1E1B4B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.primary.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    const Text('🤖', style: TextStyle(fontSize: 32)),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'AI Learning Coach',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                          ),
                          Text(
                            'Ask questions or generate a custom 5-min remedial quest.',
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios, color: AppTheme.secondary, size: 14),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
