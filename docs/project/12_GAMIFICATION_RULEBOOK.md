# EduFlow AI – Gamification Rulebook

> **Canonical design/reference document.** Read [Start here](../README.md) and the [responsibility matrix](../responsibilities/RESPONSIBILITY_MATRIX.md). Use [implementation status](17_IMPLEMENTATION_STATUS.md) and current source/evidence to distinguish implemented behavior from targets. Examples and proposed routes are not certified runtime results.

> **Reconciliation note:** This is a design rulebook, not a verified inventory of enforced rules. The [current matrix](../responsibilities/RESPONSIBILITY_MATRIX.md) assigns learner rewards/progress to Student 3, grading contracts to Student 2 and platform policy governance to Student 1. The audit found a fixed-tier LevelCurve, incomplete reward idempotency/concurrency, ungraded challenge rewards and DOCUMENTED ONLY Redis/SignalR; the formulas, limits and delivery targets below must not be treated as completed implementation.

> This document defines the complete, deterministic rules governing all gamification mechanics: XP, levels, badges, streaks, challenges, and leaderboards. These rules are enforced by the backend — AI can recommend but cannot override them.

---

## 1. Guiding Principle

```
Gamification must serve learning — not replace it.

Reward:    completing lessons, passing quizzes, improving mastery
Don't reward: opening the app, clicking aimlessly, retrying only to farm XP
```

**The test**: If a student can earn significant XP without actually learning anything, the gamification is broken.

---

## 2. XP Rules

### 2.1 Base XP Values

| Event | Base XP | Notes |
|-------|---------|-------|
| `LESSON_COMPLETED` | 20 XP | Once per lesson |
| `QUIZ_COMPLETED` | 10 XP | For attempting (pass or fail) |
| `QUIZ_PASSED` | 20 XP | Additional when pass_percentage met |
| `PERFECT_SCORE` | 50 XP | 100% on any quiz |
| `DAILY_CHALLENGE` | 40 XP | One daily challenge per day |
| `WEEKLY_CHALLENGE` | 100 XP | One weekly challenge per week |
| `BOSS_BATTLE` | 150 XP | Chapter-end challenge (max XP) |
| `COURSE_COMPLETED` | 300 XP | Full course completion |
| `STREAK_7_DAY` | 70 XP | Bonus on 7th consecutive day |
| `STREAK_30_DAY` | 300 XP | Bonus on 30th consecutive day |
| `STREAK_100_DAY` | 1,000 XP | Bonus on 100th consecutive day |
| `PRACTICE_CHALLENGE` | 30 XP | AI-recommended remedial practice |

### 2.2 Difficulty Multipliers

```text
BEGINNER   ×1.0   (no multiplier)
EASY       ×1.2
MEDIUM     ×1.5
HARD       ×2.0
EXPERT     ×2.5
```

**Formula:**
```
effective_xp = floor(base_xp × difficulty_multiplier)
final_xp     = min(effective_xp, source_max_xp_cap)
```

### 2.3 XP Caps

| Cap Type | Value | Purpose |
|----------|-------|---------|
| Per quiz | 150 XP | Prevent single quiz farm |
| Per challenge | 150 XP | Standard challenge cap |
| Boss battle | 300 XP | Higher reward for hard challenge |
| Per lesson daily | 200 XP | Cap lesson XP per day |
| Admin grant | 500 XP max | Limit manual adjustments |

### 2.4 XP Anti-Farming Rules

```text
Rule 1:  Same lesson can only award XP ONCE per student (idempotent)
Rule 2:  Same quiz can award full XP only on FIRST passing attempt
         → Retry attempts award only 50% XP (practice incentive)
         → 3rd+ retry → 0 XP (no farming)
Rule 3:  Daily lesson XP cap: 200 XP from lessons per day
Rule 4:  Client-submitted XP values are ALWAYS IGNORED by backend
Rule 5:  AI-suggested XP values are capped by backend rules
Rule 6:  Weekly leaderboard XP is recalculated from xp_transactions — never client-reported
```

---

## 3. Level System

### 3.1 Level Thresholds

```text
Formula: XP_required(level) = round(100 × level^1.5)

Level  1 → cumulative      100 XP  (Title: Seedling 🌱)
Level  2 → cumulative      283 XP
Level  3 → cumulative      520 XP
Level  4 → cumulative      800 XP
Level  5 → cumulative    1,118 XP  (Title: Scholar 📚)
Level  7 → cumulative    1,852 XP
Level 10 → cumulative    3,162 XP  (Title: Apprentice ⚡)
Level 13 → cumulative    4,688 XP
Level 18 → cumulative    7,637 XP  (Title: Expert 🎯)
Level 20 → cumulative    8,944 XP
Level 25 → cumulative   12,500 XP  (Title: Master 🏆)
Level 30 → cumulative   16,431 XP  (Title: Grandmaster 👑)
```

### 3.2 Level Tiers & Unlocks

