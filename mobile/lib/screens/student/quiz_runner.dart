import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../services/student_portal_service.dart';
import 'portal_widgets.dart';

/// Runs a quiz: collects answers, submits once, and shows the server's result
/// (web: QuizRunner). The runner never sees answer keys.
class QuizRunner extends StatefulWidget {
  final Map<String, dynamic> quiz;
  final Future<Map<String, dynamic>> Function(
      Map<String, dynamic> quiz, List<Map<String, dynamic>> answers) onComplete;
  final VoidCallback onCancel;

  const QuizRunner({
    super.key,
    required this.quiz,
    required this.onComplete,
    required this.onCancel,
  });

  @override
  State<QuizRunner> createState() => _QuizRunnerState();
}

class _QuizRunnerState extends State<QuizRunner> {
  int _qIdx = 0;
  int? _selected;
  final List<Map<String, dynamic>> _answers = [];
  bool _submitting = false;
  Map<String, dynamic>? _result;
  String? _submitError;

  List<Map<String, dynamic>> get _questions =>
      ((widget.quiz['questions'] as List?) ?? const [])
          .map((q) => Map<String, dynamic>.from(q as Map))
          .toList();

  Future<void> _submit(List<Map<String, dynamic>> answers) async {
    setState(() {
      _submitting = true;
      _submitError = null;
    });
    try {
      final r = await widget.onComplete(widget.quiz, answers);
      if (!mounted) return;
      setState(() => _result = r);
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitError = e is PortalException
          ? e.message
          : 'Your answers could not be submitted. No result was recorded.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _next() async {
    final qs = _questions;
    final q = qs[_qIdx];
    final options = (q['options'] as List?) ?? const [];
    _answers.add({
      'questionId': q['id'],
      'selectedAnswer':
          _selected != null && _selected! < options.length ? options[_selected!].toString() : '',
    });
    if (_qIdx < qs.length - 1) {
      setState(() {
        _qIdx++;
        _selected = null;
      });
    } else {
      await _submit(List.of(_answers));
    }
  }

  @override
  Widget build(BuildContext context) {
    final qs = _questions;
    if (qs.isEmpty) {
      return PortalCard(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
        child: Column(
          children: [
            Text('No Questions Available',
                style: TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textMain)),
            const SizedBox(height: 12),
            PrimaryButton(label: 'Back to Curriculum', onPressed: widget.onCancel),
          ],
        ),
      );
    }

    if (_submitError != null) {
      return PortalCard(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
        child: Column(
          children: [
            Text('Submission Failed',
                style: TextStyle(
                    fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textMain)),
            const SizedBox(height: 8),
            Text(_submitError!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
            const SizedBox(height: 20),
            Wrap(
              spacing: 10,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                PrimaryButton(
                  label: _submitting ? 'Retrying...' : 'Retry Submission',
                  onPressed: _submitting ? null : () => _submit(List.of(_answers)),
                ),
                GhostButton(label: 'Return to Curriculum', onPressed: widget.onCancel),
              ],
            ),
          ],
        ),
      );
    }

    if (_result != null) return _resultView(_result!);

    final q = qs[_qIdx];
    final isLast = _qIdx == qs.length - 1;
    final options = (q['options'] as List?) ?? const [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.quiz['title']?.toString() ?? '',
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textMain)),
                  Text('Question ${_qIdx + 1} of ${qs.length}',
                      style: TextStyle(fontSize: 11.5, color: AppTheme.textMuted)),
                ],
              ),
            ),
            IconButton(
              icon: Icon(Icons.close, size: 16, color: AppTheme.textMuted),
              onPressed: widget.onCancel,
            ),
          ],
        ),
        const SizedBox(height: 14),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: TweenAnimationBuilder<double>(
            tween: Tween(end: (_qIdx + 1) / qs.length),
            duration: const Duration(milliseconds: 300),
            builder: (_, v, __) => LinearProgressIndicator(
              value: v,
              minHeight: 6,
              backgroundColor: AppTheme.bgMain,
              color: AppTheme.primary,
            ),
          ),
        ),
        const SizedBox(height: 14),
        PortalCard(
          color: AppTheme.bgSurface,
          child: Text(q['prompt']?.toString() ?? '',
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textMain,
                  height: 1.5)),
        ),
        const SizedBox(height: 14),
        for (var i = 0; i < options.length; i++) ...[
          _option(i, options[i].toString()),
          const SizedBox(height: 8),
        ],
        const SizedBox(height: 6),
        SizedBox(
          width: double.infinity,
          child: Opacity(
            opacity: _selected == null || _submitting ? 0.5 : 1,
            child: PrimaryButton(
              label: _submitting
                  ? 'Submitting...'
                  : isLast
                      ? 'Submit Assessment'
                      : 'Next Question →',
              onPressed: _selected == null || _submitting ? null : _next,
            ),
          ),
        ),
      ],
    );
  }

  Widget _option(int i, String text) {
    final sel = i == _selected;
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: _submitting ? null : () => setState(() => _selected = i),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: sel ? tint(AppTheme.primary, 0.12) : AppTheme.bgCard,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
              color: sel ? tint(AppTheme.primary, 0.45) : AppTheme.borderSubtle),
        ),
        child: Row(
          children: [
            Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: sel ? AppTheme.primary : AppTheme.bgSurface,
                border: Border.all(color: AppTheme.borderSubtle),
              ),
              child: Text(String.fromCharCode(65 + i),
                  style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: sel ? Colors.white : AppTheme.textMain)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(text,
                  style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textMain)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _resultView(Map<String, dynamic> r) {
    final passed = r['passed'] == true;
    final finalScore = toDouble(r['percentageScore']).round();
    final badge = r['badgeUnlocked']?.toString();
    final breakdown = ((r['questionBreakdown'] as List?) ?? const [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
    final passing = widget.quiz['passingScorePercent'];
    final feedback = r['feedback']?.toString() ?? '';

    return PortalCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
      child: Column(
        children: [
          Text(
            r['status'] == 'Evaluating'
                ? 'Submitted — Awaiting Marking'
                : passed
                    ? '🎉 Assessment Passed'
                    : 'Assessment Finished',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 22, fontWeight: FontWeight.w800, color: AppTheme.textMain),
          ),
          const SizedBox(height: 6),
          Text(
            'Score: ${r['scoreObtained']}/${r['maxScore']} ($finalScore%)'
            '${passing != null ? ' • Required: $passing%' : ''}',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
            decoration: BoxDecoration(
              color: passed ? tint(AppTheme.success, 0.12) : tint(AppTheme.primary, 0.12),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: passed
                      ? tint(AppTheme.success, 0.4)
                      : tint(AppTheme.primary, 0.4)),
            ),
            child: Text(
              '+${r['xpEarned'] ?? 0} XP • +${r['coinsEarned'] ?? 0} EduCoins Earned',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: passed ? AppTheme.success : AppTheme.textMain),
            ),
          ),
          if (badge != null && badge.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              constraints: const BoxConstraints(maxWidth: 380),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: tint(AppTheme.warning, 0.12),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: tint(AppTheme.warning, 0.4)),
              ),
              child: Text('🏆 New Badge Unlocked: ${badge.replaceAll('_', ' ')}!',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.warning)),
            ),
          ],
          if (feedback.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(feedback,
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 12.5, color: AppTheme.textMuted, height: 1.5)),
          ],
          if (breakdown.isNotEmpty) ...[
            const SizedBox(height: 20),
            for (var i = 0; i < breakdown.length; i++) ...[
              _breakdownItem(i, breakdown[i]),
              const SizedBox(height: 8),
            ],
          ],
          const SizedBox(height: 16),
          PrimaryButton(label: 'Return to Curriculum', onPressed: widget.onCancel),
        ],
      ),
    );
  }

  Widget _breakdownItem(int i, Map<String, dynamic> item) {
    final ok = item['isCorrect'] == true;
    final c = ok ? AppTheme.success : AppTheme.accent;
    final correct = item['correctAnswer']?.toString() ?? '';
    final expl = item['explanation']?.toString() ?? '';
    final sel = item['selectedAnswer']?.toString() ?? '';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: tint(c, 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: tint(c, 0.4)),
      ),
      child: DefaultTextStyle(
        style: TextStyle(fontSize: 12, color: AppTheme.textMain, height: 1.5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${i + 1}. ${item['prompt'] ?? ''} (${item['pointsAwarded'] ?? 0} marks)',
                style: const TextStyle(fontWeight: FontWeight.w700)),
            Text('Your answer: ${sel.isEmpty ? '(no answer)' : sel}'),
            if (correct.isNotEmpty && correct != 'Hidden') Text('Correct answer: $correct'),
            if (expl.isNotEmpty)
              Text(expl, style: TextStyle(color: AppTheme.textMuted)),
          ],
        ),
      ),
    );
  }
}
