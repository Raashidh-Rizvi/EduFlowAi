import 'dart:math';

import 'package:dio/dio.dart';
import 'api_service.dart';

/// Thrown with a user-facing message, mirroring the web portal's friendly errors.
class PortalException implements Exception {
  final String message;
  PortalException(this.message);
  @override
  String toString() => message;
}

/// RFC 4122 v4 UUID (used for AI session ids and support request ids).
String generateUuid() {
  final rnd = Random.secure();
  final b = List<int>.generate(16, (_) => rnd.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

/// Turns a relative material path (e.g. /uploads/x.pdf) into an absolute URL.
String resolveServerUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  final origin = ApiService.baseUrl.replaceFirst(RegExp(r'/api/?$'), '');
  return url.startsWith('/') ? '$origin$url' : '$origin/$url';
}

Map<String, dynamic> _asMap(dynamic v) =>
    v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};

List<dynamic> _asList(dynamic v) {
  if (v is List) return v;
  if (v is Map) {
    for (final k in const ['items', 'data', 'courses', 'results']) {
      if (v[k] is List) return v[k] as List;
    }
  }
  return const [];
}

/// Enrollment requests + course access (web: enrollmentService).
class EnrollmentService {
  final Dio _dio = ApiService.createDio();

  Future<List<dynamic>> getMyRequests() async {
    final r = await _dio.get('/students/me/enrollment-requests');
    return _asList(r.data);
  }

  Future<Map<String, dynamic>> getCourseAccess(String courseId) async {
    final r = await _dio.get('/courses/$courseId/access');
    return _asMap(r.data);
  }

  Future<void> requestEnrollment(String courseId) async {
    await _dio.post('/courses/$courseId/enroll');
  }

  Future<void> withdrawEnrollment(String courseId) async {
    await _dio.delete('/courses/$courseId/enroll');
  }
}

/// Student courses, progress, lessons and reviews (web: courseService/reviewService).
class StudentCourseService {
  final Dio _dio = ApiService.createDio();

  Future<List<dynamic>> getMyCourses() async {
    try {
      final r = await _dio.get('/students/me/courses');
      return _asList(r.data);
    } on DioException {
      final r = await _dio.get('/courses');
      return _asList(r.data);
    }
  }

  Future<Map<String, dynamic>> getCourse(String id) async {
    final r = await _dio.get('/courses/$id');
    return _asMap(r.data);
  }

  Future<Map<String, dynamic>> getProgress(String id) async {
    final r = await _dio.get('/courses/$id/progress');
    return _asMap(r.data);
  }

  Future<Map<String, dynamic>> getGrade(String id) async {
    final r = await _dio.get('/courses/$id/grade');
    return _asMap(r.data);
  }

  Future<void> completeLesson(String lessonId) async {
    await _dio.post('/courses/lessons/$lessonId/complete');
  }

  Future<List<dynamic>> listReviews(String courseId) async {
    final r = await _dio.get('/courses/$courseId/reviews');
    return _asList(r.data);
  }

  Future<Map<String, dynamic>> getMyReview(String courseId) async {
    final r = await _dio.get('/courses/$courseId/reviews/mine');
    return _asMap(r.data);
  }

  Future<Map<String, dynamic>> submitReview(
      String courseId, int rating, String comment) async {
    final r = await _dio.post('/courses/$courseId/reviews',
        data: {'rating': rating, 'comment': comment});
    return _asMap(r.data);
  }

  Future<void> deleteReview(String courseId, String reviewId) async {
    await _dio.delete('/courses/$courseId/reviews/$reviewId');
  }
}

/// Server quizzes (web: quizService).
class PortalQuizService {
  final Dio _dio = ApiService.createDio();

  Future<List<dynamic>> getCourseQuizzes(String courseId) async {
    final r = await _dio.get('/quizzes/course/$courseId');
    return _asList(r.data);
  }

  Future<Map<String, dynamic>> startQuiz(String quizId) async {
    final r = await _dio.post('/quizzes/$quizId/start');
    return _asMap(r.data);
  }

  Future<Map<String, dynamic>> submitQuiz(Map<String, dynamic> payload) async {
    final r = await _dio.post('/quizzes/submit', data: payload);
    return _asMap(r.data);
  }
}

/// Gamification endpoints used by the portal (dashboard, squad, focus, missions).
class PortalGamificationService {
  final Dio _dio = ApiService.createDio();

  Future<Map<String, dynamic>> getDashboard(String studentId) async {
    final r = await _dio.get('/gamification/dashboard/$studentId');
    return _asMap(r.data);
  }

  Future<List<dynamic>> getLeaderboard(
      {String type = 'weekly', int top = 10}) async {
    final r = await _dio.get('/gamification/leaderboard',
        queryParameters: {'type': type, 'top': top});
    return _asList(r.data);
  }

  Future<Map<String, dynamic>> getSquad(String studentId) async {
    final r = await _dio.get('/gamification/squads/$studentId');
    return _asMap(r.data);
  }

  Future<Map<String, dynamic>> recordFocusSession(int minutes,
      {String? topicOrTask}) async {
    final r = await _dio.post('/gamification/focus-session', data: {
      'durationMinutes': minutes,
      'topicOrTask': topicOrTask,
      'focusTechnique': 'Pomodoro (${minutes}m)',
    });
    return _asMap(r.data);
  }

