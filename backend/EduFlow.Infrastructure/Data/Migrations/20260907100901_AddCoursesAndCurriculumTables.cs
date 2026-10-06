using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCoursesAndCurriculumTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "CHALLENGE_CHAMPION",
                column: "CreatedAt",
                value: new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(1727));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "FIRST_LESSON",
                column: "CreatedAt",
                value: new DateTime(2026, 8, 25, 19, 10, 9, 541, DateTimeKind.Utc).AddTicks(9092));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "QUIZ_MASTER",
                column: "CreatedAt",
                value: new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(1722));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SEVEN_DAY_STREAK",
                column: "CreatedAt",
                value: new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(1726));

            migrationBuilder.UpdateData(
                table: "Badges",
                keyColumn: "Id",
                keyValue: "SQUAD_GOALS",
                column: "CreatedAt",
                value: new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(1729));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(6932), new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(6933) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(9651), new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(9651) });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(9681), new DateTime(2026, 8, 25, 19, 10, 9, 542, DateTimeKind.Utc).AddTicks(9681) });
        }
    }
}
