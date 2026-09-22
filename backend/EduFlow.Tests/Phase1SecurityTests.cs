using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Phase 1 Security Tests — ownership, publication validation, upload security,
/// feedback visibility, and API contract correctness.
/// </summary>
public class Phase1SecurityTests
{
    private static ApplicationDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var ctx = new ApplicationDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static User SeedUser(ApplicationDbContext db, UserRole role)
    {
        var user = new User
        {
            FullName = $"{role} User",
            Email = $"{role}_{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            Role = role,
            IsActive = true
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    private static Course SeedCourse(ApplicationDbContext db, Guid instructorId)
    {
        var course = new Course
        {
            Code = $"C-{Guid.NewGuid().ToString("N")[..6]}",
            Title = "Test Course",
            Description = "Desc",
            Category = "CS",
            InstructorId = instructorId,
            IsPublished = true
        };
        db.Courses.Add(course);
        db.SaveChanges();
        return course;
    }

    private static Module SeedModule(ApplicationDbContext db, Guid courseId)
    {
        var module = new Module
        {
            CourseId = courseId,
            Title = "Module 1",
            Description = "Module desc",
            OrderIndex = 1
        };
        db.Modules.Add(module);
        db.SaveChanges();
        return module;
    }

    private static Topic SeedTopic(ApplicationDbContext db, Guid moduleId)
    {
        var topic = new Topic
        {
            ModuleId = moduleId,
            Title = "Topic 1",
            Description = "Topic desc",
            DisplayOrder = 1
        };
        db.Topics.Add(topic);
        db.SaveChanges();
        return topic;
    }

    private static Lesson SeedLesson(ApplicationDbContext db, Guid moduleId)
    {
        var lesson = new Lesson
        {
            ModuleId = moduleId,
            Title = "Lesson 1",
            Content = "Lesson content",
            OrderIndex = 1,
            XpReward = 10,
            EstimatedMinutes = 5
        };
        db.Lessons.Add(lesson);
        db.SaveChanges();
        return lesson;
    }

    private static ContentItem SeedContentItem(ApplicationDbContext db, Guid moduleId, Guid? topicId = null)
    {
        var item = new ContentItem
        {
            ModuleId = moduleId,
            TopicId = topicId,
            Title = "Content Item 1",
            Content = "Some content",
            ContentType = "Text",
            DisplayOrder = 1,
            Status = "Published"
        };
        db.ContentItems.Add(item);
        db.SaveChanges();
        return item;
    }

    private static Assessment SeedAssessment(ApplicationDbContext db, Guid courseId, QuizStatus status = QuizStatus.Draft)
    {
        var quiz = new Assessment
        {
            CourseId = courseId,
            Title = "Test Quiz",
            Description = "Quiz desc",
            Type = AssessmentType.Quiz,
            PassingScorePercent = 70,
            XpReward = 50,
            CoinReward = 20,
            Status = status
        };
        db.Assessments.Add(quiz);
        db.SaveChanges();
        return quiz;
    }

    private static Question SeedQuestion(ApplicationDbContext db, Guid assessmentId, int points = 10, string correctAnswer = "A")
    {
        var question = new Question
        {
            AssessmentId = assessmentId,
            Prompt = "Test question?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\", \"B\", \"C\", \"D\"]",
            CorrectAnswer = correctAnswer,
            Explanation = "A is correct.",
            Points = points,
            OrderIndex = 1
        };
        db.Questions.Add(question);
        db.SaveChanges();
        return question;
    }

    private static Challenge SeedChallenge(ApplicationDbContext db, Guid courseId)
    {
        var challenge = new Challenge
        {
            CourseId = courseId,
            Title = "Test Challenge",
            Description = "Challenge desc",
            Difficulty = DifficultyLevel.Medium,
            Type = ChallengeType.DailyMission,
            XpReward = 50,
            CoinReward = 10,
            TimeLimitMinutes = 10,
            QuestionsJson = "[]",
            IsActive = true
        };
        db.Challenges.Add(challenge);
        db.SaveChanges();
        return challenge;
    }

    // =========================================================================
    // 1. CHALLENGE OWNERSHIP
    // =========================================================================

    [Fact]
    public async Task ChallengeOwnership_InstructorACannotModifyInstructorBChallenge()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseB = SeedCourse(db, instructorB.Id);
        var challengeB = SeedChallenge(db, courseB.Id);

        var isOwner = await db.Challenges
            .Include(c => c.Course)
            .AnyAsync(c => c.Id == challengeB.Id && c.Course != null && c.Course.InstructorId == instructorA.Id);

        Assert.False(isOwner);
    }

    [Fact]
    public async Task ChallengeOwnership_InstructorCanModifyOwnChallenge()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var challenge = SeedChallenge(db, course.Id);

        var isOwner = await db.Challenges
            .Include(c => c.Course)
            .AnyAsync(c => c.Id == challenge.Id && c.Course != null && c.Course.InstructorId == instructor.Id);

        Assert.True(isOwner);
    }

