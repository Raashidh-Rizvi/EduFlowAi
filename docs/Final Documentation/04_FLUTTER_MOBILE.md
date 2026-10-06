# Phase 4 — Flutter Mobile Application Source Verification

> **Audit date:** 2026-10-01  
> **Auditor:** Phase-4 automated source inspection (SE3090 Final Documentation workflow)  
> **Repository root inspected:** `mobile/` (primary), selective `backend/EduFlow.Api/Controllers/` (contract cross-check only)  
> **Method:** Static source analysis only. No `flutter pub get`, no APK build, no runtime execution.  
> **Evidence basis:** Source code wins over all prior documentation.

---

## 1 Scope and Method

All files under `mobile/lib/**`, `mobile/pubspec.yaml`, `mobile/test/**`, and `mobile/README.md` were read in full.  
A targeted set of ASP.NET controller files was grep-scanned for route declarations only, to verify Flutter API contracts.  
The following were **not** inspected: `frontend/**`, `ai-agent/**`, general backend service/repository layers, `docs/legacy/**`.

### Files Fully Read

| File | Purpose |
|------|---------|
| `mobile/pubspec.yaml` | Package name, SDK, dependencies |
| `mobile/lib/main.dart` | App entry point, state bootstrap |
| `mobile/lib/core/constants/api_constants.dart` | API base URL and endpoint stubs |
| `mobile/lib/core/theme/app_theme.dart` | Brand design system |
| `mobile/lib/screens/main_navigation_screen.dart` | Navigation host, gamification local state |
| `mobile/lib/screens/auth/login_screen.dart` | Login + demo fallback |
| `mobile/lib/screens/home/home_screen.dart` | Dashboard display |
| `mobile/lib/screens/journey/journey_screen.dart` | Course/module/topic nodes from API |
| `mobile/lib/screens/quiz/quiz_screen.dart` | Quiz lifecycle, API start, local scoring |
| `mobile/lib/screens/ai_coach/ai_coach_screen.dart` | AI coach chat UI |
| `mobile/lib/screens/leaderboard/leaderboard_screen.dart` | Static hardcoded leaderboard |
| `mobile/lib/screens/profile/profile_screen.dart` | Profile, hardcoded badges |
| `mobile/lib/services/api_service.dart` | Dio client, `FlutterSecureStorage`, token injection |
| `mobile/lib/services/auth_service.dart` | Login/logout against ASP.NET |
| `mobile/lib/services/gamification_service.dart` | Dashboard + leaderboard API calls |
| `mobile/test/widget_test.dart` | Stale scaffold widget test |
| `mobile/test/services/api_service_test.dart` | Dart-only unit tests (no production import) |
| `mobile/test/services/journey_service_test.dart` | Dart-only unit tests (no production import) |
| `mobile/README.md` | Honest project README |

---

## 2 Flutter Technology Stack

| Attribute | Value | Classification |
|-----------|-------|----------------|
| Package name | `eduflow_mobile` | A — VERIFIED IN SOURCE |
| Flutter SDK | Material / Material 3 | A — VERIFIED IN SOURCE |
| Dart SDK constraint | `>=3.0.0 <4.0.0` | A — VERIFIED IN SOURCE |
| App version | `1.0.0+1` | A — VERIFIED IN SOURCE |
| HTTP client | `dio: ^5.4.3+1` | A — VERIFIED IN SOURCE |
| Secure storage | `flutter_secure_storage: ^9.2.2` | A — VERIFIED IN SOURCE |
| State management | `flutter_bloc: ^8.1.5` (declared) | C — PARTIAL (declared in pubspec; **BLoC is not used anywhere in `lib/`**; actual state management is `StatefulWidget` + `setState`) |
| Localisation | `intl: ^0.19.0` | B — PRESENT (declared; no usage found in inspected files) |
| Platform target | Android emulator primary; Windows desktop runner present | A — VERIFIED IN SOURCE |
| Theme | Single dark theme (`AppTheme.darkTheme`, Material 3) | A — VERIFIED IN SOURCE |

> [!WARNING]
> `flutter_bloc ^8.1.5` is declared in `pubspec.yaml` but **no BLoC, Cubit, or `BlocProvider` import appears in any `lib/` file**. All screens use `StatefulWidget` + `setState`. Claiming BLoC architecture in the report would be inaccurate.

---

## 3 Project Structure

```
mobile/
├── pubspec.yaml
├── README.md
├── lib/
│   ├── main.dart                          ← App root, session bootstrap
│   ├── core/
│   │   ├── constants/api_constants.dart  ← Base URL + endpoint stubs (unused at runtime; api_service.dart has live value)
│   │   └── theme/app_theme.dart          ← Brand colours, gradients, ThemeData
│   ├── screens/
│   │   ├── main_navigation_screen.dart   ← BottomNavigationBar host + local gamification state
│   │   ├── auth/login_screen.dart
│   │   ├── home/home_screen.dart
│   │   ├── journey/journey_screen.dart
│   │   ├── quiz/quiz_screen.dart
│   │   ├── ai_coach/ai_coach_screen.dart
│   │   ├── leaderboard/leaderboard_screen.dart
│   │   └── profile/profile_screen.dart
│   └── services/
│       ├── api_service.dart              ← Dio factory, FlutterSecureStorage, token I/O
│       ├── auth_service.dart             ← POST /auth/login, logout (clearSession)
│       └── gamification_service.dart     ← GET /gamification/dashboard/{id}, GET /gamification/leaderboard
├── test/
│   ├── widget_test.dart                  ← Stale scaffold test (references MyApp — does not exist)
│   └── services/
│       ├── api_service_test.dart         ← Pure Dart logic tests; no production imports
│       └── journey_service_test.dart     ← Pure Dart logic tests; no production imports
└── windows/                             ← Windows desktop runner (present, not the target platform)
```

