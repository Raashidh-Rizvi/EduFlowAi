using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CanonicalAssessmentPlacementAndAttempts : Migration
    {
        /// <inheritdoc />
        /// <remarks>
        /// Hand-edited after scaffolding so that no data is lost:
        /// <list type="bullet">
        /// <item>ModuleScopeId/TopicScopeId are renamed (not dropped) to ModuleId/TopicId and backfilled
        /// from the legacy polymorphic ScopeId. Course-level assessments move to their course's first
        /// module; a course with assessments but no modules gets a "Course Assessments" module.</item>
        /// <item>Existing submissions become Evaluated attempts numbered by submission time, and their
        /// answers record MaxMarks from the question (never below marks already awarded).</item>
        /// <item>The demo users/XP/streak rows that older migrations seeded are left in place: removing
        /// them from the model stops new databases receiving them, while deleting them here would
        /// cascade to real enrollments and submissions. Disable those accounts manually outside
        /// Development.</item>
        /// </list>
        /// </remarks>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assessments_ContentItems_ContentItemScopeId",
                table: "Assessments");

            migrationBuilder.DropForeignKey(
                name: "FK_Assessments_Modules_ModuleScopeId",
                table: "Assessments");

            migrationBuilder.DropForeignKey(
                name: "FK_Assessments_Topics_TopicScopeId",
                table: "Assessments");

            migrationBuilder.DropForeignKey(
                name: "FK_Submissions_Assessments_AssessmentId",
                table: "Submissions");

            // Superseded by the unique (AssessmentId, StudentId, AttemptNumber) and
            // (SubmissionId, QuestionId) indexes below, which lead with the same column.
            migrationBuilder.DropIndex(
                name: "IX_Submissions_AssessmentId",
                table: "Submissions");

            migrationBuilder.DropIndex(
                name: "IX_SubmissionAnswers_SubmissionId",
                table: "SubmissionAnswers");

            // --- Assessment placement: Module (required) / Topic (optional) -------------
            migrationBuilder.RenameColumn(
                name: "ModuleScopeId",
                table: "Assessments",
                newName: "ModuleId");

            migrationBuilder.RenameIndex(
                name: "IX_Assessments_ModuleScopeId",
                table: "Assessments",
                newName: "IX_Assessments_ModuleId");

            migrationBuilder.RenameColumn(
                name: "TopicScopeId",
                table: "Assessments",
                newName: "TopicId");

            migrationBuilder.RenameIndex(
                name: "IX_Assessments_TopicScopeId",
                table: "Assessments",
                newName: "IX_Assessments_TopicId");

            migrationBuilder.Sql("""
                -- Targets recorded only in the legacy polymorphic ScopeId
                UPDATE "Assessments" a SET "TopicId" = a."ScopeId"
                FROM "Topics" t
                WHERE a."TopicId" IS NULL AND a."ScopeType" = 'Topic' AND t."Id" = a."ScopeId";

                UPDATE "Assessments" a SET "ContentItemScopeId" = a."ScopeId"
                FROM "ContentItems" ci
                WHERE a."ContentItemScopeId" IS NULL AND a."ScopeType" = 'ContentItem' AND ci."Id" = a."ScopeId";

                UPDATE "Assessments" a SET "ModuleId" = a."ScopeId"
                FROM "Modules" m
                WHERE a."ModuleId" IS NULL AND a."ScopeType" = 'Module'
                  AND m."Id" = a."ScopeId" AND m."CourseId" = a."CourseId";

                -- Content-item and topic targets determine their module
                UPDATE "Assessments" a SET "ModuleId" = ci."ModuleId", "TopicId" = COALESCE(a."TopicId", ci."TopicId")
                FROM "ContentItems" ci
                WHERE a."ModuleId" IS NULL AND ci."Id" = a."ContentItemScopeId";

                UPDATE "Assessments" a SET "ModuleId" = t."ModuleId"
                FROM "Topics" t
                WHERE a."ModuleId" IS NULL AND t."Id" = a."TopicId";

                -- Course-level assessments: courses without any module get a holding module
                INSERT INTO "Modules" ("Id", "CourseId", "Title", "Description", "OrderIndex", "Status", "CreatedAt", "UpdatedAt")
                SELECT gen_random_uuid(), c."Id", 'Course Assessments',
                       'Created by migration for assessments that previously had no module.',
                       1, 'Published', now() AT TIME ZONE 'utc', now() AT TIME ZONE 'utc'
                FROM "Courses" c
                WHERE EXISTS (SELECT 1 FROM "Assessments" a WHERE a."CourseId" = c."Id" AND a."ModuleId" IS NULL)
                  AND NOT EXISTS (SELECT 1 FROM "Modules" m WHERE m."CourseId" = c."Id");

                UPDATE "Assessments" a SET "ModuleId" = (
                    SELECT m."Id" FROM "Modules" m
                    WHERE m."CourseId" = a."CourseId"
                    ORDER BY m."OrderIndex", m."CreatedAt"
                    LIMIT 1)
                WHERE a."ModuleId" IS NULL;

                -- Keep the legacy API view (ScopeType/ScopeId) consistent with the placement
                UPDATE "Assessments" SET "ScopeType" = 'Module', "ScopeId" = "ModuleId"
                WHERE "ScopeType" = 'Course'
                   OR ("ScopeType" = 'Topic' AND "TopicId" IS NULL)
                   OR ("ScopeType" = 'ContentItem' AND "ContentItemScopeId" IS NULL)
                   OR ("ScopeType" = 'Module' AND "ScopeId" IS DISTINCT FROM "ModuleId");
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "ModuleId",
                table: "Assessments",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            // --- Attempts ------------------------------------------------------------------
            migrationBuilder.AlterColumn<DateTime>(
                name: "SubmittedAt",
                table: "Submissions",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<int>(
                name: "AttemptNumber",
                table: "Submissions",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<DateTime>(
                name: "EvaluatedAt",
                table: "Submissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "Submissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Submissions",
                type: "text",
                nullable: false,
                defaultValue: "Evaluated");

            migrationBuilder.AddColumn<string>(
                name: "EvaluationMethod",
                table: "SubmissionAnswers",
                type: "text",
                nullable: false,
                defaultValue: "Deterministic");

            migrationBuilder.AddColumn<string>(
                name: "EvaluationStatus",
                table: "SubmissionAnswers",
                type: "text",
                nullable: false,
                defaultValue: "Evaluated");

            migrationBuilder.AddColumn<string>(
                name: "Feedback",
                table: "SubmissionAnswers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxMarks",
                table: "SubmissionAnswers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("""
                -- Every legacy submission was graded synchronously: it is an Evaluated attempt
                UPDATE "Submissions" s
                SET "AttemptNumber" = r.rn, "EvaluatedAt" = s."SubmittedAt"
                FROM (
                    SELECT "Id", ROW_NUMBER() OVER (
                        PARTITION BY "AssessmentId", "StudentId" ORDER BY "SubmittedAt", "Id") AS rn
                    FROM "Submissions") r
                WHERE r."Id" = s."Id";

                UPDATE "SubmissionAnswers" sa
                SET "MaxMarks" = GREATEST(q."Points", sa."PointsAwarded")
                FROM "Questions" q
                WHERE q."Id" = sa."QuestionId";
                """);

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "CHALLENGE_CHAMPION",
                column: "CreatedAt",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "FIRST_LESSON",
                column: "CreatedAt",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "QUIZ_MASTER",
                column: "CreatedAt",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SEVEN_DAY_STREAK",
                column: "CreatedAt",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SQUAD_GOALS",
                column: "CreatedAt",
                value: new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc));

            // --- Integrity -----------------------------------------------------------------
            migrationBuilder.CreateIndex(
                name: "IX_Submissions_AssessmentId_StudentId_AttemptNumber",
                table: "Submissions",
                columns: new[] { "AssessmentId", "StudentId", "AttemptNumber" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Submissions_AttemptNumber_Positive",
                table: "Submissions",
                sql: "\"AttemptNumber\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Submissions_Percentage_Range",
                table: "Submissions",
                sql: "\"PercentageScore\" >= 0 AND \"PercentageScore\" <= 100");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Submissions_Score_Range",
                table: "Submissions",
                sql: "\"ScoreObtained\" >= 0 AND \"ScoreObtained\" <= \"MaxScore\"");

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionAnswers_SubmissionId_QuestionId",
                table: "SubmissionAnswers",
                columns: new[] { "SubmissionId", "QuestionId" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_SubmissionAnswers_Marks_Range",
                table: "SubmissionAnswers",
                sql: "\"PointsAwarded\" >= 0 AND \"PointsAwarded\" <= \"MaxMarks\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Questions_Points_Positive",
                table: "Questions",
                sql: "\"Points\" > 0");

            migrationBuilder.AddForeignKey(
                name: "FK_Assessments_ContentItems_ContentItemScopeId",
                table: "Assessments",
                column: "ContentItemScopeId",
                principalTable: "ContentItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Assessments_Modules_ModuleId",
                table: "Assessments",
                column: "ModuleId",
                principalTable: "Modules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Assessments_Topics_TopicId",
                table: "Assessments",
                column: "TopicId",
                principalTable: "Topics",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Academic history blocks deletion of the assessment (and its module/course).
            migrationBuilder.AddForeignKey(
                name: "FK_Submissions_Assessments_AssessmentId",
                table: "Submissions",
                column: "AssessmentId",
                principalTable: "Assessments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        /// <remarks>Attempt status/numbering and per-answer evaluation details are discarded.</remarks>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assessments_ContentItems_ContentItemScopeId",
                table: "Assessments");

            migrationBuilder.DropForeignKey(
                name: "FK_Assessments_Modules_ModuleId",
                table: "Assessments");

            migrationBuilder.DropForeignKey(
                name: "FK_Assessments_Topics_TopicId",
                table: "Assessments");

            migrationBuilder.DropForeignKey(
                name: "FK_Submissions_Assessments_AssessmentId",
                table: "Submissions");

            migrationBuilder.DropIndex(
                name: "IX_Submissions_AssessmentId_StudentId_AttemptNumber",
                table: "Submissions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Submissions_AttemptNumber_Positive",
                table: "Submissions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Submissions_Percentage_Range",
                table: "Submissions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Submissions_Score_Range",
                table: "Submissions");

            migrationBuilder.DropIndex(
                name: "IX_SubmissionAnswers_SubmissionId_QuestionId",
                table: "SubmissionAnswers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SubmissionAnswers_Marks_Range",
                table: "SubmissionAnswers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Questions_Points_Positive",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "AttemptNumber",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "EvaluatedAt",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "EvaluationMethod",
                table: "SubmissionAnswers");

            migrationBuilder.DropColumn(
                name: "EvaluationStatus",
                table: "SubmissionAnswers");

            migrationBuilder.DropColumn(
                name: "Feedback",
                table: "SubmissionAnswers");

            migrationBuilder.DropColumn(
                name: "MaxMarks",
                table: "SubmissionAnswers");

            // Unfinished attempts have no SubmittedAt; they are discarded on downgrade.
            migrationBuilder.Sql("""DELETE FROM "Submissions" WHERE "SubmittedAt" IS NULL;""");

            migrationBuilder.AlterColumn<DateTime>(
                name: "SubmittedAt",
                table: "Submissions",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ModuleId",
                table: "Assessments",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.RenameColumn(
                name: "ModuleId",
                table: "Assessments",
                newName: "ModuleScopeId");

            migrationBuilder.RenameIndex(
                name: "IX_Assessments_ModuleId",
                table: "Assessments",
                newName: "IX_Assessments_ModuleScopeId");

            migrationBuilder.RenameColumn(
                name: "TopicId",
                table: "Assessments",
                newName: "TopicScopeId");

            migrationBuilder.RenameIndex(
                name: "IX_Assessments_TopicId",
                table: "Assessments",
                newName: "IX_Assessments_TopicScopeId");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_AssessmentId",
                table: "Submissions",
                column: "AssessmentId");

            migrationBuilder.CreateIndex(
                name: "IX_SubmissionAnswers_SubmissionId",
                table: "SubmissionAnswers",
                column: "SubmissionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assessments_ContentItems_ContentItemScopeId",
                table: "Assessments",
                column: "ContentItemScopeId",
                principalTable: "ContentItems",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Assessments_Modules_ModuleScopeId",
                table: "Assessments",
                column: "ModuleScopeId",
                principalTable: "Modules",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Assessments_Topics_TopicScopeId",
                table: "Assessments",
                column: "TopicScopeId",
                principalTable: "Topics",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Submissions_Assessments_AssessmentId",
                table: "Submissions",
                column: "AssessmentId",
                principalTable: "Assessments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
