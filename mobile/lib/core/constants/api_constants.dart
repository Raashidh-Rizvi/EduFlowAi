class ApiConstants {
  // Local Android Emulator maps 10.0.2.2 to host machine localhost.
  // Backend runs on port 5204 (see launchSettings.json).
  // NOTE: ApiService.baseUrl in api_service.dart is the live value used by all Dio calls.
  static const String baseUrl = "http://10.0.2.2:5204/api";

  // Endpoints
  static const String loginEndpoint = "/auth/login";
  static const String coursesEndpoint = "/courses";
  static const String progressEndpoint = "/progress";
  static const String assessmentsEndpoint = "/assessments";
  static const String studyPlansEndpoint = "/study-plans";
  static const String notificationsEndpoint = "/notifications";
}