**No `android/` directory was found under `mobile/`.** The project contains a `windows/` runner. Android target files (if any) are not present in the inspected tree. The emulator base URL `10.0.2.2:5204` in source implies Android emulator was the intended runtime target.

---

## 4 Navigation and State Management

### Navigation Model — A (VERIFIED IN SOURCE)

`main.dart` uses a single `MaterialApp` with an inline `home:` property that conditionally renders either `LoginScreen` or `MainNavigationScreen` based on a `_currentUser` field held in `_EduFlowAppState`.

```
EduFlowApp (StatefulWidget)
  └── MaterialApp
        ├── home: LoginScreen (when _currentUser == null)
        └── home: MainNavigationScreen (when _currentUser != null)
              └── BottomNavigationBar (5 tabs)
                    ├── 0 Home       → HomeScreen
                    ├── 1 Journey    → JourneyScreen
                    ├── 2 AI Coach   → AiCoachScreen
                    ├── 3 Ranks      → LeaderboardScreen
                    └── 4 Profile    → ProfileScreen
```

QuizScreen is launched imperatively via `Navigator.push` from `MainNavigationScreen._openQuizOrBoss()`.

**No named routes, no `GoRouter`, no `AutoRoute`.** Navigation is purely index-based (`_currentIndex`) for the bottom bar, plus `MaterialPageRoute` push for quiz.

### State Management — C (PARTIAL)

| Layer | Mechanism | Note |
|-------|-----------|------|
| Auth session | `_EduFlowAppState._currentUser` (in-memory Map) | Persisted between restarts via `FlutterSecureStorage` only at token level; user profile fields are re-passed as a Map, not re-loaded from storage on cold start |
| Gamification (XP, coins, streak, freezes) | `_MainNavigationScreenState._studentProfile` (in-memory Map, hardcoded initial values) | **All mutations are local `setState` calls; no backend write on claim/freeze** |
| Journey nodes | `_JourneyScreenState._nodes` (loaded from API) | API-backed |
| Quiz | `_QuizScreenState` (in-memory per-quiz session) | Partially API-backed (start), scoring is local |
| AI Coach messages | `_AiCoachScreenState._messages` (in-memory List) | No persistence |
| Leaderboard | Hardcoded `const List` in `LeaderboardScreen` | No API call |
| Profile badges | Hardcoded `const List` in `ProfileScreen` | No API call |

**`flutter_bloc` is declared but unused.** Actual state management is `setState` throughout.

---

## 5 Authentication and Session Handling

### Registration — D (DOCUMENTED/PLANNED ONLY)
No registration screen exists in `mobile/lib/screens/`. `AuthController.cs` exposes `POST /api/auth/register` but Flutter has no screen wired to it.

### Login — A (VERIFIED IN SOURCE)

`LoginScreen` calls `AuthService.login()` → `POST /api/auth/login` via Dio.  
On HTTP 200 with a non-null `token`, the token is persisted and the user map is returned.  
`ApiService.saveToken(token)` → `FlutterSecureStorage.write(key: 'auth_token', value: token)` **— this is genuine secure OS-keychain storage, not SharedPreferences.**  
`ApiService.saveUser(user)` stores `user_id`, `user_name`, `user_role` in the same secure store.

### Demo/Offline Fallback — A (VERIFIED IN SOURCE — CRITICAL RISK)

`LoginScreen._handleLogin()` lines 76–89 contain an explicit demo fallback:

> If `AuthService.login()` returns null (backend offline or credentials rejected), the screen checks the email against a hardcoded `_demoStudents` list. If the email matches and the password is `'Password123!'`, it calls `widget.onLoginSuccess` with a **fake token** `'demo-flutter-jwt-token'`.

This means a successful-looking login can occur **with no real backend authentication**. The fallback is documented with the comment `// Demo fallback if backend is offline during local UI test`.

> [!CAUTION]
> The demo fallback bypasses `AuthService` entirely and injects a fake JWT token string into the session. Any demo run using `student@eduflow.ai / Password123!` while the backend is offline will appear to be authenticated but all subsequent API calls will fail silently (Dio error logged only, screens show error/empty states). **This must not be presented as evidence of real token authentication.**

### Logout — A (VERIFIED IN SOURCE)

`ProfileScreen` presents a confirmation dialog. Confirming calls `onLogout()` → `_EduFlowAppState._handleLogout()` → `setState(_currentUser = null)` → `MaterialApp` rebuilds to `LoginScreen`.  
`AuthService.logout()` calls `ApiService.clearSession()` → `FlutterSecureStorage.deleteAll()`. However, **the profile screen calls `onLogout()` directly without calling `AuthService.logout()`**. `FlutterSecureStorage.deleteAll()` is therefore **not called on the logout path in the current source**.

### Token Injection — A (VERIFIED IN SOURCE)

`ApiService.createDio()` adds an `InterceptorsWrapper` that reads `auth_token` from `FlutterSecureStorage` and attaches `Authorization: Bearer <token>` to every outgoing Dio request.

### Token Storage Mechanism — A (VERIFIED IN SOURCE)

`flutter_secure_storage ^9.2.2` — OS keychain on Android (Android Keystore), Keychain on iOS. This is **genuinely secure storage**, not SharedPreferences or plaintext. **Classification: Secure.**

### Protected Screens — C (PARTIAL)

