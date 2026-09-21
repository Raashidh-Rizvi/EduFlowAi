# EduFlow AI — Flutter Mobile

The Flutter application contains learner-facing screens. The audited implementation is a local setState prototype: operational shared API/auth, rewards and AI coach integration were not established. The whole mobile app is not exclusively one student's responsibility.

## Local commands

Run from the mobile directory using a compatible Flutter/Dart SDK and an emulator or connected device.

~~~powershell
flutter pub get
flutter run
flutter test
~~~

Flutter test configuration exists, but operational test files and a passing suite were not established by the audit. Launching the prototype does not demonstrate the assessed cross-platform workflow.

## Key entry points

- [Application bootstrap](lib/main.dart)
- [Screens](lib/screens/)
- [Main navigation](lib/screens/main_navigation_screen.dart)
- [Core configuration/theme](lib/core/)
- [Dependencies](pubspec.yaml)

Student 1 contributes governed session/notification/status integration; Student 2 contributes academic content/assessment presentation; Student 3 contributes learner transactions/progress/guidance. Network/session/navigation infrastructure is shared.

## Canonical documentation

[Start here](../docs/README.md) · [Responsibility matrix](../docs/responsibilities/RESPONSIBILITY_MATRIX.md) · [Mobile design](../docs/project/13_MOBILE_APPLICATION.md) · [Integration](../docs/project/08_COMPONENT_INTEGRATION.md) · [Run/setup](../docs/project/18_RUN_AND_SETUP.md) · [Status](../docs/project/17_IMPLEMENTATION_STATUS.md)
