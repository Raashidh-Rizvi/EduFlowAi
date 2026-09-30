# 📚 MY WORK STATUS - Atheek M.F. (IT24103933)
### EduFlow AI Project — Student Role

---

## 👤 WHO AM I IN THIS PROJECT?

| My Info | Details |
|---|---|
| **My Name** | Atheek M.F. |
| **My ID** | IT24103933 |
| **My Role in App** | I build the **Student side** of the app |
| **My Main Job** | Student learning, points, badges, levels, AI help |
| **My AI Job** | Domain Analysis Agent (AI that checks what student learned) |

---

## 🏗️ WHAT IS THE APP?

**EduFlow AI** is a learning platform like Google Classroom + Duolingo.
- Students join courses, do lessons and quizzes
- Students earn XP points, badges, streaks, and level up
- An AI gives students personalized study advice
- Works on **Website (React)** AND **Mobile App (Flutter)**

---

## 👥 WHO DOES WHAT? (Team Split)

| Team Member | Their Job |
|---|---|
| **Student 1** (Admin) | Login/accounts, user management, system rules |
| **Student 2** (Instructor) | Create courses, quizzes, grade answers |
| **YOU - Student 3** (Student) | Student experience: join courses, earn rewards, AI coach |

> ⚠️ **Important:** You do NOT build login system (Student 1 does that). You do NOT create quizzes (Student 2 does that). You just build the student side that USES those things.

---

## ✅ WHAT YOU ALREADY BUILT (DONE / PARTIAL)

### 🖥️ Backend Code (Server - C# .NET)

These files exist and have code written:

| File | What it does | Status |
|---|---|---|
| `CoursesController.cs` | Student can join a course, leave a course, see their courses, finish a lesson | ⚠️ PARTIAL |
| `QuizzesController.cs` | Student starts a quiz, submits answers | ⚠️ PARTIAL |
| `ChallengesController.cs` | Student sees daily challenges, submits challenge | ⚠️ PARTIAL |
| `GamificationController.cs` | Student sees XP, coins, badges, missions dashboard | ⚠️ PARTIAL |
| `LeaderboardController.cs` | Shows student rankings | ⚠️ PARTIAL |
| `TeamsController.cs` | Student joins/creates a team | ⚠️ PARTIAL |
| `AiReviewController.cs` | Student chats with AI coach | ⚠️ PARTIAL |
| `NotificationsController.cs` | Student receives notifications | ⚠️ PARTIAL |

**PARTIAL** means = code exists but has problems or missing parts

---

### 🌐 Website Code (React - frontend)

The student website page is at `frontend/src/pages/Student/StudentPortal.jsx`

It has these sections/tabs:
- 🏠 **Home Tab** - Student dashboard
- 📖 **Curriculum Tab** - See courses and lessons
- 📝 **Quiz Runner** - Take a quiz
- 🤖 **Coach Tab** - Talk to AI coach
- ⏱️ **Focus Flow Tab** - Study timer/focus sessions
- 🏆 **Leaderboard Tab** - See rankings
- 👤 **Profile Tab** - See XP, badges, level

**Problem:** These pages show fake/local data, not real data from the server.

---

### 📱 Mobile App Code (Flutter)

These screens exist in `mobile/lib/screens/`:
- Login screen
- Home screen
- Journey (course list)
- Quiz screen
- AI Coach screen
- Leaderboard screen
- Profile screen

**Problem:** These screens use fake data. They don't connect to the real server yet.

---

### 🤖 AI Code (Python)

These AI files exist in `ai-agent/agents/`:

| File | What it does | Status |
|---|---|---|
| `domain_analysis.py` | Analyzes what student knows and doesn't know | ⚠️ PARTIAL |
| `ai_coach.py` | AI coach that talks to student | ⚠️ PARTIAL |
| `retention_behavior.py` | Detects if student is losing motivation | ⚠️ PARTIAL |
| `next_best_action.py` | Suggests what student should study next | ⚠️ PARTIAL |

---

### 🗄️ Database Tables (What gets saved)

These database tables exist (you are responsible for them):
- **Enrollments** - Which student joined which course
- **LessonCompletions** - Which lessons student finished
- **Submissions** - Student quiz answers
- **XpTransactions** - Record of every XP point earned
- **StudentXp** - Total XP for each student
- **StudentStreaks** - Daily study streak count
- **Badges** - Achievements student earned
- **Missions** - Daily/weekly tasks
- **SkillMasteries** - How good student is at each topic
- **Teams** - Study groups
- **StudyPlans** - Student's learning goals

---

## ❌ WHAT IS NOT DONE YET (TODO)

### 🔴 HIGH PRIORITY — Fix These First

#### 1. Fix Website Bugs
- **Mission claim bug**: Website calls wrong function name (`claimGrandReward` but server has `claimDailyGrandMission`)
  - Simple fix: change one word in the frontend code