There is no Flutter-side route guard or middleware. Protection depends entirely on backend JWT enforcement. If a fake token (from the demo fallback) is present, the app navigates to all screens — they will show loading/error states when their API calls fail.

### Role Handling — B (PRESENT, RUNTIME UNVERIFIED)

`AuthService.login()` extracts and stores `user['role']` in secure storage. No screen reads this role to conditionally render or restrict content. Role storage is wired; role-based UI branching is not present.

### Expired/Invalid Session Behavior — C (PARTIAL)

Dio's `onError` interceptor logs but does not propagate a 401 to trigger re-login. Screens that call the API catch `DioException` and display error messages but do not navigate back to `LoginScreen`. There is no global 401 interceptor.

---

## 6 API Integration

### Base Configuration

| Attribute | Value |
|-----------|-------|
| Live base URL (used by Dio) | `http://10.0.2.2:5204/api` (in `api_service.dart`) |
| Constants class URL | `http://10.0.2.2:5204/api` (in `api_constants.dart`) — identical value, but `api_constants.dart` is **never imported** by any service; the live value in `ApiService.baseUrl` is what Dio uses |
| Protocol | HTTP (not HTTPS) — acceptable for local emulator development; **not production-safe** |
| Auth header | `Authorization: Bearer <token>` injected via Dio interceptor |
| Timeout | 10 s connect / 10 s receive |

### Service-to-Endpoint Map

| Service / Screen | Flutter HTTP Call | ASP.NET Route (verified) | Request Body / Params | Response Used | Status |
|---|---|---|---|---|---|
| `AuthService.login()` | `POST /auth/login` | `AuthController` → `[HttpPost("login")]` ✅ | `{email, password}` | `token`, user fields | A — VERIFIED IN SOURCE |
| `AuthService.logout()` | `ApiService.clearSession()` (local only — no HTTP call to backend) | `AuthController` → `[HttpPost("logout")]` exists but **not called** | — | — | C — PARTIAL (token cleared locally; server session not invalidated) |
| `JourneyScreen._loadJourneyNodes()` | `GET /students/me/courses` | `CoursesController` → `[HttpGet("/api/students/me/courses")]` ✅ | none | Enrollment list | B — PRESENT, RUNTIME UNVERIFIED |
| `JourneyScreen._loadJourneyNodes()` | `GET /courses/{courseId}/hierarchy` | `CoursesController` → `[HttpGet("{courseId:guid}/hierarchy")]` ✅ | `courseId` path param | Module/topic tree | B — PRESENT, RUNTIME UNVERIFIED |
| `QuizScreen._loadQuiz()` | `POST /quizzes/{quizId}/start` | `QuizzesController` → `[HttpPost("{id:guid}/start")]` ✅ | none | `attemptId`, `timeLimitSeconds`, `questions[]` | B — PRESENT, RUNTIME UNVERIFIED |
| `GamificationService.getDashboard()` | `GET /gamification/dashboard/{studentId}` | `GamificationController` → `[HttpGet("dashboard/{studentId:guid}")]` ✅ | `studentId` path param | Dashboard DTO | B — PRESENT, RUNTIME UNVERIFIED (not called by any screen) |
| `GamificationService.getLeaderboard()` | `GET /gamification/leaderboard?type=weekly&top=20` | `GamificationController` → `[HttpGet("leaderboard")]` ✅ | `type`, `top` query params | List of entries | B — PRESENT, RUNTIME UNVERIFIED (not called by any screen) |

### Direct Flutter → Python Call — NOT FOUND

**NO DIRECT FLUTTER → PYTHON CALL FOUND IN INSPECTED SOURCE.**  
All Flutter Dio calls target `10.0.2.2:5204` (ASP.NET Core only). The Python AI agent (`ai-agent/`) is not called directly from mobile.

---

## 7 Main Screens and Workflows

| Screen | File | Purpose | API/Service Dependency | Persistence | Loading State | Error State | Status |
|--------|------|---------|----------------------|-------------|--------------|-------------|--------|
| LoginScreen | `auth/login_screen.dart` | Email/password login, demo shortcut tiles | `AuthService.login()` → ASP.NET | Token + user via `FlutterSecureStorage` | ✅ `CircularProgressIndicator` on button | ✅ SnackBar on failure | A — VERIFIED (with demo fallback caveat) |
| MainNavigationScreen | `main_navigation_screen.dart` | Bottom nav host; holds local gamification state | None (state only) | In-memory (not persisted between cold starts) | N/A | N/A | A — VERIFIED |
| HomeScreen | `home/home_screen.dart` | XP/level card, streak, daily mission, AI Coach shortcut | None — reads `studentProfile` Map from parent | In-memory | None (StatelessWidget) | None | B — PRESENT (data is hardcoded initial values from parent) |
| JourneyScreen | `journey/journey_screen.dart` | World map of topic/module/boss nodes | `GET /students/me/courses`, `GET /courses/{id}/hierarchy` | None (session-only) | ✅ Spinner + "Loading your journey..." | ✅ Error icon + Retry button | B — PRESENT, RUNTIME UNVERIFIED |
| QuizScreen | `quiz/quiz_screen.dart` | Q&A quiz with timer, question-by-question | `POST /quizzes/{id}/start` for questions | None | ✅ "Loading quiz..." | ✅ Error + Go Back | B — PRESENT (start uses API; scoring is local; no backend submission) |
| AiCoachScreen | `ai_coach/ai_coach_screen.dart` | Chat interface for AI coach | **None — fully scripted local responses** | None (session-only) | None | None | E — AI RESPONSE IS SCRIPTED/LOCAL |
| LeaderboardScreen | `leaderboard/leaderboard_screen.dart` | Weekly sprint podium + rank list | **None — hardcoded const List** | None | None | None | E — HARDCODED MOCK DATA |
| ProfileScreen | `profile/profile_screen.dart` | Name, XP, coins, badge grid, logout | None — reads `studentProfile` Map | None | None | None | B — PRESENT (badges are hardcoded const List; XP/coins from parent local state) |

