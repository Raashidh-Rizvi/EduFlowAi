using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AnswerSnapshotsAndMarkAdjustments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "QuestionSnapshotJson",
                table: "SubmissionAnswers",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MarkAdjustments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmissionAnswerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    PreviousMarks = table.Column<int>(type: "integer", nullable: false),
                    NewMarks = table.Column<int>(type: "integer", nullable: false),
                    PreviousStatus = table.Column<string>(type: "text", nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MarkAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MarkAdjustments_SubmissionAnswers_SubmissionAnswerId",
                        column: x => x.SubmissionAnswerId,
                        principalTable: "SubmissionAnswers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MarkAdjustments_Users_ActorId",
                        column: x => x.ActorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MarkAdjustments_ActorId",
                table: "MarkAdjustments",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_MarkAdjustments_SubmissionAnswerId",
                table: "MarkAdjustments",
                column: "SubmissionAnswerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MarkAdjustments");

            migrationBuilder.DropColumn(
                name: "QuestionSnapshotJson",
                table: "SubmissionAnswers");
        }
    }
}