- **XP shows wrong**: When server fails, website still shows XP went up (it shouldn't)
  - Fix: Only update XP on screen after server confirms success
- **Squad/team route wrong**: Website sends request to wrong URL
  - Fix: Update the URL in frontend code to match server

#### 2. Mobile App — Connect to Real Server
- Currently mobile app shows **fake/hardcoded data**
- Need to connect it to the real .NET server
- Need real login (not simulated)
- Real quiz results, real XP, real leaderboard

#### 3. Security Fixes
- Server needs to check: "Is this student allowed to see this data?"
- Currently anyone could read another student's records — this must be blocked

---

### 🟡 MEDIUM PRIORITY — Important Features

#### 4. Study Plan Feature (Mobile)
- Student should be able to submit a study goal/objective from mobile
- Instructor approves or rejects it
- Student sees the status (pending / approved / rejected)
- This entire feature is **NOT IMPLEMENTED** in mobile yet

#### 5. AI Coach on Mobile
- Currently mobile shows a fake chat response with delay
- Need to connect to real AI backend
- Real responses from the Domain Analysis + Coach AI

#### 6. Next Best Action (Website)
- Website tries to call `/api/ai/next-best-action`
- But that URL **does not exist** in the server yet
- Need to create this API endpoint in .NET

#### 7. Device Feature
- Mobile app must use at least **one special phone feature**
- Examples: camera, GPS location, notifications, microphone
- Currently no real device feature is used — only listed in dependencies

---

### 🟢 ALSO NEEDED — Tests and Evidence

#### 8. Write Tests
- **Concurrency test**: What if 2 students click "complete lesson" at same time? Both should NOT get double XP.
- **Security test**: Test that student A cannot read student B's data
- **Flutter tests**: Widget tests and navigation tests for mobile app
- **Database tests**: Test with real PostgreSQL (not in-memory fake)

#### 9. Evidence for Assignment Submission
- Record real Git commits for YOUR work
- Take screenshots of working app
- Record a video of complete user journey
- Write personal AI usage log (when you used AI to help, what decisions you made)
- Build and install actual APK on phone

---

## 📊 OVERALL STATUS SUMMARY

| Area | Status | Simple Meaning |
|---|---|---|
| **Backend (Server)** | ⚠️ Strong but has bugs | Code exists, fix security + bugs |
| **Database** | ⚠️ Medium | Tables exist, test with real DB |
| **Website (React)** | ⚠️ Medium | Pages exist, fix fake data + bugs |
| **Mobile App (Flutter)** | 🔴 Early stage | Screens exist but all fake data |
| **AI Agents** | ⚠️ Medium | Python code exists, not fully connected |
| **Security** | 🔴 Early stage | Very incomplete, needs work |
| **Tests** | 🔴 Early stage | Some tests exist, many missing |
| **Evidence/Docs** | 🔴 Not done | Need personal screenshots, commits, APK |

---

## 📋 SIMPLE TASK LIST (What to do, in order)

### Week 1 — Fix obvious bugs
1. ☐ Fix mission claim method name in React frontend
2. ☐ Fix XP display — don't update screen if server fails
3. ☐ Fix squad/team URL route in React frontend
4. ☐ Add check in server: student can only see THEIR OWN data

### Week 2 — Connect mobile to server
5. ☐ Replace fake login in Flutter with real API call
6. ☐ Replace fake XP/badge/leaderboard with real API data
7. ☐ Connect quiz submission in Flutter to server
8. ☐ Connect AI coach in Flutter to server

### Week 3 — New features
9. ☐ Create the "Next Best Action" API endpoint in .NET
10. ☐ Build study plan submission in Flutter
11. ☐ Add a real phone feature (example: push notifications)

### Week 4 — Tests and evidence
12. ☐ Write PostgreSQL tests for XP duplicate prevention
13. ☐ Write Flutter widget tests
14. ☐ Build APK and install on phone/emulator
15. ☐ Take screenshots and record video of working app
16. ☐ Write your personal Git commits and AI usage log

---

## 🎓 IMPORTANT: Viva Questions You Need to Know

These questions may be asked in your viva (oral exam):

1. **"Why do you have both XP ledger and total XP?"**
   - Ledger = every single XP event recorded (like a bank statement)
   - Total XP = quick summary for display (like bank balance)
   - Both needed: total for speed, ledger for audit/proof

2. **"How do you stop student from getting XP twice if they click fast?"**
   - Server should check if that exact lesson was already completed
   - Only award XP once per lesson, per student

3. **"How is streak calculated?"**
   - Check if student did ANY activity TODAY
   - Compare with yesterday — if yes both days, streak continues
   - If student missed a day, streak resets to 0

4. **"Who grades the quiz? Who gives the reward?"**
   - Student 2 (Instructor side) defines quiz and grades answers
   - YOU (Student 3) give the XP reward AFTER getting the grade result

5. **"Why is student ID in the URL not enough security?"**
   - Any logged-in user could type another student's ID in URL
   - Server must check the JWT token identity, not just the URL ID

---

## 📁 YOUR MOST IMPORTANT FILES

| File | Location | What it is |
|---|---|---|
| `CoursesController.cs` | `backend/.../Controllers/` | Enrollment, lesson completion |
| `GamificationController.cs` | `backend/.../Controllers/` | XP, badges, missions |
| `GamificationService.cs` | `backend/.../Services/` | All reward calculation logic |
| `LevelCurve.cs` | `backend/.../Constants/` | Level calculation (COMPLETE ✅) |
| `StudentPortal.jsx` | `frontend/src/pages/Student/` | Main student website page |
| `gamificationService.js` | `frontend/src/services/` | Website API calls for rewards |
| `domain_analysis.py` | `ai-agent/agents/` | YOUR main AI agent |
| `main_navigation_screen.dart` | `mobile/lib/screens/` | Mobile app navigation |

---

> 💡 **Simple Summary in One Sentence:**
> You have built the foundation (skeleton) of the student experience — now you need to connect all the pieces together with real data, fix the bugs, and prove it works with tests and screenshots.