---

## 8 Course / Journey Experience

**Classification: B — PRESENT IN SOURCE BUT RUNTIME NOT VERIFIED**

`JourneyScreen` is the most technically complete screen:

- On `initState`, calls `GET /students/me/courses` to retrieve the authenticated student's enrollment list.
- Uses the first enrollment's `courseId` to call `GET /courses/{courseId}/hierarchy`.
- Maps the returned module/topic tree into `_nodes` list, distinguishing lesson, challenge, and boss types.
- Displays a scrollable vertical map with connector lines, completion indicators, XP rewards.
- Tapping a node calls `MainNavigationScreen._openQuizOrBoss()` which navigates to `QuizScreen`.

**Verified gaps:**
- Backend route `GET /students/me/courses` exists in `CoursesController.cs` line 1632 ✅
- Backend route `GET /courses/{courseId:guid}/hierarchy` exists in `CoursesController.cs` line 1928 ✅
- **Enrollment** (enrolling in a course from Flutter) has no mobile screen — `POST /courses/{id}/enroll` exists in the backend but is not called from mobile.
- **Lesson completion** is computed client-side from `contentItems[].isCompleted` fields returned by hierarchy — no separate Flutter → backend completion POST is made.
- Progress is not persisted in Flutter local storage; refreshing the Journey screen re-fetches from API.

---

## 9 Quiz Experience

**Classification: B — PRESENT IN SOURCE, PARTIAL BACKEND INTEGRATION**

### What the API Does

`QuizScreen._loadQuiz()` calls `POST /quizzes/{quizId}/start` (confirmed in `QuizzesController.cs` line 1439).  
The backend creates an attempt (`AttemptId: Guid.NewGuid()`) and returns:
- `attemptId`
- `timeLimitSeconds`
- `questions[]` (each with `questionId`, `prompt`, `options`, `type`, `points`, `explanation`)

### What Is Local-Only

| Operation | Handling |
|-----------|---------|
| Answer selection | In-memory `_selectedOptionIndex` |
| Correct/incorrect determination | **Hardcoded assumption: index 0 is always correct** (`_handleSubmitAnswer` line 143: `final isCorrect = _selectedOptionIndex == 0`) |
| Score calculation | `_correctAnswersCount / _questions.length * 100` — local |
| XP/coin award | Hardcoded: pass (≥70%) → +80 XP, +30 coins; fail → +20 XP, +5 coins |
| Quiz attempt submission | **No `POST /quizzes/{id}/submit` or equivalent is called from Flutter** |
| Result persistence | None — XP/coins update only local `_studentProfile` in parent state |
| History/retry | Not implemented |

> [!IMPORTANT]
> Quiz results **are not submitted to the backend**. The `attemptId` received from `POST /start` is stored in `_attemptId` but never used in a subsequent API call. Score, XP, and coins are computed and applied entirely in Flutter local state. There is **no backend persistence of quiz attempts or scores from the mobile client**.

> [!CAUTION]
> The correct-answer detection uses `_selectedOptionIndex == 0` (line 143). This assumes the backend always puts the correct answer first in the options list. This is a fragile hardcoded assumption — if the backend randomizes option order, all answer validation will produce wrong results.

---

## 10 Gamification / Progress

### XP, Coins, Streak, Freeze Tokens — C (PARTIAL)

All gamification display values originate from a hardcoded Map in `MainNavigationScreen.initState()`:

```dart
_studentProfile = {
  'totalXp': 1250,
  'currentLevel': 2,
  'levelName': 'Code Apprentice',
  'xpProgressInLevel': 750,
  'xpRequiredForNext': 1000,
  'coins': 180,
  'currentStreak': 5,
  'freezeTokens': 2,
  'isMissionClaimed': false,
};
```

These are **fixed initial values — not loaded from `GamificationService.getDashboard()`**. The `getDashboard()` method exists and makes a real HTTP call to `GET /gamification/dashboard/{studentId}`, but **no screen calls it**. Values are updated only via local `setState`.

| Action | What happens |
|--------|-------------|
| Claim Daily Mission | Local: +100 XP, +40 coins, `isMissionClaimed = true` — **no backend call** |
| Use Streak Freeze | Local: `freezeTokens -= 1` — **no backend call** |
| Complete Quiz | Local: `totalXp += earnedXp`, `coins += earnedCoins` — **no backend call** |

### Badges — E (HARDCODED MOCK DATA)

`ProfileScreen._badges` is a hardcoded `const List<Map<String, dynamic>>` with fixed `unlocked` booleans. No backend call for badge data.

### Leaderboard — E (HARDCODED MOCK DATA)

`LeaderboardScreen._rankings` is a `const List` with 6 fictional users (Maya Patel, Alex Rivera, Chen Wei, etc.). `GamificationService.getLeaderboard()` exists and has a real API call but **is not called from `LeaderboardScreen`**. The screen renders purely from the hardcoded list.

---

## 11 AI Coach / Learning Integration

**Classification: E — NOT REAL AI — FULLY SCRIPTED LOCAL RESPONSES**

`AiCoachScreen._sendMessage()` does the following:
1. Appends the user message to `_messages`.
2. Waits 700 ms (`Future.delayed`).
3. Runs a series of `text.toLowerCase().contains(...)` checks against keyword patterns.
4. Returns one of four hardcoded string responses based on the first keyword match.

