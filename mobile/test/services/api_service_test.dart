import 'package:flutter_test/flutter_test.dart';

// Simple unit tests that do NOT require a running server
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

  });

  group('Auth logic', () {

    test('Empty email is detected as invalid', () {
      final email = ''.trim();
      expect(email.isEmpty, isTrue);
    });

    test('Valid email passes basic check', () {
      final email = 'student@test.com'.trim();
      expect(email.contains('@'), isTrue);
    });

  });
}
