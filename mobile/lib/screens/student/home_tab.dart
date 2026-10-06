import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import 'portal_widgets.dart';

final _num = NumberFormat.decimalPattern();

/// Dashboard tab: level progress, streak, study mission and shortcuts
/// (web: HomeTab).
class HomeTab extends StatefulWidget {
  final Map<String, dynamic> profile;
  final VoidCallback onMissionClaim;
  final VoidCallback onFreezeUse;
  final void Function(String tab) onNavigate;
  final VoidCallback onStartQuiz;

  const HomeTab({
    super.key,
    required this.profile,
    required this.onMissionClaim,
    required this.onFreezeUse,
    required this.onNavigate,
    required this.onStartQuiz,
  });

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  bool _claimed = false;

  @override
  Widget build(BuildContext context) {
    final p = widget.profile;
    final xpInLevel = toInt(p['xpInLevel']);
    final xpToNext = toInt(p['xpToNext'], 100);
    final pct = xpToNext <= 0 ? 0 : ((xpInLevel / xpToNext) * 100).round().clamp(0, 100);
    final level = toInt(p['level'], 1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Level progress
        PortalCard(
          color: AppTheme.bgSurface,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'LEVEL $level — ${(p['levelName'] ?? 'Novice').toString().toUpperCase()}',
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.secondary,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 4),
                        Text.rich(TextSpan(children: [
                          TextSpan(
                            text: '${_num.format(toInt(p['totalXp']))} ',
                            style: const TextStyle(
                                fontSize: 30,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryGlow),
                          ),
                          const TextSpan(
                            text: 'Total XP',
                            style: TextStyle(
                                fontSize: 14,
                                color: AppTheme.textMuted,
                                fontWeight: FontWeight.w600),
                          ),
                        ])),
                      ],
                    ),
                  ),
                  Column(
                    children: [
                      Text('${toInt(p['coins'])}',
                          style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.warning)),
                      const Text('Coins',
                          style: TextStyle(fontSize: 10.5, color: AppTheme.textMuted)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                height: 10,
                decoration: BoxDecoration(
                  color: AppTheme.bgMain,
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: AppTheme.borderSubtle),
                ),
                child: FractionallySizedBox(
                  alignment: Alignment.centerLeft,
                  widthFactor: pct / 100,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [AppTheme.primary, AppTheme.secondary]),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '${_num.format(xpInLevel)} / ${_num.format(xpToNext)} XP to Level ${level + 1} ($pct%)',
                style: const TextStyle(
                    fontSize: 12.5, color: AppTheme.textMuted, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Streak & freeze
        PortalCard(
          child: Row(
            children: [
              _iconBox(Icons.local_fire_department, AppTheme.accent),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${toInt(p['streak'])} Day Learning Streak',
                        style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textMain,
                            fontSize: 14)),
                    Text('${toInt(p['freezeTokens'])} streak freeze protection available',
                        style: const TextStyle(fontSize: 11.5, color: AppTheme.textMuted)),
                  ],
                ),
              ),
              GhostButton(
                label: 'Use Freeze',
                icon: Icons.shield_outlined,
                onPressed: widget.onFreezeUse,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Daily mission
        const Text('RECOMMENDED STUDY MISSION',
            style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: AppTheme.textMuted,
                letterSpacing: 0.5)),
        const SizedBox(height: 8),
        PortalCard(
          padding: const EdgeInsets.all(22),
          borderColor:
              _claimed ? tint(AppTheme.success, 0.4) : tint(AppTheme.primary, 0.4),
          color: _claimed ? tint(AppTheme.success, 0.05) : null,
          gradient: _claimed
              ? null
              : LinearGradient(colors: [
                  tint(AppTheme.primary, 0.06),
                  tint(AppTheme.secondary, 0.06),
                ]),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  StatusPill(label: 'Standard Objective', color: AppTheme.primary),
                  Text('+100 XP • +40 Coins',
                      style: TextStyle(
                          color: AppTheme.warning,
                          fontWeight: FontWeight.w700,
                          fontSize: 12.5)),
                ],
              ),
              const SizedBox(height: 8),
              const Text('Clean Architecture & PostgreSQL Indexing',
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: AppTheme.textMain)),
              const SizedBox(height: 4),
              const Text(
                'Read the curriculum specification PDF, review composite index selectivity, and complete the diagnostic evaluation.',
                style: TextStyle(fontSize: 12, color: AppTheme.textMuted, height: 1.5),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: PrimaryButton(
                      label: 'Start Mission Assessment',
                      onPressed: widget.onStartQuiz,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _claimed
                      ? const StatusPill(label: '✓ Completed', color: AppTheme.success)
                      : GhostButton(
                          label: 'Claim Reward',
                          onPressed: () {
                            setState(() => _claimed = true);
                            widget.onMissionClaim();
                          },
                        ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Focus sprint launcher
        PortalCard(
          onTap: () => widget.onNavigate('focus'),
          borderColor: tint(AppTheme.primary, 0.4),
          gradient: LinearGradient(colors: [
            tint(AppTheme.primary, 0.08),
            tint(AppTheme.secondary, 0.08),
          ]),
          child: Row(
            children: [
              _iconBox(Icons.bolt, AppTheme.primary, size: 40),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text('Deep Work Focus Sprint',
                            style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13.5,
                                color: AppTheme.textMain)),
                        StatusPill(label: '+35-75 XP', color: AppTheme.primary),
                      ],
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Lock in uninterrupted concentration, grow your Mind Garden, and preserve your streak.',
                      style: TextStyle(fontSize: 11.5, color: AppTheme.textMuted),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, size: 18, color: AppTheme.primary),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // AI coach shortcut
        PortalCard(
          onTap: () => widget.onNavigate('coach'),
          child: Row(
            children: [
              _iconBox(Icons.smart_toy_outlined, AppTheme.secondary),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('AI Learning Assistant',
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textMain,
                            fontSize: 13.5)),
                    SizedBox(height: 2),
                    Text('Get personalized tutoring or clarify complex topics.',
                        style: TextStyle(fontSize: 11.5, color: AppTheme.textMuted)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, size: 16, color: AppTheme.textMuted),
            ],
          ),
        ),
      ],
    );
  }

  Widget _iconBox(IconData icon, Color color, {double size = 36}) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: tint(color, 0.14),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 20, color: color),
      );
}