```
"index"   → hardcoded PostgreSQL index explanation
"acid"/"ef" → hardcoded EF Core transaction explanation
"challenge"/"practice" → hardcoded "quest" announcement
anything else → hardcoded Module 1.2 recommendation
```

**No HTTP call is made.** `ApiService.createDio()` is not used. No ASP.NET AI endpoint is contacted. No Python agent is contacted.

The 700 ms delay simulates network latency for demonstration purposes only.

**There is no:**
- User identity sent to the AI
- Conversation history sent to any backend
- Source grounding or citations
- Real RAG or LLM response
- Loading spinner (delay is hidden)
- Error state

> [!CAUTION]
> Any claim that the Flutter AI Coach performs real AI inference, calls the Python RAG agent, or has any backend integration is **unsupported by source**. This is a scripted keyword-matching chatbot UI.

---

## 12 Device Feature

### Search Result

| Feature | Package/API | User Workflow | Implemented? | Runtime Verification Required? |
|---------|------------|---------------|-------------|-------------------------------|
| Camera | None | — | NO | — |
| GPS/Location | None | — | NO | — |
| QR Code | None | — | NO | — |
| File Picker/Upload | None | — | NO | — |
| Push Notifications | None | — | NO | — |
| Date/Time (system clock) | `dart:async` Timer | Quiz countdown timer using `Timer.periodic` | YES — code verified | YES (requires running quiz with timed quiz data) |
| Other device APIs | None | — | NO | — |

### Assessment

**The quiz countdown timer** (`QuizScreen._startTimer()`, `dart:async`, `Timer.periodic`) is the only device/mobile feature found. It uses the system clock to decrement `_remainingSeconds` every second and visually alerts the student when time is low.

While functional as a feature, a **countdown timer using `dart:async`** is a borderline qualification as a "meaningful device feature." It does not access any device sensor, hardware peripheral, or OS-level service beyond the standard timer API.

> [!NOTE]
> No camera, GPS, QR, push notification, or file-system access feature was found in any inspected source file. The assignment requirement for "at least one meaningful device feature" is marginally satisfied by the quiz timer at best. This should be noted honestly in the final report and presentation.

---

## 13 Forms, Loading, Empty and Error States

### Forms and Validation

| Form | Location | Fields | Validation |
|------|---------|--------|------------|
| Login | `LoginScreen` | Email (TextField), Password (TextField, obscured) | Basic non-empty check only — no regex, no form key, no `Form`/`FormField` widget |

No registration form, no profile edit form, no search/filter form is present.

### Loading States

| Screen | Loading Indicator | Notes |
|--------|------------------|-------|
| LoginScreen | `CircularProgressIndicator` on button (replaces button label) | ✅ |
| JourneyScreen | `CircularProgressIndicator` + "Loading your journey..." text | ✅ |
| QuizScreen (start) | `CircularProgressIndicator` + "Loading quiz..." text | ✅ |

### Empty States

| Screen | Empty State |
|--------|------------|
| JourneyScreen | "No course content found. Enroll in a course to start your journey!" | ✅ |

### Error States

| Screen | Error UI |
|--------|---------|
| JourneyScreen | Error icon + message + Retry button | ✅ |
| QuizScreen | Error icon + message + Go Back button | ✅ |

### Reusable Widgets

No separate `widgets/` directory exists. Repeated UI patterns (gradient cards, stat chips, node items) are **inlined as anonymous `Container`/`Column`/`Row` subtrees** within each screen's `build()` method. No extracted reusable widget classes were found.

### Responsive/Adaptive Behavior

- `SingleChildScrollView` used on Login, Home, Profile, Leaderboard — prevents overflow on small screens.
- `MediaQuery.of(context).size.width * 0.8` used in `AiCoachScreen` for message bubble max-width — a single responsive sizing call.
- `SafeArea` used in `LoginScreen`.
- No `LayoutBuilder`, no orientation detection, no `MediaQuery` breakpoints for tablet/landscape layouts.
- No accessibility `Semantics` widgets. No `Tooltip` on interactive elements (exception: logout icon has `tooltip: 'Sign Out'`).

---

## 14 Security Boundary

| Aspect | Finding | Classification |
|--------|---------|----------------|
| Token storage | `flutter_secure_storage` — Android Keystore / iOS Keychain | A — SECURE (source verified) |
| Token transmission | `Authorization: Bearer <token>` via Dio interceptor on every request | A — VERIFIED |
| Transport | HTTP (not HTTPS) to `10.0.2.2:5204` | C — PARTIAL (acceptable for local dev; not production-safe) |
| Demo fallback token | Fake string `'demo-flutter-jwt-token'` accepted by Flutter session logic | D — SECURITY RISK for demo/eval context |
| Logout token clearing | `FlutterSecureStorage.deleteAll()` exists in `AuthService.logout()` but is **not called** from the UI logout path | C — PARTIAL (in-memory state is cleared; secure storage is not cleared on logout) |
| Role-based UI guard | Not implemented | D — Role stored, not enforced in UI |
| 401 auto-redirect | Not implemented | D |

---

## 15 Flutter / Backend Contract Findings

### Confirmed Compatible Routes

