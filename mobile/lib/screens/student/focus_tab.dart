import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/theme/app_theme.dart';
import '../../services/student_portal_service.dart';
import 'portal_widgets.dart';

const _countKey = 'eduflow_focus_count';
const _gardenKey = 'eduflow_mind_garden';
const _defaultGarden = ['🌱 Focus Seedling', '🌳 Golden Oak Sapling'];
const _customTopic = 'Custom Technical Research';

const _presets = [
  (minutes: 25, label: '25m Classic Sprint', xp: '+35 XP'),
  (minutes: 45, label: '45m Deep Work', xp: '+75 XP'),
  (minutes: 15, label: '15m Quick Burst', xp: '+20 XP'),
  (minutes: 1, label: '1m Test Demo', xp: '+10 XP'),
];

const _topics = [
  (value: 'PostgreSQL B-Tree Index Selectivity',
      label: 'PostgreSQL B-Tree Index Selectivity (Module 1)'),
  (value: 'ACID Transactions & Graph Deadlocks',
      label: 'ACID Transactions & Graph Deadlocks (Module 2)'),
  (value: 'Clean Architecture & DIP Invariants',
      label: 'Clean Architecture & DIP Invariants'),
  (value: _customTopic, label: 'Custom Technical Sprint...'),
];

const _sounds = [
  (mode: 'binaural', label: 'Gamma 40Hz Wave', icon: Icons.graphic_eq),
  (mode: 'rain', label: 'Rain Resonance', icon: Icons.water_drop_outlined),
  (mode: 'none', label: 'Silent', icon: Icons.volume_off_outlined),
];

/// Focus & Flow tab: Pomodoro sprints that grow the Mind Garden
/// (web: FocusFlowTab).
class FocusFlowTab extends StatefulWidget {
  final Map<String, dynamic> profile;
  final Future<void> Function() onSessionCompleted;

  const FocusFlowTab({
    super.key,
    required this.profile,
    required this.onSessionCompleted,
  });

  @override
  State<FocusFlowTab> createState() => _FocusFlowTabState();
}

class _FocusFlowTabState extends State<FocusFlowTab> {
  final _storage = const FlutterSecureStorage();
  final _service = PortalGamificationService();
  final _customCtrl = TextEditingController();

  int _presetMinutes = 25;
  int _timeLeft = 25 * 60;
  bool _isActive = false;
  String _selectedTask = _topics.first.value;
  String _soundMode = 'binaural';
  bool _audioPlaying = false;
  int _completedSessions = 0;
  List<String> _garden = List.of(_defaultGarden);
  Timer? _timer;

  int get _total => _presetMinutes * 60;

  @override
  void initState() {
    super.initState();
    _loadStored();
  }

  Future<void> _loadStored() async {
    try {
      final count = await _storage.read(key: _countKey);
      final garden = await _storage.read(key: _gardenKey);
      if (!mounted) return;
      setState(() {
        _completedSessions = int.tryParse(count ?? '') ?? 0;
        if (garden != null) {
          final decoded = jsonDecode(garden);
          if (decoded is List) _garden = decoded.map((e) => e.toString()).toList();
        }
      });
    } catch (_) {
      // Storage unavailable: keep defaults.
    }
  }

  Future<void> _persist() async {
    try {
      await _storage.write(key: _countKey, value: '$_completedSessions');
      await _storage.write(key: _gardenKey, value: jsonEncode(_garden));
    } catch (_) {}
  }

  @override
  void dispose() {
    _timer?.cancel();
    _customCtrl.dispose();
    super.dispose();
  }