  Future<void> claimGrandMission(String studentId) async {
    await _dio.post('/gamification/missions/claim-grand/$studentId');
  }

  Future<void> useStreakFreeze(String studentId) async {
    await _dio.post('/gamification/streak/freeze/$studentId');
  }
}

/// AI assistant + learning agent (web: aiService).
class AiAssistantService {
  final Dio _dio = ApiService.createDio()
    ..options.receiveTimeout = const Duration(seconds: 150)
    ..options.sendTimeout = const Duration(seconds: 150);

  String? _detail(DioException e) {
    final d = e.response?.data;
    if (d is Map && d['detail'] is String) return d['detail'] as String;
    return null;
  }

  /// Returns the full coach response with `reply` normalised.
  Future<Map<String, dynamic>> chat({
    required String? studentId,
    required String courseId,
    required String message,
    String? sourceFile,
    required String sessionId,
  }) async {
    try {
      final r = await _dio.post('/aireview/coach/chat', data: {
        'student_id': studentId,
        'course_id': courseId,
        'message': message,
        'source_file': sourceFile,
        'session_id': sessionId,
      });
      final d = _asMap(r.data);
      final reply = (d['reply'] ?? d['answer'] ?? '').toString().trim();
      if (reply.isEmpty || d['source'] == 'fallback') {
        throw PortalException(
            'The AI assistant returned no answer. Please retry.');
      }
      return {...d, 'reply': reply};
    } on DioException catch (e) {
      throw PortalException(_detail(e) ??
          'The AI assistant is unavailable. Please try again shortly.');
    }
  }

  Future<Map<String, dynamic>> learn({
    required String? studentId,
    required String sessionId,
    String? courseId,
    String? sourceFile,
    required String requestType,
    String? subLectureId,
    String? topic,
  }) async {
    try {
      final r = await _dio.post('/aireview/learn', data: {
        'student_id': studentId,
        'session_id': sessionId,
        'course_id': courseId,
        'source_file': sourceFile,
        'request_type': requestType,
        'sub_lecture_id': subLectureId,
        'topic': topic,
      });
      return _asMap(r.data);
    } on DioException catch (e) {
      throw PortalException(_detail(e) ??
          'The learning service is unavailable. Please try again shortly.');
    }
  }

  Future<List<dynamic>> getSlideDecks() async {
    try {
      final r = await _dio.get('/aireview/learning/slide-decks');
      final d = r.data;
      if (d is Map && d['slide_decks'] is List) return d['slide_decks'] as List;
      return _asList(d);
    } on DioException {
      throw PortalException(
          'Indexed lectures could not be loaded. Check that the AI service is running, then retry.');
    }
  }
}

/// Help & Support tickets (web: supportService).
class SupportService {
  final Dio _dio = ApiService.createDio();

  PortalException _error(DioException e) {
    final status = e.response?.statusCode;
    if (e.response == null ||
        status == 404 ||
        status == 502 ||
        status == 503) {
      return PortalException('Support service is not available yet.');
    }
    final d = e.response?.data;
    if (d is Map) {
      final errors = d['errors'];
      if (errors is Map && errors.isNotEmpty) {
        final parts = <String>[];
        for (final v in errors.values) {
          if (v is List) {
            parts.addAll(v.map((x) => x.toString()));
          } else {
            parts.add(v.toString());
          }
        }
        return PortalException(parts.join(' '));
      }
      final msg = d['message'] ?? d['detail'];
      if (msg is String && msg.isNotEmpty) return PortalException(msg);
    }
    return PortalException('The support request failed. Please try again.');
  }

  Future<Map<String, dynamic>> createTicket(String type, String message) async {
    try {
      final r = await _dio.post('/support/tickets', data: {
        'type': type,
        'message': message,
        'clientRequestId': generateUuid(),
      });
      return _asMap(r.data);
    } on DioException catch (e) {
      throw _error(e);
    }
  }

  Future<List<dynamic>> listTickets(
      {String type = 'All',
      String status = 'All',
      int page = 1,
      int pageSize = 20}) async {
    try {
      final params = <String, dynamic>{'page': page, 'pageSize': pageSize};
      if (type != 'All') params['type'] = type;
      if (status != 'All') params['status'] = status;
      final r = await _dio.get('/support/tickets', queryParameters: params);
      return _asList(r.data);
    } on DioException catch (e) {
      throw _error(e);
    }
  }

  /// Paged variant: returns {items, totalPages, totalCount} for Support History.
  Future<Map<String, dynamic>> listTicketsPage(
      {String type = 'All',
      String status = 'All',
      int page = 1,
      int pageSize = 10}) async {
    try {
      final params = <String, dynamic>{'page': page, 'pageSize': pageSize};
      if (type != 'All') params['type'] = type;
      if (status != 'All') params['status'] = status;
      final r = await _dio.get('/support/tickets', queryParameters: params);
      final d = r.data;
      final items = _asList(d);
      final m = _asMap(d);
      return {
        'items': items,
        'totalPages': m['totalPages'] ?? 1,
        'totalCount': m['totalCount'] ?? items.length,
      };
    } on DioException catch (e) {
      throw _error(e);
    }
  }

  Future<Map<String, dynamic>> getTicket(String id) async {
    try {
      final r = await _dio.get('/support/tickets/$id');
      return _asMap(r.data);
    } on DioException catch (e) {
      throw _error(e);
    }
  }
}