| Flutter Call | Backend Route | Match |
|---|---|---|
| `POST /auth/login` | `AuthController [HttpPost("login")]` | ✅ MATCH |
| `GET /students/me/courses` | `CoursesController [HttpGet("/api/students/me/courses")]` | ✅ MATCH |
| `GET /courses/{courseId}/hierarchy` | `CoursesController [HttpGet("{courseId:guid}/hierarchy")]` | ✅ MATCH (Flutter sends string ID; backend expects GUID — must be valid UUID string at runtime) |
| `POST /quizzes/{quizId}/start` | `QuizzesController [HttpPost("{id:guid}/start")]` | ✅ MATCH (same GUID caveat) |
| `GET /gamification/dashboard/{studentId}` | `GamificationController [HttpGet("dashboard/{studentId:guid}")]` | ✅ MATCH (service not called by any screen) |
| `GET /gamification/leaderboard?type=...&top=...` | `GamificationController [HttpGet("leaderboard")]` | ✅ MATCH (service not called by any screen) |

### Contract Mismatches and Gaps

| Issue | Detail | Severity |
|-------|--------|---------|
| **Quiz answer submission missing** | `QuizScreen` never calls `POST /quizzes/{id}/submit` or any attempt-completion endpoint. `_attemptId` is stored but unused. | **HIGH** |
| **Gamification dashboard not loaded** | `GamificationService.getDashboard()` exists but no screen calls it on login or navigation. All gamification values are hardcoded. | **HIGH** |
| **Leaderboard service not connected** | `GamificationService.getLeaderboard()` exists but `LeaderboardScreen` uses a hardcoded list. | **HIGH** |
| **Logout does not clear secure storage** | `ProfileScreen` calls `onLogout()` (in-memory only); `AuthService.logout()` / `clearSession()` is never called from the UI. | **MEDIUM** |
| **`api_constants.dart` is unused** | `ApiConstants` class is never imported. The live base URL is a duplicate literal in `api_service.dart`. | **LOW** |
| **Correct-answer detection fragile** | `isCorrect = _selectedOptionIndex == 0` assumes correct option is always first — valid only if backend contracts this. | **MEDIUM** |
| **`quizId` type mismatch risk** | `JourneyScreen` passes topic `id` (which could be any type from the API) to `QuizScreen` as `quizId`. `QuizScreen` formerly accepted `Map<String, dynamic> quizData` (old call in `MainNavigationScreen` line 91 shows `quizData: node`). The current `QuizScreen` constructor requires a `String quizId` — this means the call in `MainNavigationScreen._openQuizOrBoss` would fail to compile as written (passes `quizData: node`). **This is a compilation error.** | **CRITICAL** |

> [!CAUTION]
> **Critical compilation issue found:** `MainNavigationScreen._openQuizOrBoss()` (line 91) calls `QuizScreen(quizData: node, ...)` passing a `Map<String,dynamic>`. However `QuizScreen`'s constructor (as currently defined in `quiz_screen.dart` lines 8-17) requires `String quizId`, not `Map quizData`. **These signatures do not match.** This means the quiz cannot be launched from the Journey screen in the current source as written, without either the `MainNavigationScreen` or `QuizScreen` being out of sync.

---

## 16 Test Source Inventory

| Test File | Test Type | Production Code Imported? | What It Actually Tests | What It Cannot Prove | Execution Status |
|-----------|-----------|--------------------------|----------------------|---------------------|-----------------|
| `test/widget_test.dart` | Widget test (Flutter) | **Stale: imports `package:mobile/main.dart` and references `MyApp` class — `MyApp` does not exist; `main.dart` exports `EduFlowApp`** | Nothing useful — would fail on `MyApp` symbol resolution | Nothing | TEST SOURCE EXISTS / NOT EXECUTED / WOULD FAIL |
| `test/services/api_service_test.dart` | Pure Dart unit tests | **No production imports** — all assertions operate on inline literal values | String format checks (URL format, email regex), Dart collection logic, map key existence | Any actual `ApiService` behavior, network, `FlutterSecureStorage`, Dio | TEST SOURCE EXISTS / NOT EXECUTED |
| `test/services/journey_service_test.dart` | Pure Dart unit tests | **No production imports** — copies `JourneyScreen` transformation logic inline | Node-building logic, timer formatting, quiz scoring formulas | Any `JourneyScreen` behavior, any Dio HTTP call, any state management | TEST SOURCE EXISTS / NOT EXECUTED |

### Summary

- 0 out of 3 test files import actual production classes.
- 0 out of 3 test files can detect regressions in production code.
- `widget_test.dart` references a non-existent `MyApp` class — this is a stale scaffold from `flutter create` that was never updated.
- `api_service_test.dart` and `journey_service_test.dart` contain meaningful logic coverage (scoring, node transformation, URL validation) but are disconnected from the production implementations they document.

> [!NOTE]
> Phase 6 identified three test files and a possible stale package import — this is confirmed. The stale import is `MyApp` in `widget_test.dart`. The package import `package:mobile/main.dart` is technically valid (package name is `eduflow_mobile`... wait — package name in pubspec.yaml is `eduflow_mobile` but the import says `package:mobile/main.dart`). This is an additional import mismatch — the package name is `eduflow_mobile`, so the correct import would be `package:eduflow_mobile/main.dart`. **The widget test has two errors: wrong package name in import, and wrong class name `MyApp`.**

---

## 17 Assignment Requirement Mapping

