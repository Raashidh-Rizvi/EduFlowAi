# EduFlow AI – RESTful API Specification 📡
> **OpenAPI / Swagger Compliant API Specifications for ASP.NET Core 8.0**

---

## 1. Authentication & Identity (`/api/auth`)

### `POST /api/auth/register`
- **Access**: Public
- **Request**:
  ```json
  {
    "fullName": "Alex Rivera",
    "email": "alex@example.com",
    "password": "SecurePassword123!",
    "role": "Student"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "userId": "33333333-3333-3333-3333-333333333333",
    "token": "eyJhbGciOi...",
    "refreshToken": "d8f3...",
    "expiresAt": "2026-08-16T12:00:00Z"
  }
  ```

### `POST /api/auth/login`
- **Access**: Public
- **Request**:
  ```json
  {
    "email": "alex@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**: Same token payload as register.

---

## 2. Component 1: Gamified Learning & Challenges (`/api/challenges`)

### `GET /api/challenges/daily`
- **Access**: `Student`
- **Response `200 OK`**:
  ```json
  [
    {
      "challengeId": "11111111-1111-1111-1111-111111111111",
      "title": "Daily Focus: Binary Search Trees",
      "description": "Complete 1 practice exercise and 1 quiz with score >= 80%",
      "difficulty": "Medium",
      "xpReward": 100,
      "coinReward": 50,
      "status": "InProgress",
      "expiresAt": "2026-08-15T23:59:59Z"
    }
  ]
  ```

### `POST /api/challenges/{id}/submit`
- **Access**: `Student`
- **Request**:
  ```json
  {
    "attemptAnswers": [
      { "questionId": "uuid", "selectedAnswerId": "uuid" }
    ]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "passed": true,
    "scorePercent": 85,
    "xpEarned": 100,
    "coinsEarned": 50,
    "newTotalXp": 1580,
    "newLevel": 3,
    "unlockedBadges": ["CHALLENGE_MASTER"]
  }
  ```

---

## 3. Component 2: Assessment & Interactive Quizzes (`/api/quizzes`)

### `POST /api/quizzes/{id}/attempts`
- **Access**: `Student`
- **Response `201 Created`**:
  ```json
  {
    "attemptId": "22222222-2222-2222-2222-222222222222",
    "quizTitle": "Python Data Structures",
    "timeLimitMinutes": 15,
    "questions": [
      {
        "questionId": "q1-uuid",
        "questionText": "What is the time complexity of dictionary lookup?",
        "options": [
          { "id": "opt1", "text": "O(1)" },
          { "id": "opt2", "text": "O(n)" }
        ]
      }
    ]
  }
  ```

### `POST /api/quizzes/attempts/{id}/submit`
- **Access**: `Student`
- **Response `200 OK`**:
  ```json
  {
    "attemptId": "22222222-2222-2222-2222-222222222222",
    "score": 90,
    "passed": true,
    "xpEarned": 50,
    "feedback": "Outstanding work on dictionary hashing!"
  }
  ```

---

## 4. Component 3: Progress, Rewards & Achievements (`/api/students/me/gamification`)

### `GET /api/students/me/gamification`
- **Access**: `Student`
- **Response `200 OK`**:
  ```json
  {
    "studentId": "33333333-3333-3333-3333-333333333333",
    "currentLevel": 4,
    "levelName": "Scholar",
    "totalXp": 3250,
    "nextLevelXp": 5000,
    "coins": 420,
    "currentStreak": 7,
    "longestStreak": 14,
    "badgesCount": 6
  }
  ```

### `GET /api/students/me/xp-ledger`
- **Access**: `Student`, `Admin`
- **Response `200 OK`**:
  ```json
  [
    {
      "transactionId": "tx-1",
      "sourceType": "QuizCompleted",
      "xpAmount": 50,
      "createdAt": "2026-08-15T10:30:00Z"
    },
    {
      "transactionId": "tx-2",
      "sourceType": "StreakBonus",
      "xpAmount": 20,
      "createdAt": "2026-08-15T10:30:01Z"
    }
  ]
  ```

---

## 5. Component 4: Social & AI Approvals (`/api/leaderboards` & `/api/ai`)

### `GET /api/leaderboards/weekly`
- **Access**: `Auth User`
- **Response `200 OK`**:
  ```json
  [
    { "rank": 1, "studentName": "Alex Rivera", "weeklyXp": 850, "level": 14, "avatarUrl": "/avatars/1.png" },
    { "rank": 2, "studentName": "Sarah Chen", "weeklyXp": 810, "level": 12, "avatarUrl": "/avatars/2.png" }
  ]
  ```

### `GET /api/ai/challenges/pending`
- **Access**: `Instructor`, `Admin`
- **Response `200 OK`**:
  ```json
  [
    {
      "workflowId": "wf-999",
      "studentName": "Alex Rivera",
      "courseTitle": "Data Structures & Algorithms",
      "detectedWeakness": "Recursion Trees",
      "generatedChallenge": {
        "title": "Recursion Rescue",
        "difficulty": "Medium",
        "xpReward": 150,
        "questionsCount": 3
      },
      "validationPassed": true
    }
  ]
  ```

### `POST /api/ai/challenges/{id}/decision`
- **Access**: `Instructor`
- **Request**:
  ```json
  {
    "decision": "Approved",
    "instructorComments": "Targeted questions are accurate and aligned with syllabus."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "PublishedToStudent",
    "publishedChallengeId": "uuid"
  }
  ```
