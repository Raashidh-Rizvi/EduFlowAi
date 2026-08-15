import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class LeaderboardScreen extends StatelessWidget {
  const LeaderboardScreen({Key? key}) : super(key: key);

  final List<Map<String, dynamic>> _rankings = const [
    {'rank': 1, 'name': 'Maya Patel', 'xp': 8420, 'level': 6, 'streak': 18, 'isUser': false},
    {'rank': 2, 'name': 'Alex Rivera', 'xp': 4890, 'level': 4, 'streak': 12, 'isUser': true},
    {'rank': 3, 'name': 'Chen Wei', 'xp': 4650, 'level': 4, 'streak': 9, 'isUser': false},
    {'rank': 4, 'name': 'Elena Rostova', 'xp': 2940, 'level': 3, 'streak': 6, 'isUser': false},
    {'rank': 5, 'name': 'Tariq Mansoor', 'xp': 2810, 'level': 3, 'streak': 5, 'isUser': false},
    {'rank': 6, 'name': 'Samantha Gomez', 'xp': 2450, 'level': 2, 'streak': 3, 'isUser': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgSurface,
        title: const Text('Weekly Sprint Podium 🏆'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            // Top 3 Podium View
            Container(
              padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E1B4B), Color(0xFF0F172A)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.borderAccent),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // 2nd Place
                  _buildPodiumItem('🥈', _rankings[1], 80, AppTheme.secondary),
                  // 1st Place
                  _buildPodiumItem('👑', _rankings[0], 110, AppTheme.warning),
                  // 3rd Place
                  _buildPodiumItem('🥉', _rankings[2], 70, const Color(0xFFD97706)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Ranking List
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'GLOBAL COHORT STANDINGS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textSubtle, letterSpacing: 0.08),
              ),
            ),
            const SizedBox(height: 10),

            ..._rankings.map((r) {
              final isUser = r['isUser'] as bool;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isUser ? AppTheme.primary.withOpacity(0.15) : AppTheme.bgSurface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isUser ? AppTheme.borderAccent : AppTheme.borderSubtle,
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      '#${r['rank']}',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: r['rank'] <= 3 ? AppTheme.warning : AppTheme.textMuted,
                      ),
                    ),
                    const SizedBox(width: 14),
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: Colors.white.withOpacity(0.08),
                      child: Text(
                        (r['name'] as String)[0],
                        style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            r['name'],
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: isUser ? AppTheme.secondary : AppTheme.textMain,
                            ),
                          ),
                          Text(
                            'Level ${r['level']} • ${r['streak']}d streak 🔥',
                            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${r['xp']} XP',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppTheme.warning),
                    ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildPodiumItem(String crown, Map<String, dynamic> data, double height, Color color) {
    return Column(
      children: [
        Text(crown, style: const TextStyle(fontSize: 24)),
        const SizedBox(height: 4),
        Text(
          data['name'],
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
        ),
        Text(
          '${data['xp']} XP',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color),
        ),
        const SizedBox(height: 8),
        Container(
          width: 70,
          height: height,
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            border: Border.all(color: color.withOpacity(0.4)),
          ),
          child: Center(
            child: Text(
              '#${data['rank']}',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color),
            ),
          ),
        ),
      ],
    );
  }
}
