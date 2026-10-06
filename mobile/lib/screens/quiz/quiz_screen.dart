import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../services/api_service.dart';
import '../../core/theme/app_theme.dart';

class QuizScreen extends StatefulWidget {
  final String quizId;
  final String? quizTitle;
  final Function(int earnedXp, int earnedCoins) onQuizCompleted;

  const QuizScreen({
    Key? key,
    required this.quizId,
    this.quizTitle,
    required this.onQuizCompleted,
  }) : super(key: key);

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  final Dio _dio = ApiService.createDio();

  bool _isLoading = true;
  String? _error;
  String? _attemptId;

  List<Map<String, dynamic>> _questions = [];
  int _currentQuestionIndex = 0;
  int? _selectedOptionIndex;
  // questionId -> selected option text; marks come only from the server.
  final Map<String, String> _answers = {};
  bool _isSubmitting = false;
  Map<String, dynamic>? _result;
  bool _isFinished = false;

  // Timer
  int _timeLimitSeconds = 0;
  int _remainingSeconds = 0;
  Timer? _timer;
  bool _timerExpired = false;

  @override
  void initState() {
    super.initState();
    _loadQuiz();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadQuiz() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final response = await _dio.post('/quizzes/${widget.quizId}/start');
      final data = response.data;

      _attemptId = data['attemptId']?.toString();
      _timeLimitSeconds = data['timeLimitSeconds'] ?? 0;
      _remainingSeconds = _timeLimitSeconds;

      final questionsList = data['questions'] as List<dynamic>? ?? [];
      _questions = questionsList.map<Map<String, dynamic>>((q) {
        final options = (q['options'] as List<dynamic>? ?? []).cast<String>();
        return {
          'questionId': (q['id'] ?? q['questionId'])?.toString() ?? '',
          'prompt': q['prompt'] ?? '',
          'options': options,
          'type': q['type'] ?? 'MultipleChoice',
          'points': q['points'] ?? 10,
        };
      }).toList();

      setState(() {
        _isLoading = false;
      });

      if (_timeLimitSeconds > 0) {
        _startTimer();
      }
    } on DioException catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.response?.data?['message'] ?? 'Failed to load quiz. Please try again.';
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'An unexpected error occurred.';
      });
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds <= 0) {
        timer.cancel();
        setState(() {
          _timerExpired = true;
        });
        _submitAttempt();
      } else {
        setState(() {
          _remainingSeconds--;
        });
      }
    });
  }

  String _formatTime(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Color _timerColor() {
    if (_timeLimitSeconds <= 0) return AppTheme.textMuted;
    final ratio = _remainingSeconds / _timeLimitSeconds;
    if (ratio > 0.5) return AppTheme.success;
    if (ratio > 0.2) return const Color(0xFFF59E0B);
    return AppTheme.accent;
  }

  void _handleSelectOption(int index) {
    if (_isSubmitting || _timerExpired) return;
    setState(() {
      _selectedOptionIndex = index;
    });
  }

  void _recordCurrentAnswer() {
    if (_selectedOptionIndex == null) return;
    final q = _questions[_currentQuestionIndex];
    final options = q['options'] as List<String>;
    _answers[q['questionId'] as String] = options[_selectedOptionIndex!];
  }

  void _handleNextQuestion() {
    _recordCurrentAnswer();
    if (_currentQuestionIndex < _questions.length - 1) {
      setState(() {
        _currentQuestionIndex++;
        _selectedOptionIndex = null;
      });
    } else {
      _submitAttempt();
    }
  }

  /// Submits the attempt; the server marks it and returns the authoritative result.
  Future<void> _submitAttempt() async {
    if (_isSubmitting || _isFinished) return;
    _timer?.cancel();
    setState(() {
      _isSubmitting = true;
    });

    try {
      final response = await _dio.post('/quizzes/submit', data: {
        'quizId': widget.quizId,
        'attemptId': _attemptId,
        'answers': _answers.entries
            .map((e) => {'questionId': e.key, 'selectedAnswer': e.value})
            .toList(),
      });
      final result = Map<String, dynamic>.from(response.data as Map);
      setState(() {
        _result = result;
        _isFinished = true;
        _isSubmitting = false;
      });
      widget.onQuizCompleted(
        (result['xpEarned'] as num?)?.toInt() ?? 0,
        (result['coinsEarned'] as num?)?.toInt() ?? 0,
      );
    } on DioException catch (e) {
      setState(() {
        _isSubmitting = false;
        _error = e.response?.data?['message'] ?? 'Your answers could not be submitted. No result was recorded.';
      });
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _error = 'Your answers could not be submitted. No result was recorded.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppTheme.bgMain,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppTheme.primary),
              SizedBox(height: 16),
              Text('Loading quiz...', style: TextStyle(color: AppTheme.textMuted)),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: AppTheme.bgMain,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppTheme.accent),
                const SizedBox(height: 16),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppTheme.textMain, fontSize: 14),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Go Back', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_isFinished && _result != null) {
      final result = _result!;
      final scorePct = ((result['percentageScore'] as num?) ?? 0).round();
      final passed = result['passed'] == true;
      final xpEarned = (result['xpEarned'] as num?)?.toInt() ?? 0;
      final coinsEarned = (result['coinsEarned'] as num?)?.toInt() ?? 0;

      return Scaffold(
        backgroundColor: AppTheme.bgMain,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(_timerExpired ? '⏰' : (passed ? '🎉' : '📚'), style: const TextStyle(fontSize: 64)),
                const SizedBox(height: 16),
                Text(
                  _timerExpired
                      ? 'Time\'s Up!'
                      : (passed ? 'Challenge Conquered!' : 'Keep Practicing!'),
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.textMain),
                ),
                const SizedBox(height: 8),
                Text(
                  'You scored $scorePct% (${result['scoreObtained']}/${result['maxScore']} marks)',
                  style: TextStyle(color: AppTheme.textMuted, fontSize: 14),
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(
                    color: passed ? AppTheme.success.withOpacity(0.15) : AppTheme.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: passed ? AppTheme.success : AppTheme.primary),
                  ),
                  child: Text(
                    '+$xpEarned XP • +$coinsEarned Coins',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: passed ? AppTheme.success : AppTheme.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Return to Arena', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final currentQ = _questions[_currentQuestionIndex];
    final options = currentQ['options'] as List<String>;

    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgSurface,
        title: Text(widget.quizTitle ?? 'Knowledge Check (${_currentQuestionIndex + 1}/${_questions.length})'),
        actions: [
          if (_timeLimitSeconds > 0)
            Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _timerColor().withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _timerColor()),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.timer, size: 16, color: _timerColor()),
                  const SizedBox(width: 4),
                  Text(
                    _formatTime(_remainingSeconds),
                    style: TextStyle(
                      color: _timerColor(),
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Progress Bar
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: (_currentQuestionIndex + 1) / _questions.length,
                minHeight: 6,
                backgroundColor: AppTheme.textMain.withOpacity(0.08),
                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.secondary),
              ),
            ),
            const SizedBox(height: 24),

            // Question Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderAccent),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Question ${_currentQuestionIndex + 1} of ${_questions.length}  •  ${currentQ['points']} pts',
                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    currentQ['prompt'],
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textMain, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Options List
            Expanded(
              child: ListView.builder(
                itemCount: options.length,
                itemBuilder: (context, index) {
                  final optionText = options[index];
                  final isSelected = _selectedOptionIndex == index;

                  Color bgColor = AppTheme.bgSurface;
                  Color borderColor = AppTheme.borderSubtle;

                  if (isSelected) {
                    bgColor = AppTheme.primary.withOpacity(0.2);
                    borderColor = AppTheme.borderAccent;
                  }

                  return InkWell(
                    onTap: () => _handleSelectOption(index),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: bgColor,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: borderColor, width: 1.5),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isSelected ? AppTheme.primary : AppTheme.textMain.withOpacity(0.06),
                            ),
                            child: Center(
                              child: Text(
                                String.fromCharCode(65 + index),
                                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppTheme.textMain),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              optionText,
                              style: TextStyle(color: AppTheme.textMain, fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Submit / Next Button
            ElevatedButton(
              onPressed: _selectedOptionIndex == null || _isSubmitting ? null : _handleNextQuestion,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: Text(
                _isSubmitting
                    ? 'Submitting...'
                    : (_currentQuestionIndex == _questions.length - 1 ? 'Submit Quiz' : 'Next Question ➔'),
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.textMain),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