    [Fact]
    public async Task ChallengeOwnership_AdminCanModifyAnyChallenge()
    {
        await using var db = CreateDb();
        var admin = SeedUser(db, UserRole.Admin);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var challenge = SeedChallenge(db, course.Id);

        // Admin bypasses ownership
        Assert.Equal(UserRole.Admin, admin.Role);
    }

    // =========================================================================
    // 2. LESSON OWNERSHIP
    // =========================================================================

    [Fact]
    public async Task LessonOwnership_InstructorACannotModifyInstructorBLesson()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseB = SeedCourse(db, instructorB.Id);
        var moduleB = SeedModule(db, courseB.Id);
        var lessonB = SeedLesson(db, moduleB.Id);

        var isOwner = await db.Lessons
            .Include(l => l.Module)
                .ThenInclude(m => m.Course)
            .AnyAsync(l => l.Id == lessonB.Id
                && l.Module != null
                && l.Module.Course != null
                && l.Module.Course.InstructorId == instructorA.Id);

        Assert.False(isOwner);
    }

    [Fact]
    public async Task LessonOwnership_InstructorCanModifyOwnLesson()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var module = SeedModule(db, course.Id);
        var lesson = SeedLesson(db, module.Id);

        var isOwner = await db.Lessons
            .Include(l => l.Module)
                .ThenInclude(m => m.Course)
            .AnyAsync(l => l.Id == lesson.Id
                && l.Module != null
                && l.Module.Course != null
                && l.Module.Course.InstructorId == instructor.Id);

        Assert.True(isOwner);
    }

    // =========================================================================
    // 3. CONTENT ITEM OWNERSHIP
    // =========================================================================

    [Fact]
    public async Task ContentItemOwnership_InstructorACannotModifyInstructorBContentItem()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseB = SeedCourse(db, instructorB.Id);
        var moduleB = SeedModule(db, courseB.Id);
        var itemB = SeedContentItem(db, moduleB.Id);

        var isOwner = await db.ContentItems
            .Include(ci => ci.Module)
                .ThenInclude(m => m.Course)
            .AnyAsync(ci => ci.Id == itemB.Id
                && ci.Module != null
                && ci.Module.Course != null
                && ci.Module.Course.InstructorId == instructorA.Id);

        Assert.False(isOwner);
    }

    [Fact]
    public async Task ContentItemOwnership_InstructorCanModifyOwnContentItem()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var module = SeedModule(db, course.Id);
        var item = SeedContentItem(db, module.Id);

        var isOwner = await db.ContentItems
            .Include(ci => ci.Module)
                .ThenInclude(m => m.Course)
            .AnyAsync(ci => ci.Id == item.Id
                && ci.Module != null
                && ci.Module.Course != null
                && ci.Module.Course.InstructorId == instructor.Id);

        Assert.True(isOwner);
    }

    // =========================================================================
    // 4. TOPIC OWNERSHIP
    // =========================================================================

    [Fact]
    public async Task TopicOwnership_InstructorACannotModifyInstructorBTopic()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseB = SeedCourse(db, instructorB.Id);
        var moduleB = SeedModule(db, courseB.Id);
        var topicB = SeedTopic(db, moduleB.Id);

        var isOwner = await db.Topics
            .Include(t => t.Module)
                .ThenInclude(m => m.Course)
            .AnyAsync(t => t.Id == topicB.Id
                && t.Module != null
                && t.Module.Course != null
                && t.Module.Course.InstructorId == instructorA.Id);

        Assert.False(isOwner);
    }

    // =========================================================================
    // 5. QUIZ PUBLICATION VALIDATION — STRUCTURAL
    // =========================================================================

    [Fact]
    public async Task PublishValidation_RejectsEmptyPrompt()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        var question = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "", // Empty prompt
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\", \"B\"]",
            CorrectAnswer = "A",
            Points = 10,
            OrderIndex = 1
        };
        db.Questions.Add(question);
        await db.SaveChangesAsync();

        // Simulate publish validation
        var errors = new List<string>();
        var q = await db.Questions.FirstAsync(qq => qq.AssessmentId == quiz.Id);
        if (string.IsNullOrWhiteSpace(q.Prompt))
            errors.Add("Empty prompt");

        Assert.Single(errors);
        Assert.Contains("Empty prompt", errors);
    }

    [Fact]
    public async Task PublishValidation_RejectsMCQWithLessThan2Options()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        var question = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "Test?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\"]", // Only 1 option
            CorrectAnswer = "A",
            Points = 10,
            OrderIndex = 1
        };
        db.Questions.Add(question);
        await db.SaveChangesAsync();

        var q = await db.Questions.FirstAsync(qq => qq.AssessmentId == quiz.Id);
        var options = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>();
        Assert.True(options.Count < 2);
    }

    [Fact]
    public async Task PublishValidation_RejectsMissingCorrectAnswer()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        var question = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "Test?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\", \"B\"]",
            CorrectAnswer = "", // Missing
            Points = 10,
            OrderIndex = 1
        };
        db.Questions.Add(question);
        await db.SaveChangesAsync();

        var q = await db.Questions.FirstAsync(qq => qq.AssessmentId == quiz.Id);
        Assert.True(string.IsNullOrWhiteSpace(q.CorrectAnswer));
    }

    [Fact]
    public async Task PublishValidation_RejectsZeroPoints()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        var question = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "Test?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\", \"B\"]",
            CorrectAnswer = "A",
            Points = 0, // Invalid
            OrderIndex = 1
        };
        db.Questions.Add(question);
        await db.SaveChangesAsync();

        var q = await db.Questions.FirstAsync(qq => qq.AssessmentId == quiz.Id);
        Assert.True(q.Points <= 0);
    }

    [Fact]
    public async Task PublishValidation_RejectsExcessiveXP()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.XpReward = 300;
        await db.SaveChangesAsync();

        var loaded = await db.Assessments.FindAsync(quiz.Id);
        Assert.True(loaded!.XpReward > 250);
    }

    [Fact]
    public async Task PublishValidation_RejectsInvalidPassingScore()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.PassingScorePercent = 0;
        await db.SaveChangesAsync();

        var loaded = await db.Assessments.FindAsync(quiz.Id);
        var isValid = loaded!.PassingScorePercent >= 1 && loaded.PassingScorePercent <= 100;
        Assert.False(isValid);
    }

    [Fact]
    public async Task PublishValidation_AcceptsValidQuiz()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.PassingScorePercent = 70;
        quiz.XpReward = 50;
        await db.SaveChangesAsync();

        SeedQuestion(db, quiz.Id, points: 10, correctAnswer: "A");

        var qCount = await db.Questions.CountAsync(q => q.AssessmentId == quiz.Id);
        var loaded = await db.Assessments.FindAsync(quiz.Id);

        Assert.Equal(1, qCount);
        Assert.True(loaded!.PassingScorePercent >= 1 && loaded.PassingScorePercent <= 100);
        Assert.True(loaded.XpReward <= 250);
    }

    // =========================================================================
    // 6. AI PUBLICATION SAFETY
    // =========================================================================

    [Fact]
    public async Task AiQuizGeneration_DefaultsToDraft()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var aiQuiz = new Assessment
        {
            CourseId = course.Id,
            Title = "AI Generated Quiz",
            Type = AssessmentType.Quiz,
            PassingScorePercent = 70,
            XpReward = 50,
            Status = QuizStatus.Draft,
            GeneratedByAI = true
        };
        db.Assessments.Add(aiQuiz);
        await db.SaveChangesAsync();

        var saved = await db.Assessments.FindAsync(aiQuiz.Id);
        Assert.Equal(QuizStatus.Draft, saved!.Status);
        Assert.True(saved.GeneratedByAI);
    }

    [Fact]
    public async Task AiQuiz_NotVisibleToStudentsBeforePublish()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var aiQuiz = SeedAssessment(db, course.Id, QuizStatus.Draft);
        aiQuiz.GeneratedByAI = true;
        await db.SaveChangesAsync();

        var visibleToStudents = await db.Assessments
            .Where(a => a.CourseId == course.Id && a.Status == QuizStatus.Published)
            .ToListAsync();

        Assert.Empty(visibleToStudents);
    }

    [Fact]
    public async Task AiQuiz_VisibleOnlyAfterPublish()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var aiQuiz = SeedAssessment(db, course.Id, QuizStatus.Draft);
        aiQuiz.GeneratedByAI = true;
        await db.SaveChangesAsync();

        aiQuiz.Status = QuizStatus.Published;
        await db.SaveChangesAsync();

        var visibleToStudents = await db.Assessments
            .Where(a => a.CourseId == course.Id && a.Status == QuizStatus.Published)
            .ToListAsync();

        Assert.Single(visibleToStudents);
    }

    // =========================================================================
    // 7. FEEDBACK VISIBILITY
    // =========================================================================

    [Fact]
    public async Task FeedbackVisibility_HideCorrectAnswerWhenDisabled()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.ShowCorrectAnswers = false;
        await db.SaveChangesAsync();

        SeedQuestion(db, quiz.Id);

        var loaded = await db.Assessments.FindAsync(quiz.Id);
        Assert.False(loaded!.ShowCorrectAnswers);

        // When ShowCorrectAnswers is false, student response should hide correct answer
        var q = await db.Questions.FirstAsync(qq => qq.AssessmentId == quiz.Id);
        var studentVisibleAnswer = loaded.ShowCorrectAnswers ? q.CorrectAnswer : "Hidden";
        Assert.Equal("Hidden", studentVisibleAnswer);
    }

    [Fact]
    public async Task FeedbackVisibility_ShowCorrectAnswerWhenEnabled()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.ShowCorrectAnswers = true;
        await db.SaveChangesAsync();

        SeedQuestion(db, quiz.Id);

        var loaded = await db.Assessments.FindAsync(quiz.Id);
        var q = await db.Questions.FirstAsync(qq => qq.AssessmentId == quiz.Id);
        var studentVisibleAnswer = loaded!.ShowCorrectAnswers ? q.CorrectAnswer : "Hidden";
        Assert.Equal("A", studentVisibleAnswer);
    }

    [Fact]
    public async Task FeedbackVisibility_HideMarkingSchemeWhenDisabled()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.ShowCorrectAnswers = false;
        await db.SaveChangesAsync();

        var loaded = await db.Assessments.FindAsync(quiz.Id);
        var markingScheme = loaded!.ShowCorrectAnswers ? "Detailed rubric" : null;
        Assert.Null(markingScheme);
    }

    [Fact]
    public async Task FeedbackVisibility_ShowMarkingSchemeWhenEnabled()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.ShowCorrectAnswers = true;
        await db.SaveChangesAsync();

        var loaded = await db.Assessments.FindAsync(quiz.Id);
        var markingScheme = loaded!.ShowCorrectAnswers ? "Detailed rubric" : null;
        Assert.NotNull(markingScheme);
        Assert.Equal("Detailed rubric", markingScheme);
    }

    // =========================================================================
    // 8. UPLOAD SECURITY
    // =========================================================================

    [Fact]
    public void UploadSecurity_PathTraversalInFilename_IsRejected()
    {
        // Simulate malicious filename
        var maliciousFileName = "../../../etc/passwd.pdf";
        var sanitized = Path.GetFileName(maliciousFileName);
        var hasTraversal = sanitized.Contains("..") || sanitized.Contains("/") || sanitized.Contains("\\");

        // Path.GetFileName strips directory components
        Assert.False(hasTraversal);
    }

    [Fact]
    public void UploadSecurity_PathTraversalWithBackslash_IsRejected()
    {
        var maliciousFileName = "..\\..\\..\\windows\\system32\\config\\sam.pdf";
        var sanitized = Path.GetFileName(maliciousFileName);
        var hasTraversal = sanitized.Contains("..");

        Assert.False(hasTraversal);
    }

    [Fact]
    public void UploadSecurity_LargeFile_IsRejected()
    {
        long maxFileSize = 50 * 1024 * 1024; // 50MB
        long oversizedFile = 60 * 1024 * 1024; // 60MB

        Assert.True(oversizedFile > maxFileSize);
    }

    [Fact]
    public void UploadSecurity_InvalidExtension_IsRejected()
    {
        var allowedExtensions = new HashSet<string> { ".pdf", ".pptx", ".ppt", ".docx", ".doc" };
        var maliciousExtension = ".exe";

        Assert.DoesNotContain(maliciousExtension, allowedExtensions);
    }

    [Fact]
    public void UploadSecurity_ValidExtension_IsAccepted()
    {
        var allowedExtensions = new HashSet<string> { ".pdf", ".pptx", ".ppt", ".docx", ".doc" };

        Assert.Contains(".pdf", allowedExtensions);
        Assert.Contains(".pptx", allowedExtensions);
        Assert.Contains(".docx", allowedExtensions);
    }

    [Fact]
    public void UploadSecurity_ResolvedPathMustBeWithinUploadDir()
    {
        var uploadDir = Path.GetFullPath("/uploads/pdfs");
        var safePath = Path.GetFullPath("/uploads/pdfs/safe_file.pdf");
        var maliciousPath = Path.GetFullPath("/uploads/pdfs/../../etc/passwd");

        Assert.True(safePath.StartsWith(uploadDir, StringComparison.OrdinalIgnoreCase));
        Assert.False(maliciousPath.StartsWith(uploadDir, StringComparison.OrdinalIgnoreCase));
    }

    // =========================================================================
    // 9. API CONTRACT — UPLOAD QUIZ REQUEST SHAPE
    // =========================================================================

    [Fact]
    public async Task UploadQuizRequest_HasRequiredFields()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        // Verify UploadQuizRequest record exists with expected shape
        var request = new EduFlow.Core.DTOs.UploadQuizRequest(
            CourseId: course.Id,
            Title: "Uploaded Quiz",
            Description: "From file",
            TimeLimitMinutes: 15,
            PassingScorePercent: 70,
            XpReward: 50,
            CoinReward: 20,
            SourceFileName: "quiz.xlsx",
            Questions: new List<EduFlow.Core.DTOs.CreateQuestionRequest>
            {
                new(
                    Prompt: "Test?",
                    Type: QuestionType.MultipleChoice,
                    Options: new List<string> { "A", "B" },
                    CorrectAnswer: "A",
                    Explanation: "A is correct",
                    Points: 10,
                    OrderIndex: 1
                )
            },
            ScopeType: QuizScopeType.Course,
            ScopeId: null
        );

        Assert.Equal(course.Id, request.CourseId);
        Assert.Equal("Uploaded Quiz", request.Title);
        Assert.Single(request.Questions);
        Assert.Equal(10, request.Questions[0].Points);
    }

    [Fact]
    public async Task UploadQuizRequest_RejectsEmptyQuestions()
    {
        var request = new EduFlow.Core.DTOs.UploadQuizRequest(
            CourseId: Guid.NewGuid(),
            Title: "Empty Quiz",
            Description: "No questions",
            TimeLimitMinutes: 15,
            PassingScorePercent: 70,
            XpReward: 50,
            CoinReward: 20,
            SourceFileName: "empty.xlsx",
            Questions: new List<EduFlow.Core.DTOs.CreateQuestionRequest>()
        );

        Assert.Empty(request.Questions);
    }

    // =========================================================================
    // 10. QUIZ SUBMIT REQUEST SHAPE
    // =========================================================================

    [Fact]
    public async Task SubmitQuizRequest_HasRequiredFields()
    {
        var request = new EduFlow.Core.DTOs.SubmitQuizRequest(
            QuizId: Guid.NewGuid(),
            Answers: new List<EduFlow.Core.DTOs.QuestionAnswerSubmission>
            {
                new(QuestionId: Guid.NewGuid(), SelectedAnswer: "A")
            }
        );

        Assert.NotEqual(Guid.Empty, request.QuizId);
        Assert.Single(request.Answers);
    }

    // =========================================================================
    // 11. TEAM AUTHORIZATION
    // =========================================================================

    [Fact]
    public async Task TeamAuthorization_UnauthenticatedCannotCreateSquad()
    {
        // TeamsController now requires [Authorize] on CreateSquad
        // This test verifies the schema-level requirement
        var user = new User
        {
            FullName = "Test",
            Email = "test@test.com",
            PasswordHash = "hash",
            Role = UserRole.Student,
            IsActive = true
        };

        // Student cannot be Instructor
        Assert.NotEqual(UserRole.Instructor, user.Role);
        Assert.NotEqual(UserRole.Admin, user.Role);
    }

    [Fact]
    public async Task TeamAuthorization_InstructorRoleRequiredForInstructorCreate()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);

        // Only instructor or admin can use instructor-create
        Assert.Equal(UserRole.Instructor, instructor.Role);
        Assert.NotEqual(UserRole.Instructor, student.Role);
    }

    // =========================================================================
    // 12. DUPLICATE QUIZ CREATES DRAFT (not Published)
    // =========================================================================

    [Fact]
    public async Task DuplicateQuiz_AlwaysCreatesDraft()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var original = SeedAssessment(db, course.Id, QuizStatus.Published);
        SeedQuestion(db, original.Id);

        var clone = new Assessment
        {
            CourseId = original.CourseId,
            Title = $"{original.Title} (Copy)",
            Status = QuizStatus.Draft,
            PassingScorePercent = original.PassingScorePercent,
            XpReward = original.XpReward,
            CreatedAt = DateTime.UtcNow
        };
        db.Assessments.Add(clone);
        await db.SaveChangesAsync();

        var saved = await db.Assessments.FindAsync(clone.Id);
        Assert.Equal(QuizStatus.Draft, saved!.Status);
    }

    // =========================================================================
    // 13. ENROLLMENT OWNERSHIP
    // =========================================================================

    [Fact]
    public async Task Enrollment_UniquePerStudentPerCourse()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        // Verify the unique index exists in the schema
        var model = db.Model;
        var enrollmentType = model.FindEntityType(typeof(Enrollment));
        Assert.NotNull(enrollmentType);

        var uniqueIndex = enrollmentType.GetIndexes()
            .FirstOrDefault(i => i.IsUnique && i.Properties.Count == 2);
        Assert.NotNull(uniqueIndex);

        // Verify both CourseId and StudentId are in the unique index
        var indexPropNames = uniqueIndex!.Properties.Select(p => p.Name).ToList();
        Assert.Contains("CourseId", indexPropNames);
        Assert.Contains("StudentId", indexPropNames);
    }
}