| Requirement | Source Evidence | Classification | Gap | Later Evidence Needed |
|---|---|---|---|---|
| Reusable widgets | No extracted widget classes found; all UI is inlined | C — PARTIAL | No `widgets/` directory; repeated patterns not extracted | None (gap is architectural) |
| Navigation | `BottomNavigationBar` + `Navigator.push` for quiz | A — VERIFIED | No deep linking, no named routes | None |
| State management | `StatefulWidget` + `setState` throughout; `flutter_bloc` declared but unused | C — PARTIAL | BLoC declared but not used — mismatch between pubspec and source | None |
| Registration/login | Login: A. Registration: D (no screen) | C — PARTIAL | No registration screen | — |
| Logout | Logout dialog → in-memory clear ✅; `FlutterSecureStorage.deleteAll()` not called | C — PARTIAL | SecureStorage not cleared | Fix required |
| Token storage | `flutter_secure_storage` — genuinely secure | A — VERIFIED | None | Screenshot of secure storage write flow |
| Protected screens | No Flutter-side guard; reliant on backend JWT | C — PARTIAL | No 401 auto-redirect | — |
| Forms/validation | Login form only; basic non-empty check | C — PARTIAL | No Form widget, no FormField, no rich validation | — |
| Search/filter | Not present | E — NOT FOUND | No search screen | — |
| Transactions/status/history | Not present | E — NOT FOUND | No transaction or attempt history screen | — |
| Responsive UI | Basic (`SafeArea`, `SingleChildScrollView`, one `MediaQuery` call) | C — PARTIAL | No breakpoints, no orientation handling | — |
| Loading states | Present on Login, Journey, Quiz | A — VERIFIED (for these screens) | Home, Leaderboard, Profile have no loading states | — |
| Empty states | Journey screen only | B — PRESENT | Other screens lack empty states | — |
| Error states | Journey and Quiz | B — PRESENT | Home, Leaderboard, Profile lack error states | — |
| AI task/recommendation/status | Scripted keyword chatbot only | E — NOT REAL | No backend call | — |
| Meaningful device feature | Quiz countdown timer (`dart:async`) | C — PARTIAL (borderline) | No sensor/hardware access | Requires live quiz run |
| Shared ASP.NET API | Login, Journey, Quiz start — routes match | B — PRESENT, RUNTIME UNVERIFIED | Quiz submission, gamification, leaderboard not connected | Backend running + emulator session |
| Shared identity/business rules | JWT token stored; used in Dio interceptor | B — PRESENT, RUNTIME UNVERIFIED | Role-based rules not enforced in mobile | — |
| Cross-platform workflow | Journey course data from ASP.NET also drives React web | B — PRESENT, RUNTIME UNVERIFIED | End-to-end not tested | Concurrent web + mobile session |

---

## 18 Confirmed Strengths

1. **Genuine secure token storage** — `flutter_secure_storage` (Android Keystore backed) is a real, appropriate security choice, not SharedPreferences.
2. **Dio JWT interceptor** — Every API call automatically carries the Bearer token; no per-call manual header.
3. **Journey screen API integration** — Two chained real HTTP calls (`/students/me/courses` → `/courses/{id}/hierarchy`) that map to verified backend routes.
4. **Quiz start via API** — `POST /quizzes/{id}/start` returns questions from the real database.
5. **GamificationService architecture** — `getDashboard()` and `getLeaderboard()` methods are correctly structured against actual backend routes, even though they are not called by screens yet.
6. **Loading + error + empty states** on Journey and Quiz screens.
7. **Logout confirmation dialog** — UX pattern is correct.
8. **Dark theme design system** — `AppTheme` with consistent brand colours, gradients, Material 3 — polished visual identity.
9. **Pure Dart logic tests** (`api_service_test.dart`, `journey_service_test.dart`) cover scoring formulas, node transformation logic, and timer formatting meaningfully even without production wiring.
10. **Graceful API failure handling** in Journey and Quiz — errors shown with retry options, not crashes.

---

## 19 Gaps / Partial / Unverified Areas

| Area | Finding | Severity |
|------|---------|---------|
| Quiz answer submission | No backend submission; scoring is local and hardcoded | HIGH |
| Gamification not loaded from API | Hardcoded initial values; `getDashboard()` never called | HIGH |
| Leaderboard is fully mocked | Hardcoded 6-person list; `getLeaderboard()` never called | HIGH |
| AI Coach is scripted | Keyword-matching with 700 ms fake delay; no HTTP call | HIGH |
| `MainNavigationScreen` → `QuizScreen` constructor mismatch | `quizData: node` vs `required String quizId` — likely a compilation error | CRITICAL |
| `widget_test.dart` stale | Wrong package name + wrong class name → would fail compilation | HIGH |
| SecureStorage not cleared on logout | `clearSession()` exists but UI does not call it | MEDIUM |
| No registration screen | Only login; `POST /auth/register` backend route exists unused from mobile | MEDIUM |
| BLoC declared but unused | `flutter_bloc` in pubspec, zero usage in source | LOW |
| `api_constants.dart` unreferenced | Duplicate URL stub never imported | LOW |
| No device hardware feature | Timer-only; no camera, GPS, QR, push notifications | MEDIUM |
| No reusable widget extraction | All UI inlined | LOW |
| No search/filter | No search functionality | MEDIUM |
| No role-based UI | Role stored, never used to branch UI | LOW |
| HTTP not HTTPS | Local dev configuration not production-safe | LOW (for demo) |

---

## 20 Screenshot Plan

The following 6 captures are recommended. Each is achievable only with a running Android emulator and live backend.

| Priority | Screen | What to Show | Claim it Supports | API/Persistence Proof Needed? |
|----------|--------|-------------|-------------------|-------------------------------|
| 1 | **Login screen** | Email/password fields, demo tiles, "Enter Learning Arena" button, loading state during login | Real JWT login flow | YES — show real token in FlutterSecureStorage (Android Studio Device File Explorer or debug print) |
| 2 | **Home screen** | Level card with XP bar, streak flame, daily mission card | Gamification UI polish | Partial — values are hardcoded initial state |
| 3 | **Journey screen (loaded)** | List of topic/boss nodes with statuses, XP rewards, module headers | API-driven course content | YES — must show nodes populated from backend `/courses/{id}/hierarchy` response |
| 4 | **Quiz in progress** | Question card, option tiles, countdown timer, progress bar | Quiz start API + timer device feature | YES — show quiz loaded from `POST /quizzes/{id}/start` |
| 5 | **Quiz result screen** | Score %, XP earned badge | Quiz completion | Partial — result is local; note backend submission not yet wired |
| 6 | **Profile screen** | Name, XP, coins, badge grid | Badge display + logout confirmation | Partial — badges are hardcoded |

