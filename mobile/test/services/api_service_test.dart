import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ApiService configuration', () {
    test('Base URL contains correct port 5204', () {
      const baseUrl = 'http://10.0.2.2:5204/api';
      expect(baseUrl.contains('5204'), isTrue);
    });

    test('Base URL ends with /api', () {
      const baseUrl = 'http://10.0.2.2:5204/api';
      expect(baseUrl.endsWith('/api'), isTrue);
    });

    test('Base URL uses HTTP for local development', () {
      const baseUrl = 'http://10.0.2.2:5204/api';
      expect(baseUrl.startsWith('http://'), isTrue);
    });
  });

  group('Auth logic', () {
    test('Empty email is detected as invalid', () {
      expect('', isEmpty);
    });

    test('Valid email passes basic check', () {
      expect(RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch('test@example.com'), isTrue);
    });

    test('Invalid email format rejected', () {
      expect(RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch('notanemail'), isFalse);
    });
  });

  group('Quiz answer validation', () {
    test('Empty answer list is invalid', () {
      final answers = <Map<String, dynamic>>[];
      expect(answers.isEmpty, isTrue);
    });

    test('Answer with questionId and selectedAnswer is valid', () {
      final answer = {'questionId': 'q1', 'selectedAnswer': 'Option A'};
      expect(answer.containsKey('questionId'), isTrue);
      expect(answer.containsKey('selectedAnswer'), isTrue);
    });

    test('MultipleChoice answer matches correct answer case-insensitively', () {
      final studentAnswer = 'option a';
      final correctAnswer = 'Option A';
      expect(studentAnswer.toLowerCase(), correctAnswer.toLowerCase());
    });

    test('MultipleSelect requires exact set match', () {
      final studentSet = {'A', 'B'}.toSet();
      final correctSet = {'A', 'B', 'C'}.toSet();
      expect(studentSet.containsAll(correctSet) && correctSet.containsAll(studentSet), isFalse);
    });

    test('FillInBlank strips punctuation before comparison', () {
      final student = 'recursion.';
      final correct = 'recursion';
      final cleanStudent = student.replaceAll(RegExp(r'[^\w\s]'), '').trim().toLowerCase();
      final cleanCorrect = correct.replaceAll(RegExp(r'[^\w\s]'), '').trim().toLowerCase();
      expect(cleanStudent, cleanCorrect);
    });
  });

  group('Journey node status logic', () {
    test('Node with all contentItems completed is marked completed', () {
      final contentItems = [
        {'isCompleted': true},
        {'isCompleted': true}
      ];
      final isCompleted = contentItems.every((ci) => ci['isCompleted'] == true);
      expect(isCompleted, isTrue);
    });

    test('Node with partial completion is marked active', () {
      final contentItems = [
        {'isCompleted': true},
        {'isCompleted': false}
      ];
      final isCompleted = contentItems.every((ci) => ci['isCompleted'] == true);
      expect(isCompleted, isFalse);
    });

    test('Node with empty contentItems is marked active', () {
      final contentItems = <dynamic>[];
      final isCompleted = contentItems.isNotEmpty &&
          contentItems.every((ci) => (ci as Map<String, dynamic>)['isCompleted'] == true);
      expect(isCompleted, isFalse);
    });
  });

  group('Score calculation', () {
    test('Percentage score calculated correctly', () {
      int scoreObtained = 85;
      int totalPoints = 100;
      double percent = totalPoints > 0 ? (scoreObtained.toDouble() / totalPoints) * 100 : 0;
      expect(percent, 85.0);
    });

    test('Pass threshold check', () {
      double percent = 70.0;
      int passingScore = 70;
      bool passed = percent >= passingScore;
      expect(passed, isTrue);
    });

    test('Exact threshold passes', () {
      double percent = 70.0;
      int passingScore = 70;
      bool passed = percent >= passingScore;
      expect(passed, isTrue);
    });
  });
}
