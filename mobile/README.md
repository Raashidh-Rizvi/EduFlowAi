# EduFlow AI – Flutter Mobile Application 📱
> **Student Mobile Learning App built with Flutter 3.x, Dart, and Clean State Management**

---

## 1. Subsystem Overview

The EduFlow AI Mobile App provides students with an interactive, on-the-go portal to engage with courses, complete timed quizzes, track academic progress, submit assignment artifacts via camera/file picker, and request **Personalized AI Study Plans**.

### Key Capabilities
- **Authentication & Security**: Student registration, login, biometric/pin unlock, and secure JWT storage in Android Keystore / iOS Keychain.
- **Course & Lesson Player**: Access enrolled courses, browse module hierarchies, read rich lesson content, and view embedded video resources.
- **Interactive Assessments**: Complete timed multiple-choice quizzes with instant feedback, or upload assignment solutions.
- **AI Study Plan Workspace**: Request dynamic study plans tailored to specific learning targets and view instructor-approved personalized schedules.
- **Push Notifications & Reminders**: Local and cloud notifications for daily study reminders, assessment deadlines, and instructor study plan approval alerts.
- **Device Feature Integration**: Native camera/document picker for assignment evidence upload, local notifications, and date-time pickers.

---

## 2. Directory Structure

```
mobile/
├── android/                   # Native Android configuration & Gradle build scripts
├── ios/                       # Native iOS configuration
├── lib/
│   ├── core/                  # Core constants, themes, network interceptors, error handling
│   │   ├── constants/         # API URLs, color schemes, font constants
│   │   ├── theme/             # Dark/Light theme definitions
│   │   └── utils/             # Date formatters, validation utilities
│   ├── data/                  # Data layer: Models, Repositories, API Providers
│   │   ├── models/            # CourseModel, QuizModel, StudyPlanModel, UserModel
│   │   ├── providers/         # HttpApiClient using Dio / Http package
│   │   └── repositories/      # Concrete repository implementations
│   ├── logic/ / providers/    # State Management (BLoC / Cubit or ChangeNotifier)
│   │   ├── auth/              # AuthBloc (Login, Logout, Token persistence)
│   │   ├── course/            # CourseBloc (Catalog, Enrolled, Lesson Details)
│   │   ├── quiz/              # QuizBloc (Timer, Submission, Scoring)
│   │   ├── progress/          # ProgressBloc (Completion statistics)
│   │   └── study_plan/        # StudyPlanBloc (Request AI plan, Track status)
│   ├── presentation/          # UI Layer: Reusable Widgets & Screens
│   │   ├── widgets/           # Custom buttons, progress rings, lesson cards, loaders
│   │   └── screens/           # AuthScreen, HomeScreen, CourseDetailsScreen, QuizScreen, StudyPlanScreen
│   └── main.dart              # Application entry point & provider bootstrapping
├── test/                      # Unit, Widget, and Integration tests
├── pubspec.yaml               # Flutter dependencies & assets
└── README.md                  # This file
```

---

## 3. State Management & Secure Storage

- **State Management**: Implemented using **BLoC (Business Logic Component)** / **Provider** for clean unidirectional data flow and robust separation of UI from business logic.
- **Secure Token Storage**: Utilizes `flutter_secure_storage` to encrypt and securely persist JWT access and refresh tokens.
- **Network Layer**: Built with `dio` featuring request/response interceptors to automatically inject authorization headers and intercept connection timeouts.

---

## 4. End-to-End Mobile Flow for AI Study Plans

```
1. Student navigates to "AI Study Coach" tab in Flutter app.
2. Fills out Study Plan Request Form:
   - Target Goal (e.g., "Prepare for Midterm Exam in 2 weeks")
   - Available Weekly Study Hours (e.g., 8 hours/week)
   - Challenging Topics (e.g., "PostgreSQL Indexing & Transactions")
3. Submits request -> Flutter calls POST /api/study-plans/request.
4. App enters 'Pending Instructor Review' state with real-time status badge.
5. Once instructor approves in React Web Dashboard:
   - Push notification arrives on mobile device.
   - Flutter app loads approved dynamic study roadmap with daily checklist items.
```

---

## 5. Local Setup & Execution Guide

### 5.1 Prerequisites
- [Flutter SDK 3.19+](https://docs.flutter.dev/get-started/install)
- [Android Studio](https://developer.android.com/studio) with Android SDK & Emulator / Physical Device
- [VS Code Flutter Extension](https://marketplace.visualstudio.com/items?itemName=Dart-Code.flutter)

### 5.2 Install Dependencies
```bash
cd mobile
flutter pub get
```

### 5.3 Configure API Base URL
Update `lib/core/constants/api_constants.dart` with your machine's local IP or backend URL:
```dart
class ApiConstants {
  // For Android Emulator targeting localhost:
  static const String baseUrl = "http://10.0.2.2:5000/api";
  
  // For Physical Device over WiFi:
  // static const String baseUrl = "http://192.168.1.100:5000/api";
}
```

### 5.4 Run on Device / Emulator
```bash
flutter run
```

### 5.5 Build Release Android APK (For Submission)
```bash
# Build standalone release APK
flutter build apk --release

# The runnable APK will be output at:
# mobile/build/app/outputs/flutter-apk/app-release.apk
```

---

## 6. Automated Testing

```bash
# Run unit & widget tests
flutter test

# Run Flutter static analysis
flutter analyze
```
- **Unit Tests**: Parsing JSON response models, validating request DTO formats.
- **Widget Tests**: Testing button states, quiz timer countdowns, and form input validations.
