# Mobile App Guide (Flutter)

Developer guide for the EduFlow AI student app in `mobile/`.

## Stack

- Flutter / Dart `>=3.0.0 <4.0.0`
- State: `flutter_bloc`
- HTTP: `dio`
- Token storage: `flutter_secure_storage`

## Project layout

| Path | Contents |
|---|---|
| `lib/main.dart` | App entry point |
| `lib/core/` | Theme and constants |
| `lib/services/` | API, auth, course catalog, gamification and student portal services |
| `lib/screens/` | Auth, home, explore, journey, quiz, AI coach, leaderboard, profile and student portal tabs |
| `test/` | Service and widget tests |

## Run locally

Start the backend first (API on port 5204), then from `mobile/`:

```bash
flutter pub get
flutter run
```

## Pointing the app at a backend

The base URL lives in `ApiService.baseUrl` (`lib/services/api_service.dart`). Defaults:

| Target | URL |
|---|---|
| Android emulator | `http://10.0.2.2:5204/api` |
| Web, Windows, iOS simulator | `http://localhost:5204/api` |

Override at build or run time:

```bash
flutter run --dart-define=API_BASE_URL=http://<host>:5204/api
```

For a physical device, use your machine's LAN IP and make sure the backend listens on it.

## Tests and checks

```bash
flutter analyze
flutter test
flutter test --coverage
```

CI runs the same steps in `.github/workflows/mobile.yml` for any change under `mobile/`, then builds the web target as a smoke test.

## Known gaps

- The `android/` and `ios/` platform folders are not committed, so APK/IPA builds are not part of CI yet. Run `flutter create --platforms=android,ios .` inside `mobile/` to generate them.
- `lib/core/constants/api_constants.dart` duplicates the base URL; `ApiService.baseUrl` is the value actually used.
