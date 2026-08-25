using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Api.Filters;
using EduFlow.Core.Constants;
using EduFlow.Core.Entities;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

/// <summary>
/// Internal, service-to-service-only read API that the Python AI microservice (ai-agent) calls to
/// ground its quiz generation / progress analysis / remediation agents in real EduFlow data instead
/// of hardcoded fakes.
///
/// This is deliberately NOT under "api/" -- it is not a public-facing, versioned API surface, and it
/// carries no [Authorize] JWT attribute. It is protected exclusively by
/// <see cref="InternalServiceAuthFilter"/>, which enforces the shared "X-Internal-Api-Key" header
/// (see that filter's docs for the fail-open-in-dev contract). Every route here is read-only:
/// this controller must never mutate EduFlow data.
///
/// FIELD-NAME CONTRACT: the exact JSON key names returned here matter -- ai-agent/tools/registry.py
/// reads these responses via a `_pick(raw, "camelCase", "snake_case", "PascalCase", default=...)`
/// helper that tries several casings before falling back to hardcoded defaults. The camelCase variant
/// is tried first and matches this API's default ASP.NET Core JSON casing, so every field name below
/// was chosen to match registry.py's `_pick(...)` calls exactly (see comments per-endpoint). Fields
/// registry.py doesn't look for are still included where useful (extra keys are simply ignored by
/// `_pick`), but every field registry.py DOES read by exact key is present here whenever the
/// underlying data genuinely exists -- fields with no authoritative source in this codebase are left
/// out entirely so registry.py's own sensible hardcoded default takes over, rather than fabricating a
/// number that isn't real.
/// </summary>
[ApiController]
[Route("internal/ai-tools")]
[TypeFilter(typeof(InternalServiceAuthFilter))]
public class InternalAiToolsController : ControllerBase
{
    // Keeps the "content" excerpt endpoint usable as LLM prompt-grounding context rather than a full
    // document dump -- a few thousand characters is plenty for grounding without blowing token budgets.
    private const int MaxExcerptChars = 4000;

    // Caps for list-shaped endpoints so a very active student / heavily-quizzed scope can't return an
    // unbounded payload to the calling agent.
    private const int MaxExistingQuestions = 50;
    private const int MaxQuizResults = 20;

    private readonly ApplicationDbContext _dbContext;

    public InternalAiToolsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // -------------------------------------------------------------------------
    // 1. FULL CURRICULUM HIERARCHY (Course -> Module -> Topic -> ContentItem)
    // Consumed by tool_get_content_hierarchy, which reads: courseId, courseCode, title,
    // modules[].moduleId/title/topics[].topicId/title/contentItems[].id/title/type
    // -------------------------------------------------------------------------

    [HttpGet("curriculum/hierarchy")]
    public async Task<IActionResult> GetCurriculumHierarchy([FromQuery] Guid courseId, CancellationToken ct)
    {
        var course = await _dbContext.Courses
            .Include(c => c.Modules.OrderBy(m => m.OrderIndex))
                .ThenInclude(m => m.Topics.OrderBy(t => t.DisplayOrder))
                    .ThenInclude(t => t.ContentItems.OrderBy(ci => ci.DisplayOrder))
            .FirstOrDefaultAsync(c => c.Id == courseId, ct);

        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        // Content items that sit directly under a module (no topic) are queried separately, mirroring
        // the same pattern CoursesController.GetCourseHierarchy uses, to avoid combining a filtered
        // Include on Modules.ContentItems with the Modules.Topics.ContentItems chain above.
        var moduleIds = course.Modules.Select(m => m.Id).ToList();
        var directContentItems = await _dbContext.ContentItems
            .Where(ci => moduleIds.Contains(ci.ModuleId) && ci.TopicId == null && ci.ParentContentId == null)
            .OrderBy(ci => ci.DisplayOrder)
            .ToListAsync(ct);

        var modules = course.Modules.Select(m => new
        {
            moduleId = m.Id,
            title = m.Title,
            order = m.OrderIndex,
            topics = m.Topics.Select(t => new
            {
                topicId = t.Id,
                title = t.Title,
                contentItems = t.ContentItems
                    .Where(ci => ci.ParentContentId == null)
                    .Select(ci => new
                    {
                        id = ci.Id,
                        title = ci.Title,
                        type = ci.ContentType
                    })
                    .ToList()
            }).ToList(),
            // Bonus (not read by registry.py's _pick): content items filed directly under the
            // module, without a topic.
            directContentItems = directContentItems
                .Where(ci => ci.ModuleId == m.Id)
                .Select(ci => new
                {
                    id = ci.Id,
                    title = ci.Title,
                    type = ci.ContentType
                })
                .ToList()
        }).ToList();

        return Ok(new
        {
            courseId = course.Id,
            courseCode = course.Code,
            title = course.Title,
            modules
        });
    }

