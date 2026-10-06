import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_theme.dart';
import '../../services/student_portal_service.dart';
import 'portal_widgets.dart';

final _num = NumberFormat.decimalPattern();

/// Rankings & Squad tab (web: LeaderboardTab).
class LeaderboardTab extends StatefulWidget {
  final Map<String, dynamic> profile;
  final String? studentId;

  const LeaderboardTab({super.key, required this.profile, this.studentId});

  @override
  State<LeaderboardTab> createState() => _LeaderboardTabState();
}

class _LeaderboardTabState extends State<LeaderboardTab> {
  final _service = PortalGamificationService();
  List<dynamic> _entries = const [];
  List<Map<String, dynamic>> _squads = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final id = widget.studentId;
      final results = await Future.wait([
        _service.getLeaderboard(type: 'weekly', top: 10),
        id == null || id.isEmpty
            ? Future.value(<String, dynamic>{})
            : _service.getSquad(id),
      ]);
      if (!mounted) return;
      final sq = results[1] as Map<String, dynamic>;
      setState(() {
        _entries = results[0] as List<dynamic>;
        _squads = sq.isNotEmpty ? [sq] : const [];
      });
    } catch (e) {
      debugPrint('Failed to load leaderboard: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_squads.isNotEmpty) ...[
          _squadCard(_squads.first),
          const SizedBox(height: 20),
        ],
        const SectionHeader(
          title: 'Cohort Standings',
          subtitle:
              'Weekly ranking of all learners based on genuine lesson mastery and focus sprints.',
        ),
        if (_loading)
          const LoadingLine('Loading leaderboard')
        else if (_entries.isEmpty)
          const EmptyState(
              icon: Icons.emoji_events_outlined,
              title: 'No rankings yet',
              message: 'Complete lessons and focus sprints to appear here.')
        else
          PortalCard(
            padding: const EdgeInsets.all(8),
            child: Column(
              children: [
                for (var i = 0; i < _entries.length; i++)
                  _row(Map<String, dynamic>.from(_entries[i] as Map), i),
              ],
            ),
          ),
      ],
    );
  }

  Widget _squadCard(Map<String, dynamic> sq) {
    final combinedXp = toInt(sq['combinedXp']);
    final pct = ((combinedXp / 2500) * 100).round().clamp(0, 100);
    final avatar = (sq['avatarUrl'] ?? '').toString();
    final members = (sq['members'] is List) ? sq['members'] as List : const [];
    return PortalCard(
      padding: const EdgeInsets.all(20),
      borderColor: tint(AppTheme.primary, 0.4),
      gradient: LinearGradient(colors: [
        tint(AppTheme.primary, 0.08),
        tint(AppTheme.secondary, 0.08),
      ]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(avatar.isNotEmpty ? avatar : '🚀',
                  style: const TextStyle(fontSize: 32)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const StatusPill(
                        label: 'MY SQUAD COLLABORATIVE GOAL',
                        color: AppTheme.primary),
                    const SizedBox(height: 4),
                    Text((sq['name'] ?? 'Squad').toString(),
                        style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textMain)),
                  ],
                ),
              ),
              Text('${_num.format(combinedXp)} XP',
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.warning)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Text(
                    'Quest: ${(sq['description'] ?? '').toString().isEmpty ? 'Sprint Quest' : sq['description']}',
                    style: TextStyle(
                        fontSize: 12.5,
                        color: AppTheme.textMain,
                        fontWeight: FontWeight.w600)),
              ),
              Text('$pct% Completed',
                  style: TextStyle(
                      fontSize: 12, color: AppTheme.textMuted)),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            height: 8,
            decoration: BoxDecoration(
              color: AppTheme.bgMain,
              borderRadius: BorderRadius.circular(99),
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
          if (members.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text('Teammates:',
                    style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                for (final m in members)
                  if (m is Map)
                    StatusPill(
                        label:
                            '${m['studentName'] ?? 'Learner'} (${_num.format(toInt(m['totalXp']))} XP)',
                        color: AppTheme.secondary),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _row(Map<String, dynamic> e, int idx) {
    final isMe = (e['studentName'] != null &&
            e['studentName'] == widget.profile['fullName']) ||
        (widget.studentId != null &&
            e['studentId']?.toString() == widget.studentId);
    final bg = isMe
        ? tint(AppTheme.primary, 0.12)
        : idx == 0
            ? tint(AppTheme.warning, 0.08)
            : AppTheme.bgSurface;
    const medals = ['🥇', '🥈', '🥉'];
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: isMe ? tint(AppTheme.primary, 0.5) : AppTheme.borderSubtle),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 36,
            child: Text(idx < 3 ? medals[idx] : '#${idx + 1}',
                style: TextStyle(
                    fontSize: idx < 3 ? 20 : 14,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textMuted)),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text((e['studentName'] ?? 'Learner').toString(),
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textMain,
                              fontSize: 13.5)),
                    ),
                    if (isMe) ...[
                      const SizedBox(width: 6),
                      const StatusPill(label: 'YOU', color: AppTheme.primary),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                    'Level ${toInt(e['level'], 1)} • ${toInt(e['streak'])}d streak',
                    style: TextStyle(
                        fontSize: 11.5, color: AppTheme.textMuted)),
              ],
            ),
          ),
          Text('${_num.format(toInt(e['scoreXp']))} XP',
              style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13.5,
                  color: isMe ? AppTheme.primary : AppTheme.secondary)),
        ],
      ),
    );
  }
}
