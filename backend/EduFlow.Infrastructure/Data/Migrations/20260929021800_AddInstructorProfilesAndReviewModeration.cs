using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddInstructorProfilesAndReviewModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "RequestedAt",
                table: "Enrollments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewNotes",
                table: "Enrollments",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "Enrollments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReviewedByInstructorId",
                table: "Enrollments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModeratedAt",
                table: "CourseReviews",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ModeratedById",
                table: "CourseReviews",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "CourseReviews",
                type: "text",
                nullable: false,
                defaultValue: "Approved");

            migrationBuilder.CreateTable(
                name: "InstructorProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Headline = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Bio = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Expertise = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    WebsiteUrl = table.Column<string>(type: "text", nullable: true),
                    LinkedInUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstructorProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InstructorProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "CHALLENGE_CHAMPION",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1612));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "FIRST_LESSON",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1595));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "QUIZ_MASTER",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1605));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SEVEN_DAY_STREAK",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1608));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SQUAD_GOALS",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1615));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1877), new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1878) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1889), new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1890) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1897), new DateTime(2026, 9, 29, 2, 17, 54, 444, DateTimeKind.Utc).AddTicks(1897) });

            migrationBuilder.CreateIndex(
                name: "IX_Enrollments_ReviewedByInstructorId",
                table: "Enrollments",
                column: "ReviewedByInstructorId");

            migrationBuilder.CreateIndex(
                name: "IX_Enrollments_Status",
                table: "Enrollments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CourseReviews_CourseId_Status",
                table: "CourseReviews",
                columns: new[] { "CourseId", "Status" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_CourseReviews_Rating_Range",
                table: "CourseReviews",
                sql: "\"Rating\" >= 1 AND \"Rating\" <= 5");

            migrationBuilder.CreateIndex(
                name: "IX_InstructorProfiles_UserId",
                table: "InstructorProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Enrollments_Users_ReviewedByInstructorId",
                table: "Enrollments",
                column: "ReviewedByInstructorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Enrollments_Users_ReviewedByInstructorId",
                table: "Enrollments");

            migrationBuilder.DropTable(
                name: "InstructorProfiles");

            migrationBuilder.DropIndex(
                name: "IX_Enrollments_ReviewedByInstructorId",
                table: "Enrollments");

            migrationBuilder.DropIndex(
                name: "IX_Enrollments_Status",
                table: "Enrollments");

            migrationBuilder.DropIndex(
                name: "IX_CourseReviews_CourseId_Status",
                table: "CourseReviews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CourseReviews_Rating_Range",
                table: "CourseReviews");

            migrationBuilder.DropColumn(
                name: "RequestedAt",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "ReviewNotes",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "ReviewedByInstructorId",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "ModeratedAt",
                table: "CourseReviews");

            migrationBuilder.DropColumn(
                name: "ModeratedById",
                table: "CourseReviews");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "CourseReviews");

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
        }
    }
}
