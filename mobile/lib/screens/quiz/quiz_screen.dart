import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class QuizScreen extends StatefulWidget {
  final Map<String, dynamic>? quizData;
  final Function(int earnedXp, int earnedCoins) onQuizCompleted;

  const QuizScreen({Key? key, this.quizData, required this.onQuizCompleted}) : super(key: key);

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  int _currentQuestionIndex = 0;
  int? _selectedOptionIndex;
  bool _hasSubmittedCurrent = false;
  int _correctAnswersCount = 0;
  bool _isFinished = false;

  final List<Map<String, dynamic>> _questions = const [
    {
      'prompt': 'What is the primary architectural purpose of Clean Architecture in .NET 8?',
      'options': [
        'To isolate business entities from frameworks, databases, and UI layers',
        'To make code run without a CPU',
        'To bypass database indexes completely',
        'To eliminate the need for unit tests',
      ],
      'correctIndex': 0,
      'explanation': 'Clean Architecture ensures high maintainability and testability by decoupling domain entities.',
    },
    {
      'prompt': 'Why must student XP rewards be recorded into an immutable transaction ledger?',
      'options': [
        'To eliminate duplicate reward exploits and guarantee complete mathematical auditability',
        'Because PostgreSQL cannot update integer columns',
        'To make LLMs responsible for business rules',
        'To slow down student progress',
      ],
      'correctIndex': 0,
      'explanation': 'An immutable ledger provides 100% auditable accounting of XP points awarded.',
    },
    {
      'prompt': 'In PostgreSQL, which index type is optimal for multi-column WHERE clause filtering?',
      'options': [
        'Composite B-Tree index ordered by column selectivity',
        'Single unindexed text scan',
        'No index at all',
        'Random hash table without key constraints',
      ],
      'correctIndex': 0,
      'explanation': 'Composite indexes match filters efficiently when ordered from highest to lowest selectivity.',
    },
  ];

  void _handleSelectOption(int index) {
    if (_hasSubmittedCurrent) return;
    setState(() {
      _selectedOptionIndex = index;
    });
  }

  void _handleSubmitAnswer() {
    if (_selectedOptionIndex == null) return;

    final isCorrect = _selectedOptionIndex == _questions[_currentQuestionIndex]['correctIndex'];
    setState(() {
      _hasSubmittedCurrent = true;
      if (isCorrect) _correctAnswersCount++;
    });
  }

  void _handleNextQuestion() {
    if (_currentQuestionIndex < _questions.length - 1) {
      setState(() {
        _currentQuestionIndex++;
        _selectedOptionIndex = null;
        _hasSubmittedCurrent = false;
      });
    } else {
      setState(() {
        _isFinished = true;
      });
      final scorePct = (_correctAnswersCount / _questions.length) * 100;
      final xp = scorePct >= 70 ? 80 : 20;
      final coins = scorePct >= 70 ? 30 : 5;
      widget.onQuizCompleted(xp, coins);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isFinished) {
      final scorePct = ((_correctAnswersCount / _questions.length) * 100).toInt();
      final passed = scorePct >= 70;

      return Scaffold(
        backgroundColor: AppTheme.bgMain,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(passed ? '🎉' : '📚', style: const TextStyle(fontSize: 64)),
                const SizedBox(height: 16),
                Text(
                  passed ? 'Challenge Conquered!' : 'Keep Practicing!',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.textMain),
                ),
                const SizedBox(height: 8),
                Text(
                  'You scored $scorePct% ($_correctAnswersCount/${_questions.length} correct)',
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 14),
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
                    passed ? '🏆 Earned +80 XP • +30 Coins' : '+20 Effort XP',
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

    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgSurface,
        title: Text('Knowledge Check (${_currentQuestionIndex + 1}/${_questions.length})'),
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
                backgroundColor: Colors.white.withOpacity(0.08),
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
              child: Text(
                currentQ['prompt'],
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textMain, height: 1.4),
              ),
            ),
            const SizedBox(height: 20),

            // Options List
            Expanded(
              child: ListView.builder(
                itemCount: (currentQ['options'] as List).length,
                itemBuilder: (context, index) {
                  final optionText = currentQ['options'][index] as String;
                  final isSelected = _selectedOptionIndex == index;
                  final isCorrect = index == currentQ['correctIndex'];

                  Color bgColor = AppTheme.bgSurface;
                  Color borderColor = AppTheme.borderSubtle;

                  if (_hasSubmittedCurrent) {
                    if (isCorrect) {
                      bgColor = AppTheme.success.withOpacity(0.2);
                      borderColor = AppTheme.success;
                    } else if (isSelected) {
                      bgColor = AppTheme.accent.withOpacity(0.2);
                      borderColor = AppTheme.accent;
                    }
                  } else if (isSelected) {
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
                              color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.06),
                            ),
                            child: Center(
                              child: Text(
                                String.fromCharCode(65 + index),
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Colors.white),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              optionText,
                              style: const TextStyle(color: AppTheme.textMain, fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Explanation Toast
            if (_hasSubmittedCurrent) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.bgSurface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderSubtle),
                ),
                child: Text(
                  '💡 Explanation: ${currentQ['explanation']}',
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Submit / Next Button
            ElevatedButton(
              onPressed: _selectedOptionIndex == null
                  ? null
                  : _hasSubmittedCurrent
                      ? _handleNextQuestion
                      : _handleSubmitAnswer,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: Text(
                _hasSubmittedCurrent
                    ? (_currentQuestionIndex == _questions.length - 1 ? 'Finish & Claim XP 🏆' : 'Next Question ➔')
                    : 'Submit Answer',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