> [!NOTE]
> **Do not screenshot the Leaderboard or AI Coach screens as evidence of backend integration** — both are entirely local/mock at this time.

---

## 21 Final-Report Evidence Inputs

### G3 — Integrated Architecture

- Flutter mobile consumes the **same ASP.NET Core API** as the React web frontend.
- Shared routes confirmed: `POST /auth/login`, `GET /students/me/courses`, `GET /courses/{courseId}/hierarchy`, `POST /quizzes/{id}/start`, `GET /gamification/dashboard/{studentId}`, `GET /gamification/leaderboard`.
- Token issued by `AuthController` is the same JWT used across both clients.
- **Safe claim:** "The mobile client shares authentication tokens and course data endpoints with the web frontend via a unified ASP.NET Core API."
- **Unsafe claim:** "The mobile client provides a complete real-time gamified experience backed by the API" — gamification, leaderboard, AI Coach, and quiz submission are not API-backed in current source.

### G5 — Flutter Technical Report

Safe inputs:
- **Package:** `eduflow_mobile`, Dart SDK `>=3.0.0`, Flutter with Material 3 dark theme.
- **HTTP:** Dio 5.4.3 with `InterceptorsWrapper` for auto JWT injection.
- **Secure storage:** `flutter_secure_storage ^9.2.2` — OS keychain backed, keys: `auth_token`, `user_id`, `user_name`, `user_role`.
- **State:** `StatefulWidget` + `setState` (not BLoC despite pubspec declaration).
- **Navigation:** 5-tab `BottomNavigationBar` + imperative `Navigator.push` for quiz.
- **API-integrated screens:** Login, Journey (course map), Quiz (start).
- **Local-only screens:** Home (hardcoded profile data), Leaderboard (mock list), AI Coach (scripted), Profile (hardcoded badges).
- **Known technical debt:** Quiz answer submission not implemented; gamification not loaded from API; constructor mismatch may prevent compilation of quiz launch from Journey.

### G7 — Flutter Testing

Safe inputs:
- 3 test files exist under `mobile/test/`.
- `widget_test.dart` is a stale `flutter create` scaffold — imports non-existent `MyApp` class with wrong package name (`package:mobile/` vs actual `package:eduflow_mobile/`) — **would not compile**.
- `test/services/api_service_test.dart` and `test/services/journey_service_test.dart` contain **25+ pure Dart unit tests** covering URL format validation, email regex, quiz scoring formulas, node transformation logic, and timer formatting.
- These tests import no production classes — they copy logic inline and verify it in isolation.
- **No test has been executed. No passing status can be claimed.**
- **Classification: TEST SOURCE EXISTS / NOT EXECUTED.**

### G10 — APK / Deployment Limitations

- No `android/` directory found in `mobile/`. Android platform files not present in inspected tree.
- `windows/` runner is present (non-target platform).
- `flutter pub get` has not been run; `pubspec.lock` exists (indicates prior `pub get`).
- `flutter_secure_storage ^9.2.2` requires Android Keystore support — minimum Android API level 23.
- Base URL `http://10.0.2.2:5204` is Android emulator localhost only — not deployable as-is to physical device or production.
- **Safe claim:** "An APK was not built or distributed. Source code and `pubspec.lock` demonstrate the intended configuration. Runtime testing requires an Android emulator with the ASP.NET backend running locally."

### G12 — Mobile Security

Safe inputs:
- JWT token stored in `flutter_secure_storage` (Android Keystore / iOS Keychain) — not SharedPreferences, not plaintext file.
- JWT auto-injected via Dio `InterceptorsWrapper` — no manual per-call header.
- `FlutterSecureStorage.deleteAll()` clears all keys on session clear — **but this is not called from the current logout UI path**.
- Transport uses HTTP (not HTTPS) — acceptable for emulator development, not production.
- No hardcoded production secrets found in source.
- Demo fallback injects `'demo-flutter-jwt-token'` — this fake token is stored in `FlutterSecureStorage` if the demo path is taken; it does not grant any real backend access but represents a developer convenience that should be removed before production.

### G13 — Contribution Placeholders

**Atheek** (documented responsibility: student experience, participation, progress, gamification, mobile):
- Flutter mobile application source resides under `mobile/` and addresses student experience screens: Login, Home, Journey, Quiz, AI Coach, Leaderboard, Profile.
- Gamification service (`gamification_service.dart`) and API service (`api_service.dart`) address the student participation and progress tracking responsibility.
- Journey screen API integration and quiz timer are the most complete mobile-specific implementations.
- Git attribution analysis is deferred to Phase 7.

**Wazni, Raashidh** — no Flutter-specific source was found that maps to their documented responsibilities (backend/infrastructure). Flutter-relevant backend routes (auth, courses, quiz, gamification) were authored in the shared ASP.NET layer which falls under their domain. Cross-platform contract verification (Phase 4 §15) is the relevant evidence. Git attribution deferred to Phase 7.

---

*Phase 4 source audit complete. Output: `docs/Final Documentation/04_FLUTTER_MOBILE.md`*
