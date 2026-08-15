# EduFlow AI – Flutter Mobile Application 📱
> **Student Mobile Learning App built with Flutter 3.x, Dart, and Clean State Management**

---

## 1. Subsystem Overview

The EduFlow AI Mobile App is the interactive student gateway engineered directly around the **Core Engagement Game Loop**. It turns traditional coursework into an exciting RPG-style learning journey with daily missions, animated XP bars, streak counters, interactive quiz runners, live leaderboards, and a conversational **AI Learning Coach**.

### Key Features & Experiences
1. **Interactive Game Loop Home**:
   - Live streak flame indicator with freeze tokens.
   - Level indicator with animated XP progress bar ($X / Y\text{ XP}$).
   - **Today's Mission Card** (e.g., "Complete Python Loops", "Score $\ge 80\%$ on Quiz", "+120 XP").
   - Instant "Continue Learning" action.
2. **Visual Learning Journey Map**: Node-based interactive path showing completed lessons, active missions, and locked boss encounters.
3. **Interactive Quiz & Challenge Runner**: Timed multiple-choice and code snippet challenges with instant feedback animations and sound effects.
4. **Social & Competition Leaderboard**: Live Weekly, Course, and Squad rankings powered by WebSockets.
5. **Student Profile & Showcase**: Customizable avatars, earned badges gallery, streak history, and completion certificates.
6. **Conversational AI Learning Coach**: Tool-augmented chat assistant providing instant hints, targeted remedial mini-challenges, and explanation of mistakes.

---

## 2. Directory Structure

```text
mobile/
├── android/                   # Native Android configuration & Gradle build scripts
├── ios/                       # Native iOS configuration
├── lib/
│   ├── core/                  # Theme tokens, network interceptors, sound fx, utilities
│   │   ├── constants/         # API endpoints, gamification constants, asset paths
│   │   ├── theme/             # Vibrant dark/light gamified theme definitions
│   │   └── utils/             # Sound player, XP calculators, date helpers
│   ├── data/                  # Data layer: Models, API providers, Local storage
│   │   ├── models/            # UserModel, ChallengeModel, QuizModel, BadgeModel, LeaderboardModel
│   │   ├── providers/         # Dio HTTP client with JWT interceptors & SignalR listener
│   │   └── repositories/      # GamificationRepository, QuizRepository, CourseRepository
│   ├── logic/                 # State Management (BLoC / Cubit)
│   │   ├── auth/              # AuthBloc (Login, Register, Token Persistence)
│   │   ├── gamification/      # GamificationBloc (XP, Level, Badges, Streaks, SignalR Events)
│   │   ├── challenge/         # ChallengeBloc (Daily Missions, Boss Battles, Attempts)
│   │   ├── quiz/              # QuizRunnerBloc (Timer, Question state, Submission, Results)
│   │   ├── leaderboard/       # LeaderboardBloc (Weekly & Course Rankings)
│   │   └── ai_coach/          # AiCoachBloc (Chat interactions, challenge recommendations)
│   ├── presentation/          # UI Layer: Widgets & Screens
│   │   ├── widgets/           # XpProgressBar, StreakFlame, BadgeGrid, MissionCard, ConfettiOverlay
│   │   └── screens/           # HomeScreen, JourneyScreen, QuizScreen, LeaderboardScreen, ProfileScreen, CoachScreen
│   └── main.dart              # App bootstrap & Provider / BLoC initialization
├── test/                      # Unit and Widget tests
├── pubspec.yaml               # Flutter dependencies
└── README.md
```

---

## 3. Real-Time Engagement Loop

```text
Student completes Quiz ➔ POST /api/quizzes/attempts/{id}/submit
                                       │
                                       ▼
                       Backend records immutable XP
                                       │
                                       ▼
                       SignalR broadcasts "XpEarned" Event
                                       │
                                       ▼
    Flutter UI triggers +50 XP Floating Toast & Confetti Overlay 🎉
                                       │
                                       ▼
             Leaderboard automatically updates rank position
```

---

## 4. Local Setup & Running

```bash
# Navigate to mobile directory
cd mobile

# Fetch Flutter packages
flutter pub get

# Run on connected device or emulator
flutter run
```
