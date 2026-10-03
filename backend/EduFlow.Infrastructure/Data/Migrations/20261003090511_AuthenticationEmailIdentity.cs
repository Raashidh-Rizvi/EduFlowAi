using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduFlow.Infrastructure.Data.Migrations;

public partial class AuthenticationEmailIdentity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Keep existing email storage and index. Enforce identity even for legacy mixed-case rows.
        // Existing case-variant duplicates must be resolved by an administrator; never delete users here.
        migrationBuilder.Sql(@"CREATE UNIQUE INDEX ""IX_Users_NormalizedEmail"" ON ""Users"" (lower(""Email""));");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"DROP INDEX ""IX_Users_NormalizedEmail"";");
    }
}
