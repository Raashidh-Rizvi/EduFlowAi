using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Xunit;

namespace EduFlow.Tests;

public class ZzReproUpdateQuiz
{
    [Fact]
    public async Task ReproPg()
    {
        var json = JsonDocument.Parse(File.ReadAllText(@"D:\Project\EduFlow\backend\EduFlow.Api\appsettings.Development.json"));
        var cs = json.RootElement.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(cs, o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery))
            .LogTo(s => { if (s.Contains("Executed DbCommand") && !s.Contains("SELECT")) Console.WriteLine(s); }, LogLevel.Information)
            .Options;
        await using var db = new ApplicationDbContext(options);
        var quizId = Guid.Parse("ab057eef-710d-4102-a13f-7aab0f2f1a8d");
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var quiz = await db.Assessments.Include(a => a.Questions).ThenInclude(q => q.Options)
                .Include(a => a.Configuration).FirstAsync(a => a.Id == quizId);
            Console.WriteLine($"questions={quiz.Questions.Count} options={quiz.Questions.Sum(q => q.Options.Count)} config={(quiz.Configuration != null)}");
            quiz.Title = quiz.Title;
            quiz.UpdatedAt = DateTime.UtcNow;
            db.Questions.RemoveRange(quiz.Questions);
            quiz.Questions.Clear();
            db.Questions.Add(new Question { AssessmentId = quiz.Id, Prompt = "n", OrderIndex = 1, MetadataJson = "{}" });
            foreach (var e in db.ChangeTracker.Entries().Where(e => e.State != EntityState.Unchanged)) Console.WriteLine($"{e.Entity.GetType().Name} {e.State}");
            await db.SaveChangesAsync();
            Console.WriteLine("SAVE OK");
        }
        catch (Exception ex) { Console.WriteLine("ERR " + ex.GetType().Name + ": " + ex.Message); foreach (var e in (ex as DbUpdateException)?.Entries ?? Array.Empty<Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry>()) Console.WriteLine($"  failing: {e.Entity.GetType().Name} {e.State}"); }
        finally { await tx.RollbackAsync(); Console.WriteLine("ROLLED BACK"); }
    }
}
