import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import 'portal_widgets.dart';

final _num = NumberFormat.decimalPattern();

/// Profile tab: identity, stats, badges, theme note and sign out (web: ProfileTab).
class ProfileTab extends StatelessWidget {
  final Map<String, dynamic> profile;
  final VoidCallback onLogout;

  const ProfileTab({super.key, required this.profile, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final name = (profile['fullName'] ?? 'Student').toString();
    final badges = profile['badges'] is List ? profile['badges'] as List : const [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PortalCard(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Container(
                width: 72,
                height: 72,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppTheme.primaryGradient,
                ),
                child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'S',
                    style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        color: Colors.white)),
              ),
              const SizedBox(height: 12),
              Text(name,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textMain)),
              const SizedBox(height: 4),
              Text(
                  'Level ${toInt(profile['level'], 1)} — ${profile['levelName'] ?? 'Novice'}',
                  style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.secondary,
                      fontWeight: FontWeight.w600)),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  StatusPill(
                      label: '${_num.format(toInt(profile['totalXp']))} XP',
                      color: AppTheme.primary),
                  StatusPill(
                      label: '${toInt(profile['coins'])} Coins',
                      color: AppTheme.warning),
                  StatusPill(
                      label: '${toInt(profile['streak'])} Day Streak',
                      color: AppTheme.error),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text('EARNED CREDENTIALS & BADGES',
            style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: AppTheme.textMuted,
                letterSpacing: 0.5)),
        const SizedBox(height: 8),
        if (badges.isEmpty)
          const EmptyState(
              icon: Icons.military_tech_outlined,
              title: 'No badges yet',
              message: 'Complete lessons, quizzes and focus sprints to earn badges.')
        else
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.15,
            children: [
              for (final b in badges)
                if (b is Map) _badge(Map<String, dynamic>.from(b)),
            ],
          ),
        const SizedBox(height: 20),
        PortalCard(
          child: Row(
            children: [
              const Icon(Icons.dark_mode_outlined, color: AppTheme.secondary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Interface Theme',
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textMain,
                            fontSize: 14)),
                    SizedBox(height: 2),
                    Text(
                        'Toggle between high-contrast Dark and Light modes',
                        style: TextStyle(
                            fontSize: 11.5, color: AppTheme.textMuted)),
                  ],
                ),
              ),
              Switch(
                value: true,
                activeThumbColor: AppTheme.primary,
                onChanged: (_) => showPortalMessage(context,
                    'The mobile app currently uses the high-contrast Dark theme.'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: onLogout,
          icon: const Icon(Icons.logout, size: 18),
          label: const Text('Sign Out'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.error,
            side: BorderSide(color: tint(AppTheme.error, 0.5)),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
      ],
    );
  }

  Widget _badge(Map<String, dynamic> b) {
    final unlocked = b['unlocked'] == true;
    final icon = (b['icon'] ?? '🏅').toString();
    final isEmoji = !icon.startsWith('http') && !icon.startsWith('/');
    return Opacity(
      opacity: unlocked ? 1 : 0.45,
      child: PortalCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(unlocked ? (isEmoji ? icon : '🏅') : '🔒',
                style: const TextStyle(fontSize: 28)),
            const SizedBox(height: 6),
            Text((b['name'] ?? 'Badge').toString(),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12.5,
                    color: AppTheme.textMain)),
            const SizedBox(height: 2),
            Text((b['desc'] ?? '').toString(),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 10.5, color: AppTheme.textMuted)),
          ],
        ),
      ),
    );
  }
}