  void _toggleTimer() {
    if (_isActive) {
      _timer?.cancel();
      setState(() => _isActive = false);
      return;
    }
    setState(() => _isActive = true);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_timeLeft <= 1) {
        _timer?.cancel();
        setState(() {
          _timeLeft = 0;
          _isActive = false;
        });
        _finishSprint();
      } else {
        setState(() => _timeLeft--);
      }
    });
  }

  void _reset([int? minutes]) {
    _timer?.cancel();
    setState(() {
      if (minutes != null) _presetMinutes = minutes;
      _isActive = false;
      _timeLeft = _presetMinutes * 60;
    });
  }

  Future<void> _finishSprint() async {
    final custom = _customCtrl.text.trim();
    final task = custom.isNotEmpty ? custom : _selectedTask;
    Map<String, dynamic> res = {};
    try {
      res = await _service.recordFocusSession(_presetMinutes, topicOrTask: task);
    } catch (_) {}
    if (!mounted) return;

    final artifact = (res['focusArtifactAwarded'] as String?)?.isNotEmpty == true
        ? res['focusArtifactAwarded'] as String
        : _presetMinutes >= 45
            ? '💎 Ancient Focus Crystal'
            : _presetMinutes >= 25
                ? '🌳 Golden Oak Sapling'
                : '🌱 Emerald Sprout';

    setState(() {
      _garden = [..._garden, artifact];
      _completedSessions++;
    });
    _persist();

    _showCelebration(
      xp: toInt(res['xpAwarded']),
      coins: toInt(res['coinsAwarded']),
      artifact: artifact,
      task: task,
    );
    await widget.onSessionCompleted();
  }

  void _showCelebration(
      {required int xp,
      required int coins,
      required String artifact,
      required String task}) {
    showDialog<void>(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: AppTheme.bgSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: tint(AppTheme.primary, 0.4)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🎉', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 8),
              const Text('Focus Sprint Conquered!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textMain)),
              const SizedBox(height: 8),
              Text(
                'You completed your sprint on $task without losing concentration!',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 14),
              Text('+$xp XP • +$coins Coins Awarded!',
                  style: const TextStyle(
                      color: AppTheme.warning,
                      fontWeight: FontWeight.w800,
                      fontSize: 15)),
              const SizedBox(height: 10),
              Text(
                'Unlocked Focus Artifact: $artifact added to your Mind Garden!',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12.5, color: AppTheme.success),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: PrimaryButton(
                  label: 'Collect Rewards & Keep Flowing',
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pct = _total == 0 ? 0 : (((_total - _timeLeft) / _total) * 100).round();
    final (emoji, stage) = pct >= 75
        ? (_presetMinutes >= 45
            ? ('💎', 'Ancient Crystal Resonating')
            : ('🌳', 'Golden Oak Thriving'))
        : pct >= 35
            ? ('🌿', 'Deep Flow State Reached')
            : ('🌱', 'Focus Seed Planted');
    final mm = (_timeLeft ~/ 60).toString().padLeft(2, '0');
    final ss = (_timeLeft % 60).toString().padLeft(2, '0');
    final mainLabel = _isActive
        ? 'Pause Sprint'
        : _timeLeft == _total
            ? 'Start Focus Sprint'
            : 'Resume Sprint';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        PortalCard(
          gradient: LinearGradient(colors: [
            tint(AppTheme.primary, 0.1),
            tint(AppTheme.secondary, 0.08),
          ]),
          borderColor: tint(AppTheme.primary, 0.4),
          padding: const EdgeInsets.all(22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  StatusPill(
                      label: 'DEEP WORK STUDIO',
                      color: AppTheme.primary,
                      icon: Icons.bolt),
                  Text('Flow State & Pomodoro Motivation',
                      style: TextStyle(fontSize: 11.5, color: AppTheme.textMuted)),
                ],
              ),
              const SizedBox(height: 10),
              const Text('Study Focus & Mind Garden',
                  style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textMain)),
              const SizedBox(height: 6),
              const Text(
                'Lock in uninterrupted concentration. Uninterrupted focus awards +XP, grows your Mind Garden, and protects your streak!',
                style: TextStyle(fontSize: 12.5, color: AppTheme.textMuted, height: 1.5),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  _stat('$_completedSessions', 'Sprints Finished', AppTheme.warning),
                  const SizedBox(width: 10),
                  _stat('${_garden.length}', 'Mind Garden', AppTheme.success),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Presets
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final p in _presets)
              ChoiceChip(
                selected: _presetMinutes == p.minutes,
                onSelected: (_) => _reset(p.minutes),
                label: Text('${p.label}  ${p.xp}'),
                labelStyle: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: _presetMinutes == p.minutes
                      ? AppTheme.textMain
                      : AppTheme.textMuted,
                ),
                selectedColor: tint(AppTheme.primary, 0.3),
                backgroundColor: AppTheme.bgCard,
                side: BorderSide(
                    color: _presetMinutes == p.minutes
                        ? AppTheme.primary
                        : AppTheme.borderSubtle),
                showCheckmark: false,
              ),
          ],
        ),
        const SizedBox(height: 16),

        // Timer & garden
        PortalCard(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Text(emoji, style: const TextStyle(fontSize: 64)),
              const SizedBox(height: 8),
              Text('$mm:$ss',
                  style: const TextStyle(
                      fontSize: 52,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textMain,
                      fontFeatures: [FontFeature.tabularFigures()])),
              Text(stage,
                  style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.secondary,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 18),
              Row(
                children: [
                  const Text('Flow State Progress',
                      style: TextStyle(fontSize: 11.5, color: AppTheme.textMuted)),
                  const Spacer(),
                  Text('$pct% Completed',
                      style: const TextStyle(
                          fontSize: 11.5,
                          color: AppTheme.primaryGlow,
                          fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: pct / 100,
                  minHeight: 8,
                  backgroundColor: AppTheme.bgMain,
                  valueColor: const AlwaysStoppedAnimation(AppTheme.primary),
                ),
              ),
              const SizedBox(height: 18),

              // Topic
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Active Concentration Topic:',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textMuted)),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedTask,
                isExpanded: true,
                dropdownColor: AppTheme.bgCard,
                style: const TextStyle(fontSize: 13, color: AppTheme.textMain),
                decoration: _inputDecoration(),
                items: [
                  for (final t in _topics)
                    DropdownMenuItem(
                        value: t.value,
                        child: Text(t.label, overflow: TextOverflow.ellipsis)),
                ],
                onChanged: _isActive
                    ? null
                    : (v) => setState(() => _selectedTask = v ?? _selectedTask),
              ),
              if (_selectedTask == _customTopic) ...[
                const SizedBox(height: 8),
                TextField(
                  controller: _customCtrl,
                  enabled: !_isActive,
                  style: const TextStyle(fontSize: 13, color: AppTheme.textMain),
                  decoration:
                      _inputDecoration(hint: 'What are you focusing on?'),
                ),
              ],
              const SizedBox(height: 16),

              // Ambient sound
              Row(
                children: [
                  const Text('Ambient Sound',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textMuted)),
                  const Spacer(),
                  IconButton(
                    tooltip: _audioPlaying ? 'Mute' : 'Unmute',
                    onPressed: _soundMode == 'none'
                        ? null
                        : () => setState(() => _audioPlaying = !_audioPlaying),
                    icon: Icon(
                      _audioPlaying ? Icons.volume_up : Icons.volume_off,
                      size: 18,
                      color: _audioPlaying ? AppTheme.primary : AppTheme.textMuted,
                    ),
                  ),
                ],
              ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final s in _sounds)
                    ChoiceChip(
                      selected: _soundMode == s.mode,
                      onSelected: (_) => setState(() {
                        _soundMode = s.mode;
                        _audioPlaying = s.mode != 'none';
                      }),
                      avatar: Icon(s.icon,
                          size: 14,
                          color: _soundMode == s.mode
                              ? AppTheme.primaryGlow
                              : AppTheme.textMuted),
                      label: Text(s.label),
                      labelStyle: TextStyle(
                        fontSize: 11.5,
                        color: _soundMode == s.mode
                            ? AppTheme.textMain
                            : AppTheme.textMuted,
                      ),
                      selectedColor: tint(AppTheme.secondary, 0.25),
                      backgroundColor: AppTheme.bgMain,
                      side: const BorderSide(color: AppTheme.borderSubtle),
                      showCheckmark: false,
                    ),
                ],
              ),
              const SizedBox(height: 18),

              Row(
                children: [
                  Expanded(
                    child: PrimaryButton(
                      label: mainLabel,
                      icon: _isActive ? Icons.pause : Icons.play_arrow,
                      onPressed: _toggleTimer,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.outlined(
                    tooltip: 'Reset',
                    onPressed: () => _reset(),
                    icon: const Icon(Icons.restart_alt,
                        size: 20, color: AppTheme.textMuted),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Text(
                '💡 Psychology Tip: Completing a continuous focus sprint activates the dopamine reward pathways, reinforcing deep academic recall.',
                style: TextStyle(fontSize: 11.5, color: AppTheme.textMuted, height: 1.5),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Mind garden
        const Text('MIND GARDEN & FOCUS ARTIFACTS',
            style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: AppTheme.textMuted,
                letterSpacing: 0.5)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final a in _garden)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: tint(AppTheme.success, 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: tint(AppTheme.success, 0.3)),
                ),
                child: Text(a,
                    style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.textMain,
                        fontWeight: FontWeight.w600)),
              ),
          ],
        ),
      ],
    );
  }

  InputDecoration _inputDecoration({String? hint}) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppTheme.textSubtle, fontSize: 13),
        isDense: true,
        filled: true,
        fillColor: AppTheme.bgMain,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppTheme.borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppTheme.borderSubtle),
        ),
      );

  Widget _stat(String value, String label, Color color) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.bgMain,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value,
                  style: TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w800, color: color)),
              Text(label,
                  style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
            ],
          ),
        ),
      );
}