    // -------------------------------------------------------------------------
    // 2. GROUNDING CONTENT EXCERPTS FOR A GIVEN CURRICULUM SCOPE
    // Consumed by tool_get_content_by_scope, which reads: title, excerpts (list of strings), and
    // optionally learningObjectives / sourceHash (left to its own fallback when we have no real
    // source for them -- this schema has no per-scope learning-objective data).
    // -------------------------------------------------------------------------

    [HttpGet("curriculum/content")]
    public async Task<IActionResult> GetCurriculumContent([FromQuery] string scopeType, [FromQuery] Guid scopeId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(scopeType))
        {
            return BadRequest(new { message = "scopeType is required. Valid values: Course, Module, Topic, Lesson (ContentItem)." });
        }

        string title;
        List<string> excerptParts;

        // Normalize away underscores/hyphens/case before matching: the task-facing contract spells
        // this scope "Lesson", but ai-agent's own internal vocabulary (see tool_resolve_scope's
        // valid_scopes list) sends "CONTENT_ITEM" (uppercase, underscored) for the same concept. This
        // one normalization handles "Lesson", "ContentItem", "CONTENT_ITEM", and "content-item" alike.
        switch (scopeType.Trim().ToLowerInvariant().Replace("_", "").Replace("-", ""))
        {
            case "course":
            {
                var course = await _dbContext.Courses
                    .Include(c => c.Modules.OrderBy(m => m.OrderIndex))
                    .FirstOrDefaultAsync(c => c.Id == scopeId, ct);

                if (course == null)
                {
                    return NotFound(new { message = "Course not found." });
                }

                title = course.Title;
                excerptParts = new List<string> { course.Description }
                    .Concat(new[] { $"Modules covered: {string.Join(", ", course.Modules.Select(m => m.Title))}" })
                    .ToList();
                break;
            }

            case "module":
            {
                var module = await _dbContext.Modules
                    .Include(m => m.Topics.OrderBy(t => t.DisplayOrder))
                    .Include(m => m.ContentItems.Where(ci => ci.TopicId == null).OrderBy(ci => ci.DisplayOrder))
                    .FirstOrDefaultAsync(m => m.Id == scopeId, ct);

                if (module == null)
                {
                    return NotFound(new { message = "Module not found." });
                }

                title = module.Title;
                excerptParts = new List<string> { module.Description }
                    .Concat(new[] { $"Topics: {string.Join(", ", module.Topics.Select(t => t.Title))}" })
                    .Concat(new[] { $"Content items: {string.Join(", ", module.ContentItems.Select(ci => ci.Title))}" })
                    .ToList();
                break;
            }

            case "topic":
            {
                var topic = await _dbContext.Topics
                    .Include(t => t.ContentItems.OrderBy(ci => ci.DisplayOrder))
                    .FirstOrDefaultAsync(t => t.Id == scopeId, ct);

                if (topic == null)
                {
                    return NotFound(new { message = "Topic not found." });
                }

                title = topic.Title;
                excerptParts = new List<string> { topic.Description };
                excerptParts.AddRange(topic.ContentItems
                    .Where(ci => ci.ParentContentId == null)
                    .Select(ci => $"{ci.Title}: {ci.Content}"));
                break;
            }

            // The task-facing contract calls this scope "Lesson", but the curriculum entity backing a
            // single leaf item is ContentItem (QuizScopeType has no "Lesson" member) -- with the older,
            // simpler Lesson entity still present in the schema too. Try ContentItem first (the modern
            // hierarchy), then fall back to Lesson so either id shape resolves.
            case "contentitem":
            case "lesson":
            {
                var contentItem = await _dbContext.ContentItems.FirstOrDefaultAsync(ci => ci.Id == scopeId, ct);
                if (contentItem != null)
                {
                    title = contentItem.Title;
                    excerptParts = new List<string> { contentItem.Content };
                    break;
                }

                var lesson = await _dbContext.Lessons.FirstOrDefaultAsync(l => l.Id == scopeId, ct);
                if (lesson != null)
                {
                    title = lesson.Title;
                    excerptParts = new List<string> { lesson.Content };
                    break;
                }

                return NotFound(new { message = "Content item / lesson not found." });
            }

            default:
                return BadRequest(new { message = $"Invalid scopeType: '{scopeType}'. Valid values: Course, Module, Topic, Lesson (ContentItem)." });
        }

