> **LEGACY — former four-member allocation.** Retained only for historical/reference purposes; this is **NOT** the current responsibility source. Current ownership is defined in [RESPONSIBILITY_MATRIX.md](../../responsibilities/RESPONSIBILITY_MATRIX.md). This archived body does not establish current ownership or change historical authorship.

# Member 3 – Gamification & Engagement

> **Component Owner**: Member 3  
> **AI Agent Responsibility**: Domain Analysis Agent  
> **Interface**: Flutter Mobile (student XP/badges/leaderboard) + React Web (instructor engagement dashboard)

---

## Business Component Scope

This is the **core product differentiator**. Gamification is what makes EduFlow AI feel different from a traditional LMS.

**Owns:**
- XP (Experience Points) ledger — immutable transaction log
- Level system — mathematical progression curve
- Badge engine — rule-based achievement evaluation
- Streak engine — daily learning consistency tracking
- Daily & weekly challenge system
- Leaderboards — Redis-powered real-time rankings
- Boss battles & milestone challenges
- Domain Analysis Agent

---

## 1. Philosophy: Reward Learning, Not Activity

```text
❌ Bad gamification:                    ✅ Good gamification:
────────────────────                   ────────────────────
Open app = XP                          Complete lesson = XP
Click random button = XP               Pass quiz = XP
Repeat failed quiz = full XP farm      Perfect score = bonus XP
Logging in daily = streak              Actually study daily = streak
```

The XP system must measure **learning effort and achievement**, not time spent in the app or gaming behavior.

---

## 2. Database Schema

### 2.1 XP Transactions (Immutable Ledger)

```sql
-- Append-only. Never UPDATE or DELETE.
CREATE TABLE xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    source_type VARCHAR(50) NOT NULL,
    -- LESSON_COMPLETED | QUIZ_PASSED | PERFECT_SCORE | DAILY_CHALLENGE
    -- WEEKLY_CHALLENGE | COURSE_COMPLETED | BOSS_BATTLE | STREAK_BONUS | ADMIN_GRANT
    source_id UUID,              -- lesson_id, quiz_id, challenge_id, etc.
    xp_amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_student_time ON xp_transactions(student_id, created_at DESC);
```

### 2.2 User Points (Aggregated — derived from ledger)

