using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAssessmentAiMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CourseId",
                table: "Teams",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuestTitle",
                table: "Teams",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "TargetXp",
                table: "Teams",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "AiModel",
                table: "Assessments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AiProvider",
                table: "Assessments",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Teams_CourseId",
                table: "Teams",
                column: "CourseId");

            migrationBuilder.AddForeignKey(
                name: "FK_Teams_Courses_CourseId",
                table: "Teams",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Teams_Courses_CourseId",
                table: "Teams");

            migrationBuilder.DropIndex(
                name: "IX_Teams_CourseId",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "CourseId",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "QuestTitle",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "TargetXp",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "AiModel",
                table: "Assessments");

            migrationBuilder.DropColumn(
                name: "AiProvider",
                table: "Assessments");
        }
    }
}
