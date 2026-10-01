using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CanonicalContentTreeAndProgress : Migration
    {
        /// <inheritdoc />
        /// <remarks>
        /// Non-destructive: the legacy Lessons table and LessonCompletions.LessonId are left in place
        /// (read-only) until the legacy-removal migration. Down does not delete the copied rows.
        /// </remarks>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LessonCompletions_StudentId",
                table: "LessonCompletions");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "Enrollments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFreePreview",
                table: "ContentItems",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("""
                -- Lessons become content items with the SAME Id, so URLs, client state, XP ledger
                -- references and completions keep pointing at the same learning unit.
                INSERT INTO "ContentItems" ("Id", "ModuleId", "TopicId", "ParentContentId", "Title", "Content",
                    "ContentType", "DisplayOrder", "EstimatedMinutes", "XpReward", "VideoUrl", "PdfUrl",
                    "AttachmentFileName", "Status", "IsFreePreview", "CreatedAt", "UpdatedAt")
                SELECT l."Id", l."ModuleId", NULL, NULL, l."Title", l."Content",
                    'Lesson', l."OrderIndex", l."EstimatedMinutes", l."XpReward", l."VideoUrl", l."PdfUrl",
                    l."AttachmentFileName", 'Published', l."IsFreePreview", l."CreatedAt", l."UpdatedAt"
                FROM "Lessons" l
                WHERE NOT EXISTS (SELECT 1 FROM "ContentItems" ci WHERE ci."Id" = l."Id");

                UPDATE "LessonCompletions" SET "ContentItemId" = "LessonId"
                WHERE "ContentItemId" IS NULL AND "LessonId" IS NOT NULL;

                -- Keep only the earliest completion of each item per student (duplicates carry no information).
                DELETE FROM "LessonCompletions" a
                USING "LessonCompletions" b
                WHERE a."StudentId" = b."StudentId"
                  AND a."ContentItemId" = b."ContentItemId"
                  AND a."ContentItemId" IS NOT NULL
                  AND (a."CompletedAt", a."Id") > (b."CompletedAt", b."Id");
                """);

            migrationBuilder.CreateIndex(
                name: "IX_LessonCompletions_StudentId_ContentItemId",
                table: "LessonCompletions",
                columns: new[] { "StudentId", "ContentItemId" },
                unique: true,
                filter: "\"ContentItemId\" IS NOT NULL");

            migrationBuilder.Sql("""
                -- Replace cached (previously seeded or never-updated) progress with the canonical
                -- formula: completed published content items + passed published assessments over
                -- all published content items and assessments of the course.
                UPDATE "Enrollments" e SET "ProgressPercentage" = COALESCE(ROUND(100.0 * (
                      (SELECT COUNT(*) FROM "ContentItems" ci JOIN "Modules" m ON m."Id" = ci."ModuleId"
                       WHERE m."CourseId" = e."CourseId" AND ci."Status" = 'Published'
                         AND EXISTS (SELECT 1 FROM "LessonCompletions" lc
                                     WHERE lc."StudentId" = e."StudentId" AND lc."ContentItemId" = ci."Id"))
                    + (SELECT COUNT(*) FROM "Assessments" a
                       WHERE a."CourseId" = e."CourseId" AND a."Status" = 'Published'
                         AND EXISTS (SELECT 1 FROM "Submissions" s
                                     WHERE s."AssessmentId" = a."Id" AND s."StudentId" = e."StudentId"
                                       AND s."Status" = 'Evaluated' AND s."Passed"))
                  )::numeric / NULLIF(
                      (SELECT COUNT(*) FROM "ContentItems" ci JOIN "Modules" m ON m."Id" = ci."ModuleId"
                       WHERE m."CourseId" = e."CourseId" AND ci."Status" = 'Published')
                    + (SELECT COUNT(*) FROM "Assessments" a
                       WHERE a."CourseId" = e."CourseId" AND a."Status" = 'Published'), 0), 2), 0);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LessonCompletions_StudentId_ContentItemId",
                table: "LessonCompletions");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "IsFreePreview",
                table: "ContentItems");

            migrationBuilder.CreateIndex(
                name: "IX_LessonCompletions_StudentId",
                table: "LessonCompletions",
                column: "StudentId");
        }
    }
}