```sql
CREATE TABLE user_points (
    student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0,         -- current total (used for level calc)
    weekly_xp INTEGER NOT NULL DEFAULT 0,        -- reset every Monday midnight UTC
    lifetime_xp INTEGER NOT NULL DEFAULT 0,      -- never reset
    current_level INTEGER NOT NULL DEFAULT 1,
    last_level_up_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.3 Badges

```sql
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,   -- e.g., 'FIRST_LESSON', 'SEVEN_DAY_STREAK'
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT NOT NULL,
    category VARCHAR(30) NOT NULL,      -- LEARNING | STREAK | QUIZ | SOCIAL | MILESTONE
    rarity VARCHAR(20) NOT NULL DEFAULT 'COMMON',  -- COMMON | RARE | EPIC | LEGENDARY
    criteria_type VARCHAR(50) NOT NULL,  -- EVENT_BASED | THRESHOLD | CUMULATIVE
    criteria_json JSONB NOT NULL,        -- evaluation rules
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE user_badges (
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, badge_id)
);
```

### 2.4 Streaks

```sql
CREATE TABLE streaks (
    student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,           -- stored in student's LOCAL timezone
    freeze_tokens INTEGER NOT NULL DEFAULT 0,  -- future: streak freeze item
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.5 Challenges

```sql
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(30) NOT NULL,
    -- DAILY | WEEKLY | BOSS_BATTLE | PRACTICE | TIMED | COLLABORATIVE
    difficulty VARCHAR(10) NOT NULL,
    linked_quiz_id UUID REFERENCES quizzes(id),
    xp_reward INTEGER NOT NULL,
    max_xp_cap INTEGER NOT NULL DEFAULT 150,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    challenge_id UUID NOT NULL REFERENCES challenges(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    xp_awarded INTEGER,
    result VARCHAR(20),  -- COMPLETED | FAILED | ABANDONED
    UNIQUE(student_id, challenge_id)
);
```

### 2.6 Leaderboard Entries (PostgreSQL backup — Redis is primary)

```sql
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    scope VARCHAR(20) NOT NULL,    -- GLOBAL | COURSE | WEEKLY
    scope_id UUID,                 -- course_id if COURSE scope
    period VARCHAR(20) NOT NULL,   -- WEEKLY | MONTHLY | ALL_TIME
    xp_score INTEGER NOT NULL,
    rank INTEGER,
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. XP Engine

### 3.1 XP Award Rules

```json
{
  "LESSON_COMPLETED": { "baseXp": 20, "maxPerDay": 200 },
  "QUIZ_PASSED":      { "baseXp": 20 },
  "PERFECT_SCORE":    { "baseXp": 50 },
  "DAILY_CHALLENGE":  { "baseXp": 40 },
  "WEEKLY_CHALLENGE": { "baseXp": 100 },
  "COURSE_COMPLETED": { "baseXp": 300 },
  "BOSS_BATTLE":      { "baseXp": 150 },
  "STREAK_7_DAYS":    { "baseXp": 70 },
  "STREAK_30_DAYS":   { "baseXp": 300 }
}
```

### 3.2 Difficulty Multipliers

```text
BEGINNER   1.0×
EASY       1.2×
MEDIUM     1.5×
HARD       2.0×
EXPERT     2.5×

FINAL XP = min(base × multiplier, max_xp_cap)
```

### 3.3 XP Award Transaction (C# Pseudocode)

```csharp
public async Task AwardXpAsync(Guid studentId, XpSourceType sourceType, 
                                Guid sourceId, int baseXp, string description)
{
    // 1. Idempotency check — same source should not award twice
    var alreadyAwarded = await _xpRepo.ExistsAsync(studentId, sourceType, sourceId);
    if (alreadyAwarded) return; // idempotent: no-op

    // 2. Apply daily cap if applicable
    var rule = _xpRules.GetRule(sourceType);
    if (rule.MaxPerDay.HasValue)
    {
        var todayXp = await _xpRepo.GetTodayXpAsync(studentId, sourceType);
        if (todayXp >= rule.MaxPerDay.Value) return; // cap reached
        baseXp = Math.Min(baseXp, rule.MaxPerDay.Value - todayXp);
    }

    // 3. Apply difficulty multiplier (from source entity)
    var multiplier = GetDifficultyMultiplier(sourceType, sourceId);
    var finalXp = (int)Math.Min(baseXp * multiplier, rule.MaxXpCap ?? int.MaxValue);

    using var tx = await _db.BeginTransactionAsync();
    try
    {
        // 4. Append to immutable ledger
        await _xpRepo.InsertTransactionAsync(new XpTransaction
        {
            StudentId = studentId,
            SourceType = sourceType,
            SourceId = sourceId,
            XpAmount = finalXp,
            Description = description
        });

        // 5. Update aggregated points
        await _pointsRepo.IncrementAsync(studentId, finalXp);

        await tx.CommitAsync();
    }
    catch { await tx.RollbackAsync(); throw; }

    // 6. Check for level up (outside transaction)
    await CheckLevelUpAsync(studentId);
    
    // 7. Emit domain event
    _events.Publish(new XpGranted(studentId, finalXp, sourceType));
}
```

---

## 4. Level System

### 4.1 Level Curve Formula

```
XP required for Level N = 100 × N^1.5

Level  1 →     100 XP
Level  2 →     283 XP
Level  3 →     520 XP
Level  5 →   1,118 XP
Level 10 →   3,162 XP
Level 20 →   8,944 XP
Level 30 →  16,431 XP
```

### 4.2 Level Tiers

| Levels | Tier Title | Unlocks |
|--------|-----------|---------|
| 1–3 | 🌱 Seedling | Basic avatar frames |
| 4–7 | 📚 Scholar | Study themes |
| 8–12 | ⚡ Apprentice | Challenge types unlocked |
| 13–18 | 🎯 Expert | Boss battle access |
| 19–25 | 🏆 Master | Special leaderboard tier |
| 26–30 | 👑 Grandmaster | Elite badge + certificate |

### 4.3 Level Up Event

```text
When XP crosses threshold:
    1. Update user_points.current_level
    2. Record last_level_up_at
    3. Emit LevelUp domain event
    4. SignalR: push full-screen celebration to Flutter
    5. Check if new level unlocks any badge
    6. Analytics: record progression milestone
```

---

## 5. Badge Engine

### 5.1 Badge Catalogue

| Code | Name | Trigger | Rarity |
|------|------|---------|--------|
| `FIRST_LESSON` | First Step | Complete first lesson | Common |
| `FIRST_QUIZ` | Quiz Taker | Complete first quiz | Common |
| `PERFECT_SCORE` | Perfectionist | Score 100% on any quiz | Rare |
| `QUIZ_MASTER` | Quiz Master | Pass 10 quizzes | Rare |
| `THREE_DAY_STREAK` | On a Roll | 3-day streak | Common |
| `SEVEN_DAY_STREAK` | Week Warrior | 7-day streak | Rare |
| `THIRTY_DAY_STREAK` | Unstoppable | 30-day streak | Epic |
| `CHALLENGE_MASTER` | Challenge Accepted | Complete 5 challenges | Rare |
| `SPEED_DEMON` | Speed Demon | Submit quiz in < 30% of time limit | Rare |
| `COURSE_COMPLETE` | Graduate | Complete a full course | Epic |
| `BOSS_SLAYER` | Boss Slayer | Win a boss battle challenge | Epic |
| `TOP_TEN_WEEKLY` | Top 10 | Reach top 10 on weekly leaderboard | Rare |
| `TOP_THREE_WEEKLY` | Podium Finish | Reach top 3 on weekly leaderboard | Epic |
| `COMEBACK_KID` | Comeback | Re-achieve 7-day streak after losing one | Rare |
| `HELPING_HAND` | Mentor | (Future: help squad member) | Legendary |

### 5.2 Badge Evaluation

Badges are evaluated on **every domain event** — this is event-driven, not scheduled:

```csharp
public async Task EvaluateBadgesAsync(Guid studentId, DomainEvent trigger)
{
    var stats = await _statsRepo.GetStudentStatsAsync(studentId);
    var earnedBadges = await _badgeRepo.GetEarnedBadgeCodesAsync(studentId);
    var allBadges = await _badgeRepo.GetActiveBadgesAsync();

    foreach (var badge in allBadges.Where(b => !earnedBadges.Contains(b.Code)))
    {
        if (await _badgeEvaluator.IsEligibleAsync(studentId, badge, stats, trigger))
        {
            await AwardBadgeAsync(studentId, badge);
        }
    }
}

// Badge evaluator is deterministic — pure function of student stats + trigger
// AI cannot award badges directly
```

---

## 6. Streak Engine

### 6.1 Streak Logic

```text
Streak rules:
1. Streak counts unique CALENDAR DAYS with qualifying activity
2. Qualifying activities: lesson completed, quiz attempted, challenge started
3. Only first qualifying activity per day counts (no farming)
4. Streak increments: if last_activity_date == YESTERDAY (in student timezone)
5. Streak resets to 1: if last_activity_date < YESTERDAY
6. Duplicate activities same day: streak unchanged
7. Timezone: stored in UTC, compared in student's local timezone

Algorithm on each qualifying event:
    today = date.today(student.timezone)
    if last_activity_date == today:
        pass  # already counted today
    elif last_activity_date == today - 1 day:
        current_streak += 1
        longest_streak = max(longest_streak, current_streak)
    else:
        current_streak = 1  # reset
    last_activity_date = today
```

### 6.2 Streak Notifications

```text
6:00 PM local time: "🔥 Don't forget to learn today! Keep your {N}-day streak alive."
9:00 PM local time: "⚠️ 3 hours left to save your {N}-day streak!"
On streak break:    "Your streak has been reset. Start a new one today! 💪"
On milestone:       "🔥 Amazing! You've reached a {7|30|100}-day streak!"
```

---

## 7. Leaderboard Architecture

### 7.1 Redis Sorted Sets (Primary)

```redis
# Weekly global leaderboard
ZADD leaderboard:global:weekly {xp_score} {student_id}
ZREVRANK leaderboard:global:weekly {student_id}   # Get rank (0-indexed)
ZREVRANGE leaderboard:global:weekly 0 9 WITHSCORES  # Top 10

# Course-specific leaderboard
ZADD leaderboard:course:{courseId}:weekly {xp_score} {student_id}

# All-time global
ZADD leaderboard:global:alltime {lifetime_xp} {student_id}
```

### 7.2 Leaderboard Views

```text
| View | Scope | Reset | Audience |
|------|-------|-------|----------|
| Weekly Global | All students | Every Monday 00:00 UTC | All |
| Course Weekly | Per-course | Every Monday 00:00 UTC | Enrolled |
| All-Time Global | All students | Never | All |
| Class View | Per-cohort | Manual | Cohort |
```

### 7.3 Ranking Query Tie-Breaking

```
PRIMARY sort:  weekly_xp DESC  (more XP = higher rank)
SECONDARY sort: last_activity_at ASC  (achieved XP earlier = higher rank)

This ensures deterministic ranking even on ties.
```

### 7.4 Privacy Controls

```text
Students can opt out of the global leaderboard in profile settings.
If opted out:
- Their score is excluded from global leaderboard display
- Course-specific leaderboards still show them (to instructor)
- No personal data visible to other students
```

---

## 8. Domain Analysis Agent

The Domain Analysis Agent reads student performance data and generates actionable recommendations for the Planner Agent.

### 8.1 Input

```json
{
  "studentId": "uuid",
  "courseId": "uuid",
  "analysisContext": {
    "recentQuizScores": [
      { "topicTag": "recursion", "score": 45, "passed": false },
      { "topicTag": "lists", "score": 90, "passed": true }
    ],
    "lessonCompletionRate": 0.65,
    "currentStreak": 5,
    "weeklyXpTrend": [120, 80, 95, 140, 60],
    "lastChallengeResult": "FAILED",
    "avgSessionMinutes": 18
  }
}
```

### 8.2 Output

```json
{
  "engagementLevel": "MEDIUM",
  "learningGaps": ["recursion", "binary_trees"],
  "strengths": ["lists", "dictionaries"],
  "recommendedDifficulty": "MEDIUM",
  "nextBestAction": "PRACTICE_CHALLENGE",
  "reason": "Student has failed recursion 3 times. A medium-difficulty practice challenge on recursion will strengthen this gap before attempting the module quiz.",
  "urgency": "HIGH",
  "estimatedReadiness": 0.62
}
```

### 8.3 Guardrails

```text
The Domain Analysis Agent CANNOT:
✗ Directly award XP
✗ Directly modify leaderboard scores
✗ Set final grades
✗ Change student role or permissions
✗ Publish content without Instructor approval

The agent can ONLY:
✓ Analyze publicly available performance data
✓ Return structured recommendations
✓ Suggest difficulty and challenge type
✓ Flag at-risk students for instructor notification
```

---

## 9. Engagement Dashboard (React)

```text
Instructor sees per-course:
├── Daily Active Students (last 7 days) — line chart
├── Average Quiz Score by Topic — bar chart / heatmap
├── Streak Distribution — histogram
├── XP Economy — total awarded this week
├── Challenge Completion Rate — donut chart
├── Badge Unlock Rate — recent unlocks list
├── At-Risk Students — list with AI flag reasons
└── Leaderboard Snapshot — top 10 with rank changes
```

---

## 10. API Endpoints

```http
# Student self-service (Flutter)
GET    /api/gamification/me             My XP, level, streak, badges summary
GET    /api/gamification/me/xp          XP transaction history
GET    /api/gamification/me/badges      My earned badges
GET    /api/gamification/me/streak      Streak detail
GET    /api/gamification/me/level       Level detail + next level threshold
GET    /api/gamification/me/challenges  My active challenges

# Leaderboards
GET    /api/leaderboards/global/weekly  Top 100 this week
GET    /api/leaderboards/global/alltime All-time global
GET    /api/leaderboards/course/{id}    Course leaderboard
GET    /api/leaderboards/me/rank        My current rank across all boards

# Challenges
GET    /api/challenges                  Available challenges
GET    /api/challenges/{id}             Challenge detail
POST   /api/challenges/{id}/start       Start challenge
POST   /api/challenges/{id}/complete    Complete challenge (validate + award)

# Instructor / Admin
GET    /api/analytics/engagement        Engagement dashboard data
GET    /api/analytics/at-risk          At-risk students list
PATCH  /api/admin/users/{id}/xp        Manually adjust XP [Admin only]
```

---

## 11. Testing Requirements

```text
Unit tests (must cover):
✓ XP calculation: base × multiplier, capped at max_xp_cap
✓ Daily XP cap enforcement (maxPerDay rules)
✓ Idempotency: same source_id cannot grant XP twice
✓ Level threshold calculation formula (100 × N^1.5)
✓ Level up detection on XP increment
✓ Streak increment on new calendar day
✓ Streak reset when day skipped
✓ Duplicate streak credit same day = no change
✓ Badge award idempotency (badge awarded only once)
✓ Leaderboard tiebreaker (earlier achievement = higher rank)

Integration tests (must cover):
✓ Complete quiz → XP ledger entry created → user_points updated → level checked
✓ Lesson completed → streak updated → badge evaluated
✓ Level up → SignalR event fires → Flutter receives notification
✓ Weekly leaderboard reset runs correctly
✓ Admin manually adjusting XP creates audit log entry
✓ Concurrent quiz submissions → XP not double-awarded (idempotency key)
```
