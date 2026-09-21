import 'package:dio/dio.dart';
import 'api_service.dart';

class AuthService {
  final Dio _dio = ApiService.createDio();

  /// Login with email + password.
  /// Returns the user object on success, null on failure.
  Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email.trim(),
        'password': password,
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final token = (data['token'] ?? data['Token']) as String?;
        final user = data['user'] as Map<String, dynamic>? ?? {
          'id': data['userId'] ?? data['id'],
          'fullName': data['fullName'] ?? data['name'],
          'name': data['fullName'] ?? data['name'],
          'email': data['email'] ?? email.trim(),
          'role': data['role'],
        };

        if (token != null && token.isNotEmpty) {
          await ApiService.saveToken(token);
          await ApiService.saveUser(user);
          return user;
        }
      }
      return null;
    } on DioException catch (e) {
      print('[AuthService] Login failed: ${e.message}');
      return null;
    } catch (e) {
      print('[AuthService] Unexpected error: $e');
      return null;
    }
  }

  Future<void> logout() async {
    await ApiService.clearSession();
  }
}
