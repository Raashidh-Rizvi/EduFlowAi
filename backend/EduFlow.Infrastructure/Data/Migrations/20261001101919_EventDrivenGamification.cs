using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class EventDrivenGamification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CoinAmount",
                table: "XpTransactions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "XpTransactions",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Criteria",
                table: "Badges",
                type: "text",
                nullable: false,
                defaultValue: "None");

            migrationBuilder.AddColumn<int>(
                name: "Threshold",
                table: "Badges",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "GamificationRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Value = table.Column<decimal>(type: "numeric(12,4)", precision: 12, scale: 4, nullable: false),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GamificationRules", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "CHALLENGE_CHAMPION",
                columns: new[] { "Criteria", "Description", "Threshold" },
                values: new object[] { "ChallengesCompleted", "Completed 5 challenges", 5 });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "FIRST_LESSON",
                columns: new[] { "Criteria", "Threshold" },
                values: new object[] { "LessonsCompleted", 1 });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "QUIZ_MASTER",
                columns: new[] { "Criteria", "Description", "Threshold" },
                values: new object[] { "AssessmentsPassed", "Passed 5 different assessments", 5 });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SEVEN_DAY_STREAK",
                columns: new[] { "Criteria", "Threshold" },
                values: new object[] { "StreakDays", 7 });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SQUAD_GOALS",
                columns: new[] { "Criteria", "Threshold" },
                values: new object[] { "TeamMemberships", 1 });

            // Older code created some of these badges at runtime, so they are upserted, not inserted.
            migrationBuilder.Sql("""
                INSERT INTO "Badges" ("Id", "Category", "CreatedAt", "Criteria", "Description", "IconUrl", "Threshold", "Title", "XpBonus")
                VALUES
                    ('BOSS_SLAYER', 'Challenge', TIMESTAMPTZ '2026-01-01 00:00:00+00', 'BossAssessmentsPassed', 'Passed a Boss-difficulty assessment', '⚔️', 1, 'Boss Slayer', 200),
                    ('COMEBACK_KID', 'Improvement', TIMESTAMPTZ '2026-01-01 00:00:00+00', 'ImprovementBonusesEarned', 'Beat your own best score on an assessment', '📈', 1, 'Comeback Kid', 80),
                    ('COURSE_GRADUATE', 'Milestone', TIMESTAMPTZ '2026-01-01 00:00:00+00', 'CoursesCompleted', 'Completed every unit of a course', '🎓', 1, 'Course Graduate', 250),
                    ('FOURTEEN_DAY_STREAK', 'Streak', TIMESTAMPTZ '2026-01-01 00:00:00+00', 'StreakDays', 'Maintained a continuous 14-day study streak', '⚡', 14, '14-Day Streak', 150),
                    ('PERFECT_SCORE', 'Assessment', TIMESTAMPTZ '2026-01-01 00:00:00+00', 'PerfectScores', 'Scored 100% on an assessment', '🎯', 1, 'Perfect Score', 100)
                ON CONFLICT ("Id") DO UPDATE SET
                    "Category" = EXCLUDED."Category",
                    "Criteria" = EXCLUDED."Criteria",
                    "Description" = EXCLUDED."Description",
                    "IconUrl" = EXCLUDED."IconUrl",
                    "Threshold" = EXCLUDED."Threshold",
                    "Title" = EXCLUDED."Title",
                    "XpBonus" = EXCLUDED."XpBonus";
                """);

            migrationBuilder.InsertData(
                table: "GamificationRules",
                columns: new[] { "Id", "CreatedAt", "Description", "Key", "UpdatedAt", "Value" },
                values: new object[,]
                {
                    { new Guid("6a0e1c00-0000-4000-8000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for first completing a topic-level assessment", "quiz.base.topic", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 30m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for first completing a content-item assessment", "quiz.base.content-item", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 35m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for first completing a module-level assessment", "quiz.base.module", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 75m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000004"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for first completing a course-level assessment", "quiz.base.course", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 150m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000005"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for first completing a Boss-difficulty assessment (replaces the scope base)", "quiz.base.boss", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 200m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000006"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Extra XP for an Easy assessment", "quiz.difficulty.easy", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 0m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000007"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Extra XP for a Medium assessment", "quiz.difficulty.medium", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 10m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000008"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Extra XP for a Hard assessment", "quiz.difficulty.hard", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 20m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000009"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Extra XP for a Boss assessment", "quiz.difficulty.boss", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 30m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000010"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for first passing an assessment", "quiz.pass.bonus", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 20m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000011"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Score (%) for the perfect tier", "quiz.high-score.perfect.threshold", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 100m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000012"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for reaching the perfect tier", "quiz.high-score.perfect.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 40m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000013"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Score (%) for the excellent tier", "quiz.high-score.excellent.threshold", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 90m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000014"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for reaching the excellent tier", "quiz.high-score.excellent.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 20m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000015"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Score (%) for the great tier", "quiz.high-score.great.threshold", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 80m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000016"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for reaching the great tier", "quiz.high-score.great.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 10m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000017"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Streak days for tier 1", "quiz.streak.tier1.days", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 30m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000018"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for tier 1 streak", "quiz.streak.tier1.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 150m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000019"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Streak days for tier 2", "quiz.streak.tier2.days", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 14m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000020"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for tier 2 streak", "quiz.streak.tier2.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 60m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000021"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Streak days for tier 3", "quiz.streak.tier3.days", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 7m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000022"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for tier 3 streak", "quiz.streak.tier3.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 30m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000023"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Streak days for tier 4", "quiz.streak.tier4.days", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 3m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000024"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for tier 4 streak", "quiz.streak.tier4.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 10m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000025"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Streak days for tier 5", "quiz.streak.tier5.days", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000026"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for tier 5 streak", "quiz.streak.tier5.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 5m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000027"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Minimum personal-best improvement XP", "quiz.improvement.min-xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 10m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000028"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Maximum personal-best improvement XP", "quiz.improvement.max-xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 50m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000029"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Assessment coins = XP / divisor", "coins.quiz.xp-divisor", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 4m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000030"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Minimum coins for an assessment award", "coins.quiz.minimum", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 5m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000031"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Lesson/challenge coins = XP / divisor (at least 1)", "coins.activity.xp-divisor", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 5m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000032"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Coins on level-up = new level x value", "coins.level-up.per-level", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 50m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000033"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for completing every unit of a course", "course.completed.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 300m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000034"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Coins for completing a course", "course.completed.coins", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 50m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000035"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for the daily 'complete a lesson' mission", "mission.lesson.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 20m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000036"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for the daily practice-questions mission", "mission.practice.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 15m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000037"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Questions answered for the practice mission", "mission.practice.target", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 5m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000038"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for the daily high-score mission", "mission.score.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 30m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000039"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Score (%) needed for the high-score mission", "mission.score.threshold", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 70m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000040"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for the daily challenge mission", "mission.challenge.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 50m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000041"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "XP for claiming all daily missions", "mission.grand.xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 150m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000042"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Coins for claiming all daily missions", "mission.grand.coins", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 30m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000043"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Focus session XP per minute", "focus.xp-per-minute", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1.5m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000044"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Minimum minutes credited for a focus session", "focus.min-minutes", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 5m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000045"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Maximum minutes credited for a focus session", "focus.max-minutes", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 120m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000046"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Minutes for the long-session bonus", "focus.long.threshold-minutes", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 45m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000047"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Long-session bonus XP", "focus.long.bonus-xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 20m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000048"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Minutes for the medium-session bonus", "focus.medium.threshold-minutes", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 25m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000049"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Medium-session bonus XP", "focus.medium.bonus-xp", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 10m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000050"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Focus sessions rewarded per day", "focus.daily-session-limit", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 6m },
                    { new Guid("6a0e1c00-0000-4000-8000-000000000051"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Platform-wide XP multiplier (1 = off)", "xp.multiplier", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1m }
                });

            migrationBuilder.Sql("""
                -- Historical awards get the idempotency key the new ledger uses, so an event that
                -- already paid cannot pay again. Only the earliest row per key receives it.
                UPDATE "XpTransactions" x SET "IdempotencyKey" = k.key
                FROM (
                    SELECT DISTINCT ON ("StudentId", key) "Id", key
                    FROM (
                        SELECT "Id", "StudentId", "CreatedAt",
                            CASE "SourceType"
                                WHEN 'QuizCompleted' THEN 'quiz-completed:' || "SourceId"
                                WHEN 'PassBonus' THEN 'quiz-passed:' || "SourceId"
                                WHEN 'StreakBonus' THEN 'quiz-streak:' || "SourceId"
                                WHEN 'LessonCompleted' THEN 'LessonCompleted:' || "SourceId"
                                WHEN 'DailyChallenge' THEN 'DailyChallenge:' || "SourceId"
                            END AS key
                        FROM "XpTransactions") t
                    WHERE key IS NOT NULL
                    ORDER BY "StudentId", key, "CreatedAt", "Id") k
                WHERE x."Id" = k."Id";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_XpTransactions_StudentId_IdempotencyKey",
                table: "XpTransactions",
                columns: new[] { "StudentId", "IdempotencyKey" },
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_XpTransactions_NonNegative",
                table: "XpTransactions",
                sql: "\"XpAmount\" >= 0 AND \"CoinAmount\" >= 0");

            migrationBuilder.Sql("""
                -- Before this ledger, coins (and some XP) changed without a ledger row. One opening
                -- balance row per student makes the ledger sum equal the profile totals.
                INSERT INTO "XpTransactions" ("Id", "StudentId", "SourceType", "SourceId", "XpAmount", "CoinAmount",
                    "Description", "IdempotencyKey", "CreatedAt", "UpdatedAt")
                SELECT gen_random_uuid(), p."StudentId", 'DailyMissionGrandBonus', p."StudentId",
                    GREATEST(p."TotalXp" - COALESCE(l.xp, 0), 0), GREATEST(p."Coins" - COALESCE(l.coins, 0), 0),
                    'Opening balance carried over from before the points ledger', 'opening-balance',
                    now() AT TIME ZONE 'utc', now() AT TIME ZONE 'utc'
                FROM "StudentXp" p
                LEFT JOIN (
                    SELECT "StudentId", SUM("XpAmount") AS xp, SUM("CoinAmount") AS coins
                    FROM "XpTransactions" GROUP BY "StudentId") l ON l."StudentId" = p."StudentId"
                WHERE p."TotalXp" > COALESCE(l.xp, 0) OR p."Coins" > COALESCE(l.coins, 0);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_GamificationRules_Key",
                table: "GamificationRules",
                column: "Key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GamificationRules");

            migrationBuilder.DropIndex(
                name: "IX_XpTransactions_StudentId_IdempotencyKey",
                table: "XpTransactions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_XpTransactions_NonNegative",
                table: "XpTransactions");

            migrationBuilder.DropColumn(
                name: "CoinAmount",
                table: "XpTransactions");

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                table: "XpTransactions");

            migrationBuilder.DropColumn(
                name: "Criteria",
                table: "Badges");

            migrationBuilder.DropColumn(
                name: "Threshold",
                table: "Badges");

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "CHALLENGE_CHAMPION",
                column: "Description",
                value: "Completed 5 daily challenges or boss encounters");

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "QUIZ_MASTER",
                column: "Description",
                value: "Achieved 100% on any interactive quiz");
        }
    }
}
