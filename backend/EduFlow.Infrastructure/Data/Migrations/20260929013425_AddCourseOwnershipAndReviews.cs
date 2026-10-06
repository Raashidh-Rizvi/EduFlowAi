using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseOwnershipAndReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "AverageRating",
                table: "Courses",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "DurationHours",
                table: "Courses",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsFree",
                table: "Courses",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "Courses",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "RatingCount",
                table: "Courses",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Term was previously present on the entity but never migrated. Guard it so
            // environments that already backfilled the column do not fail mid-migration.
            migrationBuilder.Sql("""
                ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "Term" text NOT NULL DEFAULT '';
                """);

            migrationBuilder.CreateTable(
                name: "CourseReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseReviews_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CourseReviews_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "CHALLENGE_CHAMPION",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9661));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "FIRST_LESSON",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9643));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "QUIZ_MASTER",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9653));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SEVEN_DAY_STREAK",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9657));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SQUAD_GOALS",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9665));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9859), new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9860) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9873), new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9874) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9883), new DateTime(2026, 9, 29, 1, 34, 19, 323, DateTimeKind.Utc).AddTicks(9884) });

            migrationBuilder.CreateIndex(
                name: "IX_CourseReviews_CourseId_StudentId",
                table: "CourseReviews",
                columns: new[] { "CourseId", "StudentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseReviews_StudentId",
                table: "CourseReviews",
                column: "StudentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CourseReviews");

            migrationBuilder.DropColumn(
                name: "AverageRating",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "DurationHours",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "IsFree",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "RatingCount",
                table: "Courses");

            migrationBuilder.Sql("""
                ALTER TABLE "Courses" DROP COLUMN IF EXISTS "Term";
                """);

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "CHALLENGE_CHAMPION",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 7, 10, 8, 56, 716, DateTimeKind.Utc).AddTicks(3678));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "FIRST_LESSON",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 7, 10, 8, 56, 716, DateTimeKind.Utc).AddTicks(500));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "QUIZ_MASTER",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 7, 10, 8, 56, 716, DateTimeKind.Utc).AddTicks(3670));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SEVEN_DAY_STREAK",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 7, 10, 8, 56, 716, DateTimeKind.Utc).AddTicks(3676));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SQUAD_GOALS",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 7, 10, 8, 56, 716, DateTimeKind.Utc).AddTicks(3680));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 7, 10, 8, 56, 716, DateTimeKind.Utc).AddTicks(9514), new DateTime(2026, 9, 7, 10, 8, 56, 716, DateTimeKind.Utc).AddTicks(9516) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 7, 10, 8, 56, 717, DateTimeKind.Utc).AddTicks(2515), new DateTime(2026, 9, 7, 10, 8, 56, 717, DateTimeKind.Utc).AddTicks(2517) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 7, 10, 8, 56, 717, DateTimeKind.Utc).AddTicks(2525), new DateTime(2026, 9, 7, 10, 8, 56, 717, DateTimeKind.Utc).AddTicks(2526) });
        }
    }
}
