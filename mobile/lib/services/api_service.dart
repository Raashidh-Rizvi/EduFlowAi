import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // Android Emulator: use 10.0.2.2 (not localhost)
  // Windows Desktop: use localhost
  static const String baseUrl = 'http://10.0.2.2:5204/api';

  static const _storage = FlutterSecureStorage();

  /// Create a configured Dio HTTP client with auth token auto-injection
  static Dio createDio() {
    final dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    // Attach JWT token to every request automatically
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'auth_token');
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        print('[ApiService] Error on ${e.requestOptions.path}: ${e.message}');
        return handler.next(e);
      },
    ));

    return dio;
  }

  /// Save JWT token securely after login
  static Future<void> saveToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  /// Save user profile info after login
  static Future<void> saveUser(Map<String, dynamic> user) async {
    await _storage.write(key: 'user_id', value: (user['id'] ?? user['userId'])?.toString() ?? '');
    await _storage.write(key: 'user_name', value: (user['fullName'] ?? user['name'])?.toString() ?? '');
    await _storage.write(key: 'user_role', value: user['role']?.toString() ?? '');
  }

  /// Get the logged-in student's ID
  static Future<String?> getUserId() async {
    return await _storage.read(key: 'user_id');
  }

  /// Get the logged-in student's name
  static Future<String?> getUserName() async {
    return await _storage.read(key: 'user_name');
  }

  /// Clear session on logout
  static Future<void> clearSession() async {
    await _storage.deleteAll();
  }
}