        // Cap the combined excerpt payload so it stays usable as LLM prompt-grounding context rather
        // than a full document dump, while keeping the shape as a list of distinct excerpt strings
        // (the contract tool_get_content_by_scope expects), not one giant blob.
        var excerpts = new List<string>();
        var totalChars = 0;
        foreach (var part in excerptParts.Where(p => !string.IsNullOrWhiteSpace(p)))
        {
            if (totalChars >= MaxExcerptChars) break;
            var remaining = MaxExcerptChars - totalChars;
            var piece = part.Length > remaining ? part.Substring(0, remaining) + "..." : part;
            excerpts.Add(piece);
            totalChars += piece.Length;
        }

        // Deterministic content hash (not cryptographically meaningful here, just a stable fingerprint
        // of what was actually returned) so callers can detect when grounding content has changed.
        var sourceHash = "sha256-" + Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(title + "|" + string.Join("|", excerpts)))
        )[..12].ToLowerInvariant();

        return Ok(new
        {
            scopeType,
            scopeId,
            title,
            excerpts,
            sourceHash
        });
    }

    // -------------------------------------------------------------------------
    // 3. EXISTING QUESTION PROMPTS FOR A SCOPE (duplicate-avoidance grounding)
    // Consumed by tool_get_existing_questions, which reads: existingQuestions (list of strings).
    // -------------------------------------------------------------------------

    [HttpGet("assessments/existing-questions")]
    public async Task<IActionResult> GetExistingQuestions([FromQuery] Guid scopeId, CancellationToken ct)
    {
        var prompts = await _dbContext.Assessments
            .Where(a => a.ScopeId == scopeId)
            .SelectMany(a => a.Questions.Select(q => q.Prompt))
            .Distinct()
            .Take(MaxExistingQuestions)
            .ToListAsync(ct);

        return Ok(new
        {
            scopeId,
            existingQuestions = prompts
        });
    }

    // -------------------------------------------------------------------------
    // 4. STUDENT PROGRESS (enrollments, per-course completion, XP, streak)
    // Consumed by tool_get_student_progress, which reads: studentId, completionRatePct,
    // completedLessons (list of id strings), activeStreak, weeklyXp, timeOnTaskMinutes.
    // -------------------------------------------------------------------------

    [HttpGet("students/{studentId:guid}/progress")]
    public async Task<IActionResult> GetStudentProgress(Guid studentId, CancellationToken ct)
    {
        var studentExists = await _dbContext.Users.AnyAsync(u => u.Id == studentId, ct);
        if (!studentExists)
        {
            return NotFound(new { message = "Student not found." });
        }

        var enrollments = await _dbContext.Enrollments
            .Where(e => e.StudentId == studentId)
            .Include(e => e.Course)
                .ThenInclude(c => c!.Modules)
                    .ThenInclude(m => m.Lessons)
            .ToListAsync(ct);

        var allLessons = enrollments
            .SelectMany(e => e.Course?.Modules.SelectMany(m => m.Lessons) ?? Enumerable.Empty<Lesson>())
            .ToList();
        var allLessonIds = allLessons.Select(l => l.Id).ToHashSet();

        var completedLessonIds = allLessonIds.Count > 0
            ? (await _dbContext.LessonCompletions
                .Where(lc => lc.StudentId == studentId && lc.LessonId != null && allLessonIds.Contains(lc.LessonId.Value))
                .Select(lc => lc.LessonId!.Value)
                .ToListAsync(ct)).ToHashSet()
            : new HashSet<Guid>();

        var courses = enrollments.Select(e =>
        {
            var lessonIds = e.Course?.Modules.SelectMany(m => m.Lessons.Select(l => l.Id)).ToList() ?? new List<Guid>();
            var totalLessons = lessonIds.Count;
            var completedLessons = lessonIds.Count(id => completedLessonIds.Contains(id));
            var completionPercentage = totalLessons > 0
                ? Math.Round((double)completedLessons / totalLessons * 100, 1)
                : 0.0;

            return new
            {
                courseId = e.CourseId,
                courseTitle = e.Course?.Title ?? string.Empty,
                status = e.Status.ToString(),
                totalLessons,
                completedLessons,
                completionPercentage
            };
        }).ToList();

        var overallCompletionRatePct = allLessonIds.Count > 0
            ? Math.Round((double)completedLessonIds.Count / allLessonIds.Count * 100, 1)
            : 0.0;

        // Real-data proxy for "time on task": sum of EstimatedMinutes across the student's actually
        // completed lessons (there is no session-duration tracking in the schema to measure directly).
        var timeOnTaskMinutes = (double)allLessons
            .Where(l => completedLessonIds.Contains(l.Id))
            .Sum(l => l.EstimatedMinutes);

        // Real-data proxy for "weekly XP": sum of XpTransaction amounts recorded in the trailing 7 days
        // (the schema has no separate weekly-XP aggregate -- StudentXp.TotalXp is a lifetime total).
        var weekAgo = DateTime.UtcNow.AddDays(-7);
        var weeklyXp = await _dbContext.XpTransactions
            .Where(x => x.StudentId == studentId && x.CreatedAt >= weekAgo)
            .SumAsync(x => x.XpAmount, ct);

        // StudentXp / StudentStreak are optional aggregate rows -- a real student may legitimately not
        // have one yet, so fall back to sensible zero-defaults rather than 404ing the whole endpoint.
        var studentXp = await _dbContext.StudentXp.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        var studentStreak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);

        return Ok(new
        {
            studentId,
            completionRatePct = overallCompletionRatePct,
            completedLessons = completedLessonIds.Select(id => id.ToString()).ToList(),
            activeStreak = studentStreak?.CurrentStreak ?? 0,
            weeklyXp,
            timeOnTaskMinutes,
            // Bonus fields (not read by registry.py's _pick, but useful/complete):
            enrollmentCount = enrollments.Count,
            courses,
            totalXp = studentXp?.TotalXp ?? 0,
            currentLevel = studentXp?.CurrentLevel ?? 1,
            coins = studentXp?.Coins ?? 0,
            longestStreak = studentStreak?.LongestStreak ?? 0
        });
    }

    // -------------------------------------------------------------------------
    // 5. RECENT QUIZ / ASSESSMENT SUBMISSION HISTORY
    // Consumed by tool_get_quiz_results, which reads: studentId, recentQuizzes[].quizId/topic/
    // scorePct/mistakes, overallAccuracyPct.
    // -------------------------------------------------------------------------

    [HttpGet("students/{studentId:guid}/quiz-results")]
    public async Task<IActionResult> GetStudentQuizResults(Guid studentId, CancellationToken ct)
    {
        var studentExists = await _dbContext.Users.AnyAsync(u => u.Id == studentId, ct);
        if (!studentExists)
        {
            return NotFound(new { message = "Student not found." });
        }

        var submissions = await _dbContext.Submissions
            .Where(s => s.StudentId == studentId)
            .Include(s => s.Assessment)
            .Include(s => s.Answers)
                .ThenInclude(a => a.Question)
            .OrderByDescending(s => s.SubmittedAt)
            .Take(MaxQuizResults)
            .ToListAsync(ct);

        var recentQuizzes = submissions.Select(s => new
        {
            quizId = s.AssessmentId,
            quizTitle = s.Assessment != null ? s.Assessment.Title : "Quiz",
            topic = s.Assessment != null ? s.Assessment.Title : "Quiz",
            scorePct = s.PercentageScore,
            passed = s.Passed,
            submittedAt = s.SubmittedAt,
            // Real wrong-answer grounding for remediation: the actual prompts the student missed.
            mistakes = s.Answers
                .Where(a => !a.IsCorrect && a.Question != null)
                .Select(a => a.Question!.Prompt)
                .ToList()
        }).ToList();

        // Overall accuracy is computed across the student's full submission history (not just the
        // capped recent-20 list above) so it reflects a genuine long-run accuracy figure.
        var overallAccuracyPct = await _dbContext.Submissions
            .Where(s => s.StudentId == studentId)
            .Select(s => (double?)s.PercentageScore)
            .AverageAsync(ct) ?? 0.0;

        return Ok(new
        {
            studentId,
            recentQuizzes,
            overallAccuracyPct = Math.Round(overallAccuracyPct, 1)
        });
    }

    // -------------------------------------------------------------------------
    // 6. GAMIFICATION ECONOMY RULES (level curve, XP/coin reward constants, badges)
    // Consumed by tool_get_gamification_rules, which reads flat keys: topicQuizXp, lessonQuizXp,
    // moduleQuizXp, courseQuizXp, bossChallengeXp, maxActivityXp, maxChallengeXp, maxChallengeCoins,
    // minStudyHoursPerWeek, maxStudyHoursPerWeek, streakShieldThresholdDays, xpPerLevelBase.
    // Only the first six have a genuine authoritative source in this codebase (GamificationService's
    // scope-based base XP map and QuizzesController.ValidateQuiz's XP hard cap); the rest have no
    // enforced constant anywhere in EduFlow.Api/Infrastructure, so they are deliberately left out of
    // this response and registry.py's own hardcoded fallback applies for them instead of us inventing
    // a number that isn't real.
    // -------------------------------------------------------------------------

    [HttpGet("gamification/rules")]
    public async Task<IActionResult> GetGamificationRules(CancellationToken ct)
    {
        var levelTiers = LevelCurve.Tiers.Select(t => new
        {
            level = t.Level,
            name = t.Name,
            minXp = t.MinXp,
            maxXp = t.MaxXp,
            rewardCoins = t.RewardCoins,
            badgeIcon = t.BadgeIcon
        }).ToList();

        var badges = await _dbContext.Badges
            .Select(b => new
            {
                id = b.Id,
                title = b.Title,
                description = b.Description,
                category = b.Category.ToString(),
                xpBonus = b.XpBonus
            })
            .ToListAsync(ct);

        return Ok(new
        {
            // Exact keys tool_get_gamification_rules reads, mirroring GamificationService's
            // scope-based base XP map (CalculateAndAwardQuizRewardAsync) and the XP hard cap enforced
            // in QuizzesController.ValidateQuiz.
            topicQuizXp = 30,
            lessonQuizXp = 35, // "lesson" here = ContentItem-scoped quiz, per the platform's own scope naming
            moduleQuizXp = 75,
            courseQuizXp = 150,
            bossChallengeXp = 200,
            maxActivityXp = 250, // QuizzesController.ValidateQuiz: XP Reward hard cap per assessment

            // Bonus fields (not read by registry.py's _pick, but real and useful for fuller grounding):
            levelTiers,
            badges,
            difficultyBonus = new { easy = 0, medium = 10, hard = 20, boss = 30 },
            passBonusAt70Percent = 20,
            highScoreBonus = new { perfectScore100 = 40, scoreAtLeast90 = 20, scoreAtLeast80 = 10 },
            streakBonusByCurrentStreakDays = new { atLeast30 = 150, atLeast14 = 60, atLeast7 = 30, atLeast3 = 10, atLeast1 = 5 },
            levelUpBonusCoinsPerLevel = 50,
            dailyMissionGrandRewardXp = 150,
            dailyMissionGrandRewardCoins = 30
        });
    }
}
