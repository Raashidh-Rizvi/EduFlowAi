import 'package:dio/dio.dart';
import 'api_service.dart';

class GamificationService {
  final Dio _dio = ApiService.createDio();

  /// Get the student's full game dashboard (XP, level, streak, coins)
  Future<Map<String, dynamic>?> getDashboard() async {
    try {
      final studentId = await ApiService.getUserId();
      if (studentId == null || studentId.isEmpty) {
        print('[GamificationService] No student ID in session');
        return null;
      }

      final response = await _dio.get('/gamification/dashboard/$studentId');
      if (response.statusCode == 200 && response.data != null) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } on DioException catch (e) {
      print('[GamificationService] Dashboard failed: ${e.message}');
      return null;
    }
  }

  /// Get leaderboard entries
  Future<List<dynamic>> getLeaderboard({
    String type = 'weekly',
    int top = 20,
  }) async {
    try {
      final response = await _dio.get(
        '/gamification/leaderboard',
        queryParameters: {'type': type, 'top': top},
      );
      if (response.statusCode == 200 && response.data is List) {
        return response.data as List;
      }
      return [];
    } on DioException catch (e) {
      print('[GamificationService] Leaderboard failed: ${e.message}');
      return [];
    }
  }
}
