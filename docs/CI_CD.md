# EduFlow AI – CI/CD Pipeline & DevOps Specification 🚀
> **Automated Continuous Integration & Deployment with GitHub Actions**

---

## 1. CI/CD Architecture Overview

The EduFlow AI repository utilizes a unified GitHub Actions pipeline that triggers on every `push` and `pull_request` targeting the `main` and `develop` branches:

```
[ Developer Push / Pull Request ]
               │
               ▼
   ┌───────────────────────┐
   │ GitHub Actions Runner │
   └───────────┬───────────┘
               │
   ┌───────────┼───────────────────────────┬───────────────────────────┐
   ▼           ▼                           ▼                           ▼
[ Job 1 ]   [ Job 2 ]                   [ Job 3 ]                   [ Job 4 ]
 Backend     React Frontend              Flutter Mobile              Python Agentic AI
 CI Build    CI Build & Lint             Analyze & Test              Evaluate & Test
   │           │                           │                           │
   ├─ Restore  ├─ npm ci                   ├─ flutter pub get          ├─ pip install
   ├─ Build    ├─ npm run lint             ├─ flutter analyze          ├─ pytest tests/
   └─ Test     └─ npm test                 └─ flutter test             └─ schema check
```

---

## 2. Automated Pipeline Jobs

1. **Backend CI (`backend-ci`)**:
   - Sets up .NET 8.0 SDK.
   - Restores NuGet dependencies.
   - Builds all projects (`EduFlow.Api`, `EduFlow.Core`, `EduFlow.Infrastructure`, `EduFlow.Tests`).
   - Executes xUnit unit and integration test suites.

2. **Frontend CI (`frontend-ci`)**:
   - Sets up Node.js 18.
   - Installs clean npm dependencies (`npm ci`).
   - Runs ESLint static analysis.
   - Runs Vitest / Jest unit and component test suites.
   - Verifies production bundle build (`npm run build`).

3. **Flutter CI (`flutter-ci`)**:
   - Sets up Flutter 3.19+ and Java SDK.
   - Runs `flutter pub get`.
   - Executes static analysis (`flutter analyze --no-fatal-infos`).
   - Runs automated Flutter unit and widget tests (`flutter test`).

4. **Agentic AI CI (`ai-agent-ci`)**:
   - Sets up Python 3.11.
   - Installs dependencies from `requirements.txt`.
   - Executes `pytest` covering golden evaluation cases, schema boundary validations, and prompt injection defense rules.

---

## 3. GitHub Actions Workflow Configuration

The active workflow file is stored at [`.github/workflows/ci.yml`](file:///d:/Project/EduHub/.github/workflows/ci.yml).
