# EduFlow AI – Gamification Rulebook

## 1. Principle

Gamification must encourage **actual learning behavior**.

Avoid rewarding:
- pointless app opening
- repeated empty clicks
- repeated retries designed only to farm XP

---

# 2. XP Rule Model

Example configuration:

```json
{
  "LESSON_COMPLETED": {
    "baseXp": 20,
    "maxPerDay": 200
  },
  "QUIZ_PASSED": {
    "baseXp": 20
  },
  "PERFECT_SCORE": {
    "baseXp": 50
  },
  "DAILY_CHALLENGE": {
    "baseXp": 40
  },
  "COURSE_COMPLETED": {
    "baseXp": 300
  }
}
```

---

# 3. Reward Multipliers

Optional:

```text
Difficulty
Easy      1.0x
Medium    1.5x
Hard      2.0x
Expert    2.5x
```

But cap the final reward.

Example:

```text
Maximum challenge reward = 150 XP
```

---

# 4. Anti-Farming

Rules:
- same activity cannot grant XP twice unless explicitly repeatable
- identical submissions do not re-award completion XP
- streak counts calendar days, not number of clicks
- leaderboard is based on valid server-side transactions
- client-provided reward values are ignored

---

# 5. Badge Examples

```text
FIRST_LESSON
FIRST_QUIZ
PERFECT_SCORE
QUIZ_MASTER
THREE_DAY_STREAK
SEVEN_DAY_STREAK
THIRTY_DAY_STREAK
CHALLENGE_MASTER
COURSE_COMPLETE
TEAM_PLAYER
TOP_TEN_WEEKLY
```

---

# 6. Challenge Types

```text
QUIZ
PRACTICE
TIMED
BOSS
REVISION
COLLABORATIVE
DAILY
WEEKLY
```

---

# 7. Difficulty

Difficulty should be represented by structured metadata.

```text
BEGINNER
EASY
MEDIUM
HARD
EXPERT
```

AI may recommend difficulty, but backend eligibility rules decide whether the challenge can be assigned.

---

# 8. Leaderboard Fairness

Use:
- weekly reset
- course-specific views
- class views
- optional privacy controls

Avoid showing sensitive academic data publicly.

---

# 9. Motivation Without Harmful Pressure

Leaderboards should be one motivation mechanism, not the only one.

Provide:
- personal best
- progress toward next level
- achievement completion
- learning streak
- team goals

This allows students who dislike direct competition to remain engaged.