| Level Range | Tier | Unlocks |
|------------|------|---------|
| 1–3 | 🌱 Seedling | Basic avatar frames |
| 4–7 | 📚 Scholar | Additional study themes |
| 8–12 | ⚡ Apprentice | Access to HARD difficulty challenges |
| 13–18 | 🎯 Expert | Boss battle access |
| 19–25 | 🏆 Master | Special leaderboard tier |
| 26–30 | 👑 Grandmaster | Elite badge + course completion certificate with tier label |

### 3.3 Level Up Process

```text
1. Backend detects total_xp ≥ threshold for (current_level + 1)
2. Backend increments current_level (using optimistic lock to prevent double increment)
3. Emits LevelUp domain event
4. SignalR broadcasts to student's mobile app:
   → Full-screen celebration animation
   → "Level 5 — Scholar! 🎉"
   → New avatar frame revealed
5. Badge engine re-evaluated (level-milestone badges)
6. Analytics records progression milestone
```

---

## 4. Badge Rules

### 4.1 Badge Evaluation Trigger

Badges are evaluated **every time a domain event fires**. The engine is:
- **Server-side only** — clients cannot award badges
- **Idempotent** — a badge can only be awarded once per student
- **Deterministic** — same input always produces same output

### 4.2 Full Badge Catalogue

| Code | Name | Category | Rarity | Trigger Condition |
|------|------|----------|--------|------------------|
| `FIRST_LESSON` | First Step | Learning | Common | Complete 1st lesson |
| `FIRST_QUIZ` | Quiz Taker | Learning | Common | Submit 1st quiz |
| `PERFECT_SCORE` | Perfectionist | Learning | Rare | Score 100% on any quiz |
| `QUIZ_MASTER` | Quiz Master | Learning | Rare | Pass 10 quizzes total |
| `QUIZ_LEGEND` | Quiz Legend | Learning | Epic | Pass 50 quizzes total |
| `SPEED_DEMON` | Speed Demon | Learning | Rare | Submit quiz in < 30% of time limit |
| `THREE_DAY_STREAK` | On a Roll | Streak | Common | 3 consecutive days |
| `SEVEN_DAY_STREAK` | Week Warrior | Streak | Rare | 7 consecutive days |
| `THIRTY_DAY_STREAK` | Unstoppable | Streak | Epic | 30 consecutive days |
| `HUNDRED_DAY_STREAK` | Legend | Streak | Legendary | 100 consecutive days |
| `COMEBACK_KID` | Comeback | Streak | Rare | Re-achieve 7-day streak after losing one |
| `DAILY_CHAMPION` | Daily Champion | Challenge | Common | Complete 5 daily challenges |
| `CHALLENGE_MASTER` | Challenge Accepted | Challenge | Rare | Complete 10 challenges |
| `BOSS_SLAYER` | Boss Slayer | Challenge | Epic | Win a boss battle challenge |
| `COURSE_COMPLETE` | Graduate | Milestone | Epic | Complete a full course |
| `TOP_TEN_WEEKLY` | Top 10 | Competition | Rare | Reach top 10 weekly leaderboard |
| `TOP_THREE_WEEKLY` | Podium Finish | Competition | Epic | Reach top 3 weekly leaderboard |
| `CHAMPION_WEEKLY` | Weekly Champion | Competition | Legendary | Reach rank 1 weekly leaderboard |
| `LEVEL_5` | Scholar | Milestone | Common | Reach Level 5 |
| `LEVEL_10` | Apprentice | Milestone | Rare | Reach Level 10 |
| `LEVEL_20` | Master Learner | Milestone | Epic | Reach Level 20 |

### 4.3 Badge Award Rules

```text
✓ Each badge is awarded at most ONCE per student (PRIMARY KEY enforcement)
✓ Badge check happens AFTER XP is awarded (not before)
✓ All badge checks are run in a single evaluation pass per event
✓ Rejected badges are not stored (only awarded badges are in user_badges)
✓ Badge award order: badges awarded in evaluation order (deterministic)
```

---

## 5. Streak Rules

### 5.1 Qualifying Activities

The following count as a streak-qualifying activity:

```text
✓ Completing a lesson
✓ Submitting a quiz attempt (pass or fail)
✓ Starting a challenge
✓ Completing a practice session
✗ Opening the app (NOT qualifying)
✗ Viewing the leaderboard (NOT qualifying)
✗ Reading notifications (NOT qualifying)
```

### 5.2 Streak Calculation Algorithm

```text
Inputs:
    today          = current date in student's LOCAL timezone
    last_date      = streaks.last_activity_date

Cases:
    if last_date == today:
        → no change (already counted today)

    elif last_date == today - 1 day:
        → current_streak += 1
        → longest_streak = max(longest_streak, current_streak)
        → last_activity_date = today

    else (gap of 2+ days):
        → current_streak = 1  (reset)
        → last_activity_date = today
```

### 5.3 Streak Notifications Schedule

