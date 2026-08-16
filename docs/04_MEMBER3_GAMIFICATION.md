# Member 3 – Gamification & Engagement

## Business Component

This is the **core product differentiator**.

Owns:
- XP
- points
- levels
- badges
- achievements
- streaks
- leaderboards
- challenges
- engagement rules

Agentic AI responsibility:

> **Domain Analysis Agent**

The agent analyzes learning/performance data to recommend suitable gamification and engagement actions.

---

# 1. Gamification Philosophy

Reward **learning**, not meaningless activity.

Bad:

```text
Open app = 500 XP
```

Better:

```text
Complete meaningful learning = XP
Improve mastery = bonus
Complete challenge = XP
Maintain learning consistency = streak
```

---

# 2. Database

## XP Transactions

```text
xp_transactions
- id
- student_id
- source_type
- source_id
- points
- created_at
```

## User Points

```text
user_points
- student_id
- total_points
- lifetime_points
- updated_at
```

## Badges

```text
badges
- id
- code
- name
- description
- icon_url
- criteria_type
- criteria_value
```

## User Badges

```text
user_badges
- student_id
- badge_id
- unlocked_at
```

## Achievements

```text
achievements
- id
- name
- description
- criteria_json
- reward_xp
```

## Streaks

```text
streaks
- student_id
- current_streak
- longest_streak
- last_activity_date
```

---

# 3. XP Engine

Central service:

```text
GamificationService
```

Methods:

```text
AwardXp()
RecalculateLevel()
EvaluateAchievements()
UpdateStreak()
UpdateLeaderboard()
```

No client is allowed to POST:

```json
{
  "xp": 100000
}
```

The client requests an action; the backend calculates the reward.

---

# 4. Example XP Rules

| Event | XP |
|---|---:|
| Lesson completed | 20 |
| Quiz completed | 30 |
| Quiz passed | 20 |
| Perfect score | 50 |
| Daily challenge | 40 |
| Advanced challenge | 100 |
| Course completed | 300 |

Store these in configurable rules rather than hardcoding every number.

---

# 5. Level Calculation

Example:

```text
0-499       Beginner
500-1499    Explorer
1500-2999   Learner
3000-4999   Scholar
5000-7999   Expert
8000+       Master
```

The exact values should be configurable.

---

# 6. Streak Engine

A streak represents consecutive calendar days with meaningful learning activity.

Recommended logic:

```text
No activity yesterday + activity today
    => streak = 1

Activity yesterday + activity today
    => streak += 1

Duplicate activities today
    => streak unchanged
```

Store timezone-aware dates.

---

# 7. Leaderboards

Views:

```text
Global
Course
Class
Weekly
Monthly
Friends/Team
```

The ranking query should be deterministic:

```text
ORDER BY period_xp DESC, last_activity_at ASC
```

Use Redis caching after correctness is established.

---

# 8. Challenge System

Challenge table:

```text
challenges
- id
- course_id
- title
- description
- type
- difficulty
- objective
- xp_reward
- status
- generated_by_ai
```

Student challenge:

```text
student_challenges
- id
- student_id
- challenge_id
- assigned_at
- started_at
- completed_at
- result
```

---

# 9. Engagement Dashboard

React should show:

```text
Daily Active Students
Weekly Active Students
Average Streak
Average XP
Challenge Completion Rate
Quiz Completion Rate
Badge Unlock Rate
Leaderboard Participation
```

Avoid vanity metrics only. Measure learning engagement and completion.

---

# 10. Domain Analysis Agent

Input:

```json
{
  "student": {},
  "progress": {},
  "quizPerformance": {},
  "engagement": {},
  "recentChallenges": {}
}
```

Output:

```json
{
  "engagementLevel": "medium",
  "skillGaps": ["recursion"],
  "recommendedDifficulty": "medium",
  "recommendedAction": "PRACTICE_CHALLENGE",
  "reason": "Student repeatedly struggles with recursion questions."
}
```

The agent recommends. The deterministic rules decide whether the recommendation is allowed.

---

# 11. Gamification Guardrails

AI cannot decide:
- final grades
- unrestricted XP
- leaderboard positions
- role permissions
- competition eligibility without rule checks

The backend remains authoritative.

---

# 12. Flutter Gamification UX

Home:

```text
🔥 12 day streak
⚡ Level 14
7,420 XP
██████████████░░

🎯 Today's Mission
Python Functions

Reward:
+180 XP

[START]
```

Profile:

```text
Level
XP
Streak
Badges
Achievements
Leaderboard Rank
```

---

# 13. Advanced Features

After MVP:
- team challenges
- virtual coins
- avatar customization
- boss challenges
- unlockable content
- adaptive difficulty
- seasonal competitions
