using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseMarketplaceMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFreePreview",
                table: "Lessons",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CertificateEnabled",
                table: "Courses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "Courses",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LearningOutcomesJson",
                table: "Courses",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PrerequisitesJson",
                table: "Courses",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ShortDescription",
                table: "Courses",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TargetAudienceJson",
                table: "Courses",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "XpReward",
                table: "Courses",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "CHALLENGE_CHAMPION",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(3922));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "FIRST_LESSON",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(3910));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "QUIZ_MASTER",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(3919));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SEVEN_DAY_STREAK",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(3920));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SQUAD_GOALS",
                column: "CreatedAt",
                value: new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(3924));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(4060), new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(4060) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(4067), new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(4067) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(4108), new DateTime(2026, 9, 29, 4, 48, 50, 362, DateTimeKind.Utc).AddTicks(4108) });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsFreePreview",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "CertificateEnabled",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "LearningOutcomesJson",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "PrerequisitesJson",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "ShortDescription",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "TargetAudienceJson",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "XpReward",
                table: "Courses");

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
        }
    }
}
