import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Journey node transformation', () {
    test('Module with topics produces lesson nodes', () {
      final modules = [
        {
          'title': 'Module 1',
          'topics': [
            {
              'id': 'topic-1',
              'title': 'Introduction',
              'quizCount': 0,
              'contentItems': [],
              'estimatedMinutes': 30,
              'description': 'Learn basics'
            }
          ],
          'quizzes': []
        }
      ];

      final nodes = <Map<String, dynamic>>[];
      for (final mod in modules) {
        final modMap = mod as Map<String, dynamic>;
        final moduleTitle = modMap['title'] as String? ?? 'Module';
        final topics = modMap['topics'] as List<dynamic>? ?? [];
        for (final topic in topics) {
          final topicMap = topic as Map<String, dynamic>;
          final quizCount = topicMap['quizCount'] as int? ?? 0;
          final contentItems = topicMap['contentItems'] as List<dynamic>? ?? [];
          final isCompleted = contentItems.isNotEmpty &&
              contentItems.every((ci) => (ci as Map<String, dynamic>)['isCompleted'] == true);
          final xp = (topicMap['estimatedMinutes'] as int? ?? 30) * 3;
          nodes.add({
            'id': topicMap['id'],
            'title': topicMap['title'] ?? 'Topic',
            'moduleTitle': moduleTitle,
            'type': quizCount > 0 ? 'challenge' : 'lesson',
            'status': isCompleted ? 'completed' : 'active',
            'xp': xp,
          });
        }
      }

      expect(nodes.length, 1);
      expect(nodes[0]['type'], 'lesson');
      expect(nodes[0]['status'], 'active');
      expect(nodes[0]['xp'], 90);
    });

    test('Topic with quizCount > 0 produces challenge node', () {
      final modules = [
        {
          'title': 'Module 1',
          'topics': [
            {
              'id': 'topic-2',
              'title': 'Quiz Time',
              'quizCount': 3,
              'contentItems': [],
              'estimatedMinutes': 15,
              'description': 'Test your knowledge'
            }
          ],
          'quizzes': []
        }
      ];

      final nodes = <Map<String, dynamic>>[];
      for (final mod in modules) {
        final modMap = mod as Map<String, dynamic>;
        final moduleTitle = modMap['title'] as String? ?? 'Module';
        final topics = modMap['topics'] as List<dynamic>? ?? [];
        for (final topic in topics) {
          final topicMap = topic as Map<String, dynamic>;
          final quizCount = topicMap['quizCount'] as int? ?? 0;
          final contentItems = topicMap['contentItems'] as List<dynamic>? ?? [];
          final isCompleted = contentItems.isNotEmpty &&
              contentItems.every((ci) => (ci as Map<String, dynamic>)['isCompleted'] == true);
          final xp = (topicMap['estimatedMinutes'] as int? ?? 30) * 3;
          nodes.add({
            'id': topicMap['id'],
            'title': topicMap['title'] ?? 'Topic',
            'moduleTitle': moduleTitle,
            'type': quizCount > 0 ? 'challenge' : 'lesson',
            'status': isCompleted ? 'completed' : 'active',
            'xp': xp,
          });
        }
      }

      expect(nodes.length, 1);
      expect(nodes[0]['type'], 'challenge');
      expect(nodes[0]['status'], 'active');
      expect(nodes[0]['xp'], 45);
    });

    test('Completed contentItems marks node as completed', () {
      final contentItems = [
        {'isCompleted': true},
        {'isCompleted': true},
        {'isCompleted': true}
      ];
      final isCompleted = contentItems.isNotEmpty &&
          contentItems.every((ci) => (ci as Map<String, dynamic>)['isCompleted'] == true);
      expect(isCompleted, isTrue);
    });

    test('Module quizzes produce boss nodes', () {
      final modules = [
        {
          'title': 'Module 1',
          'topics': [],
          'quizzes': [
            {'id': 'boss-1', 'title': 'Module Boss', 'type': 'boss'}
          ]
        }
      ];

      final nodes = <Map<String, dynamic>>[];
      for (final mod in modules) {
        final modMap = mod as Map<String, dynamic>;
        final moduleTitle = modMap['title'] as String? ?? 'Module';
        final quizzes = modMap['quizzes'] as List<dynamic>? ?? [];
        for (final quiz in quizzes) {
          final quizMap = quiz as Map<String, dynamic>;
          nodes.add({
            'id': quizMap['id'],
            'title': quizMap['title'] ?? 'Boss',
            'moduleTitle': moduleTitle,
            'type': 'boss',
            'status': 'locked',
            'xp': 200,
          });
        }
      }

      expect(nodes.length, 1);
      expect(nodes[0]['type'], 'boss');
      expect(nodes[0]['status'], 'locked');
      expect(nodes[0]['xp'], 200);
    });

    test('Empty modules produces empty nodes', () {
      final modules = <dynamic>[];

      final nodes = <Map<String, dynamic>>[];
      for (final mod in modules) {
        final modMap = mod as Map<String, dynamic>;
        final topics = modMap['topics'] as List<dynamic>? ?? [];
        for (final topic in topics) {
          final topicMap = topic as Map<String, dynamic>;
          nodes.add({'id': topicMap['id']});
        }
      }

      expect(nodes.length, 0);
    });

    test('Multiple modules flatten into single node list', () {
      final modules = [
        {
          'title': 'Module 1',
          'topics': [
            {
              'id': 'topic-1',
              'title': 'Intro',
              'quizCount': 0,
              'contentItems': [],
              'estimatedMinutes': 10,
            }
          ],
          'quizzes': []
        },
        {
          'title': 'Module 2',
          'topics': [
            {
              'id': 'topic-2',
              'title': 'Advanced',
              'quizCount': 0,
              'contentItems': [],
              'estimatedMinutes': 20,
            }
          ],
          'quizzes': []
        }
      ];

      final nodes = <Map<String, dynamic>>[];
      for (final mod in modules) {
        final modMap = mod as Map<String, dynamic>;
        final moduleTitle = modMap['title'] as String? ?? 'Module';
        final topics = modMap['topics'] as List<dynamic>? ?? [];
        for (final topic in topics) {
          final topicMap = topic as Map<String, dynamic>;
          final quizCount = topicMap['quizCount'] as int? ?? 0;
          final contentItems = topicMap['contentItems'] as List<dynamic>? ?? [];
          final isCompleted = contentItems.isNotEmpty &&
              contentItems.every((ci) => (ci as Map<String, dynamic>)['isCompleted'] == true);
          final xp = (topicMap['estimatedMinutes'] as int? ?? 30) * 3;
          nodes.add({
            'id': topicMap['id'],
            'title': topicMap['title'] ?? 'Topic',
            'moduleTitle': moduleTitle,
            'type': quizCount > 0 ? 'challenge' : 'lesson',
            'status': isCompleted ? 'completed' : 'active',
            'xp': xp,
          });
        }
      }

      expect(nodes.length, 2);
      expect(nodes[0]['moduleTitle'], 'Module 1');
      expect(nodes[0]['xp'], 30);
      expect(nodes[1]['moduleTitle'], 'Module 2');
      expect(nodes[1]['xp'], 60);
    });
  });

  group('Timer formatting', () {
    test('Formats minutes and seconds correctly', () {
      int seconds = 125;
      int m = seconds ~/ 60;
      int s = seconds % 60;
      expect('${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}', '02:05');
    });

    test('Zero seconds formats as 00:00', () {
      int seconds = 0;
      int m = seconds ~/ 60;
      int s = seconds % 60;
      expect('${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}', '00:00');
    });
  });

  group('Quiz scoring logic', () {
    test('Score >= 70% passes', () {
      int correct = 7;
      int total = 10;
      double scorePct = (correct / total) * 100;
      expect(scorePct >= 70, true);
    });

    test('Score < 70% fails', () {
      int correct = 6;
      int total = 10;
      double scorePct = (correct / total) * 100;
      expect(scorePct >= 70, false);
    });

    test('XP awarded based on pass/fail', () {
      bool passed = true;
      int xp = passed ? 80 : 20;
      expect(xp, 80);
    });

    test('Coins awarded based on pass/fail', () {
      bool passed = false;
      int coins = passed ? 30 : 5;
      expect(coins, 5);
    });
  });
}