```text
6:00 PM (student local time): "🔥 Keep your {N}-day streak alive! Study for a few minutes."
9:00 PM (student local time): "⚠️ 3 hours left to save your streak!"
11:30 PM (local time):        "⏰ Last 30 minutes to save your streak!"
Next day (if broken):         "💔 Your streak was reset. Start a new one! 💪"
On milestone (7/30/100 days): "🎉 {N}-day streak! You're incredible! +{bonus_xp} XP"
```

### 5.4 Timezone Handling

```text
All streak dates stored as DATE (not TIMESTAMP)
Comparison uses student's configured timezone (from users.timezone)
Default timezone: UTC (if student hasn't set one)
Edge case: student traveling across timezones
    → Streak comparison uses timezone at time of CHECK, not at time of activity
    → Students are encouraged to set their timezone in profile
```

---

## 6. Challenge System

### 6.1 Challenge Types

| Type | Frequency | XP Range | Description |
|------|-----------|----------|-------------|
| `DAILY` | 1 per day | 40 XP | Auto-generated each day; expires midnight |
| `WEEKLY` | 1 per week | 100 XP | Harder; expires Sunday midnight |
| `PRACTICE` | AI-assigned | 30 XP | AI-recommended for weak topics |
| `BOSS_BATTLE` | Per module | 150 XP | Chapter-end challenge; unlocks next module |
| `TIMED` | Instructor-created | 60 XP | Time-limited quiz format |
| `COLLABORATIVE` | Future feature | TBD | Team challenges |

### 6.2 Challenge Assignment Rules

```text
Daily challenges:
    → Auto-assigned at midnight UTC for all active students
    → Content selected from enrolled courses
    → AI personalizes difficulty based on student level

AI-generated practice challenges:
    → Assigned by Domain Analysis Agent after weak topic detected
    → Must be approved by instructor before appearing to student
    → Maximum 1 active practice challenge per topic at a time

Boss battles:
    → Unlocked after completing all lessons in a module
    → Must be passed to unlock next module (if set as prerequisite)
    → Maximum 3 attempts; after 3 fails → instructor can override

Expired challenges:
    → Challenges past valid_until date cannot be started
    → In-progress challenges can still be submitted within 1 hour of expiry
```

---

## 7. Leaderboard Rules

### 7.1 Leaderboard Types

| Board | Scope | Period | Reset |
|-------|-------|--------|-------|
| Weekly Global | All students | Monday 00:00 UTC | Weekly |
| Course Weekly | Per-course students | Monday 00:00 UTC | Weekly |
| All-Time Global | All students | Since registration | Never |
| Class View | Instructor cohort | This semester | Manual |

### 7.2 Ranking Algorithm

```text
Primary sort:   period_xp DESC   (more XP this week = higher rank)
Tiebreak sort:  last_activity_at ASC (achieved the XP earlier = higher rank)
```

**Example tie:**
```
Alex: 500 XP, last activity Thu 14:00
Maya: 500 XP, last activity Thu 09:00
→ Maya ranks higher (achieved same XP earlier)
```

### 7.3 Fairness Rules

```text
✓ Weekly leaderboard resets every Monday at 00:00 UTC (fair fresh start)
✓ Only valid server-side XP transactions count (no client manipulation)
✓ Inactive accounts (is_active = FALSE) excluded from rankings
✓ Students can opt out of global leaderboard (privacy setting)
✓ If opted out: still visible to instructor in course view; hidden from global
✓ Leaderboard shows max top 100; students always see their own rank
✓ No personally identifiable academic data (grades, quiz scores) shown on leaderboard
```

### 7.4 Redis Implementation

```text
Sorted Set key:   leaderboard:{scope}:{period}:{scopeId?}
Score:            weekly_xp (integer, higher = better)
Member:           student_id (UUID string)

Commands:
    ZADD leaderboard:global:weekly {xp} {student_id}    → update score
    ZREVRANK leaderboard:global:weekly {student_id}     → get 0-indexed rank
    ZINCRBY leaderboard:global:weekly {delta} {id}      → increment score
    ZREVRANGE leaderboard:global:weekly 0 99 WITHSCORES → top 100

Weekly reset:
    DEL leaderboard:global:weekly                        → clear old board
    (Redis TTL can also auto-expire boards)
```

---

## 8. Motivation Without Harmful Pressure

Leaderboards and competition must **not** become the only source of motivation, which can harm students who are already behind.

### 8.1 Multiple Motivation Pathways

```text
Competition lovers:    → Weekly leaderboard + podium
Achievers:            → Badge collection + milestone rewards
Streak keepers:       → Streak counter + freeze tokens (future)
Progress trackers:    → Course completion % + learning journey map
Social learners:      → Squad challenges (future) + shared badges
```

### 8.2 At-Risk Student Handling

```text
AI flags student as "at-risk" when:
    → Streak broken after 7+ days
    → Quiz failure rate > 60% in last 5 attempts
    → No activity for 3+ days
    → XP trend declining for 7 consecutive days

System response:
    1. Instructor notification (NOT shaming the student)
    2. AI generates easier practice challenge (confidence building)
    3. Friendly push notification: "Hey Alex! Your learning journey misses you 💙"
    4. No public indicators of at-risk status
```
