using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportTicketResponseUpdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "SupportTicketResponses",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            // PostgreSQL has no integer -> uuid cast, so the scaffolded AlterColumn failed on every
            // database. Version is only an optimistic-concurrency token: issue fresh values.
            migrationBuilder.Sql("""
                ALTER TABLE "SupportTickets"
                ALTER COLUMN "Version" TYPE uuid USING gen_random_uuid();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "SupportTickets"
                ALTER COLUMN "Version" TYPE integer USING 1;
                """);

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "SupportTicketResponses");
        }
    }
}
