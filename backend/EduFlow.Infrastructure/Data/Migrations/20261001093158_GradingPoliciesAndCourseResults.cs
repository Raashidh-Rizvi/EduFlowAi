using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class GradingPoliciesAndCourseResults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "GradeWeightPercent",
                table: "Assessments",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CourseResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoursePercentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CurrentPercentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    AssessedWeight = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CalculatedGrade = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    OverrideGrade = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    IsComplete = table.Column<bool>(type: "boolean", nullable: false),
                    CalculatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseResults", x => x.Id);
                    table.CheckConstraint("CK_CourseResults_AssessedWeight_Range", "\"AssessedWeight\" >= 0 AND \"AssessedWeight\" <= 100");
                    table.CheckConstraint("CK_CourseResults_CoursePercentage_Range", "\"CoursePercentage\" >= 0 AND \"CoursePercentage\" <= 100");
                    table.ForeignKey(
                        name: "FK_CourseResults_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CourseResults_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GradingPolicies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsInstitutionDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GradingPolicies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GradingPolicies_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GradeOverrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseResultId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    PreviousGrade = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    NewGrade = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GradeOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GradeOverrides_CourseResults_CourseResultId",
                        column: x => x.CourseResultId,
                        principalTable: "CourseResults",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GradeOverrides_Users_ActorId",
                        column: x => x.ActorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "CourseGradingConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: false),
                    GradingPolicyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    AttemptScoring = table.Column<string>(type: "text", nullable: false),
                    ActivatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActivatedById = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseGradingConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourseGradingConfigurations_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CourseGradingConfigurations_GradingPolicies_GradingPolicyId",
                        column: x => x.GradingPolicyId,
                        principalTable: "GradingPolicies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GradeBands",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GradingPolicyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    MinPercentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GradeBands", x => x.Id);
                    table.CheckConstraint("CK_GradeBands_MinPercentage_Range", "\"MinPercentage\" >= 0 AND \"MinPercentage\" <= 100");
                    table.ForeignKey(
                        name: "FK_GradeBands_GradingPolicies_GradingPolicyId",
                        column: x => x.GradingPolicyId,
                        principalTable: "GradingPolicies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "GradingPolicies",
                columns: new[] { "Id", "CourseId", "CreatedAt", "IsInstitutionDefault", "Name", "UpdatedAt" },
                values: new object[] { new Guid("6a0e1b00-0000-4000-8000-000000000000"), null, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Institution default", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.InsertData(
                table: "GradeBands",
                columns: new[] { "Id", "CreatedAt", "GradingPolicyId", "Label", "MinPercentage", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("6a0e1b00-0000-4000-8000-000000000001"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "A+", 85m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000002"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "A", 80m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000003"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "A-", 75m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000004"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "B+", 70m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000005"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "B", 65m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000006"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "B-", 60m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000007"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "C+", 55m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000008"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "C", 50m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000009"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "C-", 45m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000010"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "D", 40m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("6a0e1b00-0000-4000-8000-000000000011"), new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), new Guid("6a0e1b00-0000-4000-8000-000000000000"), "F", 0m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Assessments_GradeWeight_Range",
                table: "Assessments",
                sql: "\"GradeWeightPercent\" IS NULL OR (\"GradeWeightPercent\" > 0 AND \"GradeWeightPercent\" <= 100)");

            migrationBuilder.CreateIndex(
                name: "IX_CourseGradingConfigurations_CourseId",
                table: "CourseGradingConfigurations",
                column: "CourseId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseGradingConfigurations_GradingPolicyId",
                table: "CourseGradingConfigurations",
                column: "GradingPolicyId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseResults_CourseId_StudentId",
                table: "CourseResults",
                columns: new[] { "CourseId", "StudentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseResults_StudentId",
                table: "CourseResults",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_GradeBands_GradingPolicyId_Label",
                table: "GradeBands",
                columns: new[] { "GradingPolicyId", "Label" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GradeBands_GradingPolicyId_MinPercentage",
                table: "GradeBands",
                columns: new[] { "GradingPolicyId", "MinPercentage" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GradeOverrides_ActorId",
                table: "GradeOverrides",
                column: "ActorId");

            migrationBuilder.CreateIndex(
                name: "IX_GradeOverrides_CourseResultId",
                table: "GradeOverrides",
                column: "CourseResultId");

            migrationBuilder.CreateIndex(
                name: "IX_GradingPolicies_CourseId",
                table: "GradingPolicies",
                column: "CourseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CourseGradingConfigurations");

            migrationBuilder.DropTable(
                name: "GradeBands");

            migrationBuilder.DropTable(
                name: "GradeOverrides");

            migrationBuilder.DropTable(
                name: "GradingPolicies");

            migrationBuilder.DropTable(
                name: "CourseResults");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Assessments_GradeWeight_Range",
                table: "Assessments");

            migrationBuilder.DropColumn(
                name: "GradeWeightPercent",
                table: "Assessments");
        }
    }
}
