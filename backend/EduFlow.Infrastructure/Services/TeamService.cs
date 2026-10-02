using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services.Gamification;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class TeamService : ITeamService
{
    private readonly ApplicationDbContext _dbContext;

    private readonly AchievementService _achievements;

    public TeamService(ApplicationDbContext dbContext)
        : this(dbContext, new AchievementService(dbContext, new PointsLedger(dbContext, new GamificationRuleSet(dbContext))))
    {
    }

    public TeamService(ApplicationDbContext dbContext, AchievementService achievements)
    {
        _dbContext = dbContext;
        _achievements = achievements;
    }

    public async Task<SquadDto?> GetStudentSquadAsync(Guid studentId, CancellationToken ct = default)
    {
        var membership = await _dbContext.TeamMembers
            .Include(tm => tm.Team)
            .FirstOrDefaultAsync(tm => tm.StudentId == studentId, ct);

        if (membership == null || membership.Team == null)
        {
            return null;
        }

        return await BuildSquadDtoAsync(membership.Team, ct);
    }

    public async Task<List<SquadLeaderboardEntryDto>> GetSquadLeaderboardAsync(int top = 10, CancellationToken ct = default)
    {
        var teams = await _dbContext.Teams
            .Include(t => t.Members)
                .ThenInclude(m => m.Student)
                    .ThenInclude(u => u!.StudentXp)
            .ToListAsync(ct);

        var ranked = teams
            .Select(t => new
            {
                Team = t,
                MemberCount = t.Members.Count,
                CombinedXp = t.Members.Sum(m => m.Student?.StudentXp?.TotalXp ?? 0)
            })
            .OrderByDescending(x => x.CombinedXp)
            .ThenBy(x => x.Team.Name)
            .Take(top)
            .Select((x, index) => new SquadLeaderboardEntryDto(
                index + 1,
                x.Team.Id,
                x.Team.Name,
                x.Team.AvatarUrl,
                x.MemberCount,
                x.CombinedXp
            ))
            .ToList();

        return ranked;
    }

    public async Task<SquadActionResultDto> CreateSquadAsync(Guid leaderId, CreateSquadRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new SquadActionResultDto(false, "Squad name is required.", null);
        }

        var leader = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == leaderId, ct);
        if (leader == null)
        {
            return new SquadActionResultDto(false, "Student not found.", null);
        }

        var existingMembership = await _dbContext.TeamMembers.AnyAsync(tm => tm.StudentId == leaderId, ct);
        if (existingMembership)
        {
            return new SquadActionResultDto(false, "You are already a member of a squad. Leave your current squad before creating a new one.", null);
        }

        var team = new Team
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            LeaderId = leaderId
        };
        await _dbContext.Teams.AddAsync(team, ct);

        var member = new TeamMember
        {
            Team = team,
            StudentId = leaderId,
            Role = TeamRole.Leader,
            JoinedAt = DateTime.UtcNow
        };
        await _dbContext.TeamMembers.AddAsync(member, ct);

        await _dbContext.SaveChangesAsync(ct);
        await _achievements.EvaluateAsync(member.StudentId, ct);
        await _dbContext.SaveChangesAsync(ct);

        var squadDto = await BuildSquadDtoAsync(team, ct);
        return new SquadActionResultDto(true, $"Squad '{team.Name}' created successfully.", squadDto);
    }

    public async Task<List<SquadDto>> GetAllSquadsAsync(CancellationToken ct = default)
    {
        var teams = await _dbContext.Teams
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

        var result = new List<SquadDto>();
        foreach (var team in teams)
        {
            result.Add(await BuildSquadDtoAsync(team, ct));
        }
        return result;
    }

    public async Task<SquadActionResultDto> InstructorCreateSquadAsync(InstructorCreateSquadRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new SquadActionResultDto(false, "Squad name is required.", null);
        }

        var studentIds = request.StudentIds ?? new List<Guid>();
        if (studentIds.Count == 0)
        {
            return new SquadActionResultDto(false, "Please select at least one student for the squad.", null);
        }

        Guid leaderId = request.LeaderId ?? studentIds.First();
        if (!studentIds.Contains(leaderId))
        {
            studentIds.Insert(0, leaderId);
        }

        // Anchor the quest to a real course so its progress is derived from learning
        // activity instead of a free-text label and a fixed XP number.
        Course? questCourse = null;
        if (request.CourseId.HasValue)
        {
            questCourse = await _dbContext.Courses.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.CourseId.Value, ct);
            if (questCourse == null)
            {
                return new SquadActionResultDto(false, "The selected course no longer exists.", null);
            }
        }

        var questTitle = ResolveQuestTitle(request.ActiveQuest, questCourse);
        var targetXp = request.TargetGoalXp > 0
            ? request.TargetGoalXp
            : await DeriveCourseTargetXpAsync(questCourse, ct);

        var team = new Team
        {
            Name = request.Name.Trim(),
            Description = !string.IsNullOrWhiteSpace(request.Description)
                ? request.Description.Trim()
                : $"Quest: {questTitle}",
            AvatarUrl = !string.IsNullOrWhiteSpace(request.AvatarUrl) ? request.AvatarUrl.Trim() : "⚔️",
            LeaderId = leaderId,
            CourseId = questCourse?.Id,
            QuestTitle = questTitle,
            TargetXp = targetXp,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _dbContext.Teams.AddAsync(team, ct);
        await _dbContext.SaveChangesAsync(ct);

        // Remove these students from any previous squads so they don't have duplicate memberships
        var existingMemberships = await _dbContext.TeamMembers
            .Where(tm => studentIds.Contains(tm.StudentId))
            .ToListAsync(ct);
        if (existingMemberships.Count > 0)
        {
            _dbContext.TeamMembers.RemoveRange(existingMemberships);
            await _dbContext.SaveChangesAsync(ct);
        }

        // Add members
        foreach (var sId in studentIds)
        {
            var role = (sId == leaderId) ? TeamRole.Leader : TeamRole.Member;
            await _dbContext.TeamMembers.AddAsync(new TeamMember
            {
                TeamId = team.Id,
                StudentId = sId,
                Role = role,
                JoinedAt = DateTime.UtcNow
            }, ct);
        }

        // Membership is saved first; team achievements (and their ledgered XP) follow from it.
        await _dbContext.SaveChangesAsync(ct);
        foreach (var sId in studentIds)
        {
            await _achievements.EvaluateAsync(sId, ct);
        }
        await _dbContext.SaveChangesAsync(ct);

        var squadDto = await BuildSquadDtoAsync(team, ct);
        return new SquadActionResultDto(true, $"Squad '{team.Name}' created successfully with {studentIds.Count} members.", squadDto);
    }

    public async Task<SquadActionResultDto> UpdateSquadAsync(Guid squadId, UpdateSquadRequest request, CancellationToken ct = default)
    {
        var team = await _dbContext.Teams.FirstOrDefaultAsync(t => t.Id == squadId, ct);
        if (team == null)
        {
            return new SquadActionResultDto(false, "Squad not found.", null);
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
            team.Name = request.Name.Trim();
        if (request.Description != null)
            team.Description = request.Description.Trim();
        if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
            team.AvatarUrl = request.AvatarUrl.Trim();
        if (request.LeaderId.HasValue)
            team.LeaderId = request.LeaderId.Value;
        if (!string.IsNullOrWhiteSpace(request.ActiveQuest))
            team.QuestTitle = request.ActiveQuest.Trim();
        // The XP target is stored, never discarded — 0 keeps the course-derived value.
        if (request.TargetGoalXp > 0)
            team.TargetXp = request.TargetGoalXp;

        team.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(ct);

        var squadDto = await BuildSquadDtoAsync(team, ct);
        return new SquadActionResultDto(true, $"Squad '{team.Name}' updated successfully.", squadDto);
    }

    public async Task<SquadActionResultDto> AddMemberAsync(Guid squadId, Guid studentId, TeamRole role = TeamRole.Member, CancellationToken ct = default)
    {
        var team = await _dbContext.Teams.FirstOrDefaultAsync(t => t.Id == squadId, ct);
        if (team == null)
        {
            return new SquadActionResultDto(false, "Squad not found.", null);
        }

        var existing = await _dbContext.TeamMembers.FirstOrDefaultAsync(tm => tm.StudentId == studentId, ct);
        if (existing != null)
        {
            if (existing.TeamId == squadId)
                return new SquadActionResultDto(false, "Student is already a member of this squad.", await BuildSquadDtoAsync(team, ct));

            _dbContext.TeamMembers.Remove(existing);
        }

        await _dbContext.TeamMembers.AddAsync(new TeamMember
        {
            TeamId = squadId,
            StudentId = studentId,
            Role = role,
            JoinedAt = DateTime.UtcNow
        }, ct);

        await _dbContext.SaveChangesAsync(ct);
        await _achievements.EvaluateAsync(studentId, ct);
        await _dbContext.SaveChangesAsync(ct);
        return new SquadActionResultDto(true, "Student added to squad.", await BuildSquadDtoAsync(team, ct));
    }

    public async Task<SquadActionResultDto> RemoveMemberAsync(Guid squadId, Guid studentId, CancellationToken ct = default)
    {
        var team = await _dbContext.Teams.FirstOrDefaultAsync(t => t.Id == squadId, ct);
        if (team == null)
        {
            return new SquadActionResultDto(false, "Squad not found.", null);
        }

        var member = await _dbContext.TeamMembers.FirstOrDefaultAsync(tm => tm.TeamId == squadId && tm.StudentId == studentId, ct);
        if (member == null)
        {
            return new SquadActionResultDto(false, "Member not found in squad.", await BuildSquadDtoAsync(team, ct));
        }

        _dbContext.TeamMembers.Remove(member);

        if (team.LeaderId == studentId)
        {
            var nextMember = await _dbContext.TeamMembers.FirstOrDefaultAsync(tm => tm.TeamId == squadId && tm.StudentId != studentId, ct);
            if (nextMember != null)
            {
                team.LeaderId = nextMember.StudentId;
                nextMember.Role = TeamRole.Leader;
            }
        }

        await _dbContext.SaveChangesAsync(ct);
        return new SquadActionResultDto(true, "Student removed from squad.", await BuildSquadDtoAsync(team, ct));
    }

    public async Task<bool> DeleteSquadAsync(Guid squadId, CancellationToken ct = default)
    {
        var team = await _dbContext.Teams.FirstOrDefaultAsync(t => t.Id == squadId, ct);
        if (team == null) return false;

        var members = await _dbContext.TeamMembers.Where(tm => tm.TeamId == squadId).ToListAsync(ct);
        _dbContext.TeamMembers.RemoveRange(members);

        _dbContext.Teams.Remove(team);
        await _dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<StudentTeamOptionDto>> GetStudentsForTeamsAsync(CancellationToken ct = default)
    {
        var students = await _dbContext.Users
            .Where(u => u.Role == UserRole.Student)
            .Include(u => u.StudentXp)
            .Include(u => u.StudentStreak)
            .ToListAsync(ct);

        var memberships = await _dbContext.TeamMembers
            .Include(tm => tm.Team)
            .ToListAsync(ct);

        var membershipMap = memberships.ToDictionary(m => m.StudentId, m => m.Team);

        return students.Select(s =>
        {
            membershipMap.TryGetValue(s.Id, out var team);
            return new StudentTeamOptionDto(
                StudentId: s.Id,
                FullName: s.FullName,
                Email: s.Email,
                AvatarUrl: s.AvatarUrl,
                TotalXp: s.StudentXp?.TotalXp ?? 0,
                CurrentLevel: s.StudentXp?.CurrentLevel ?? 1,
                CurrentStreak: s.StudentStreak?.CurrentStreak ?? 0,
                CurrentSquadId: team?.Id,
                CurrentSquadName: team?.Name
            );
        })
        .OrderByDescending(s => s.TotalXp)
        .ToList();
    }

    public async Task<SquadActionResultDto> JoinSquadAsync(Guid squadId, Guid studentId, CancellationToken ct = default)
    {
        var team = await _dbContext.Teams.FirstOrDefaultAsync(t => t.Id == squadId, ct);
        if (team == null)
        {
            return new SquadActionResultDto(false, "Squad not found.", null);
        }

        var existingMembership = await _dbContext.TeamMembers.FirstOrDefaultAsync(tm => tm.StudentId == studentId, ct);
        if (existingMembership != null)
        {
            if (existingMembership.TeamId == squadId)
            {
                var currentSquadDto = await BuildSquadDtoAsync(team, ct);
                return new SquadActionResultDto(false, "You are already a member of this squad.", currentSquadDto);
            }

            return new SquadActionResultDto(false, "You are already a member of another squad. Leave it before joining a new one.", null);
        }

        var member = new TeamMember
        {
            TeamId = team.Id,
            StudentId = studentId,
            Role = TeamRole.Member,
            JoinedAt = DateTime.UtcNow
        };
        await _dbContext.TeamMembers.AddAsync(member, ct);

        await _dbContext.SaveChangesAsync(ct);
        await _achievements.EvaluateAsync(member.StudentId, ct);
        await _dbContext.SaveChangesAsync(ct);

        var squadDto = await BuildSquadDtoAsync(team, ct);
        return new SquadActionResultDto(true, $"Joined squad '{team.Name}' successfully.", squadDto);
    }

    private async Task<SquadDto> BuildSquadDtoAsync(Team team, CancellationToken ct)
    {
        var members = await _dbContext.TeamMembers
            .Where(tm => tm.TeamId == team.Id)
            .Include(tm => tm.Student)
                .ThenInclude(u => u!.StudentXp)
            .OrderBy(tm => tm.Role)
            .ThenBy(tm => tm.JoinedAt)
            .ToListAsync(ct);

        var memberDtos = members.Select(tm => new SquadMemberDto(
            tm.StudentId,
            tm.Student?.FullName ?? "Unknown Student",
            tm.Student?.AvatarUrl,
            tm.Role,
            tm.Student?.StudentXp?.TotalXp ?? 0,
            tm.JoinedAt
        )).ToList();

        int combinedXp = memberDtos.Sum(m => m.TotalXp);
        string leaderName = memberDtos.FirstOrDefault(m => m.Role == TeamRole.Leader)?.StudentName ?? "Unknown";

        string? courseTitle = null;
        double learningProgress = 0;
        int completedLessons = 0;
        int totalLessons = 0;

        if (team.CourseId.HasValue)
        {
            var course = await _dbContext.Courses.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == team.CourseId.Value, ct);
            courseTitle = course?.Title;

            var squad = await BuildCourseProgressAsync(team.CourseId.Value, memberDtos, ct);
            learningProgress = squad.LearningProgressPercent;
            completedLessons = squad.CompletedLessons;
            totalLessons = squad.TotalLessons;
        }

        return new SquadDto(
            team.Id,
            team.Name,
            team.Description,
            team.AvatarUrl,
            team.LeaderId,
            leaderName,
            memberDtos.Count,
            combinedXp,
            memberDtos,
            team.CreatedAt,
            team.CourseId,
            courseTitle,
            ResolveQuestTitle(team.QuestTitle, courseTitle),
            team.TargetXp,
            learningProgress,
            completedLessons,
            totalLessons
        );
    }

    /// <summary>Live learning progress of a squad through the course its quest is anchored to.</summary>
    private async Task<(double LearningProgressPercent, int CompletedLessons, int TotalLessons)> BuildCourseProgressAsync(
        Guid courseId,
        List<SquadMemberDto> members,
        CancellationToken ct)
    {
        var memberIds = members.Select(m => m.StudentId).ToList();
        if (memberIds.Count == 0)
        {
            return (0, 0, 0);
        }

        // Lessons (content items) that make up the bound course.
        var lessonIds = await _dbContext.ContentItems.AsNoTracking()
            .Where(ci => ci.Module!.CourseId == courseId)
            .Select(ci => ci.Id)
            .ToListAsync(ct);
        int totalLessons = lessonIds.Count;

        // Distinct lessons completed by at least one squad member.
        var completions = new List<(Guid? ContentId, Guid? LessonId)>();
        if (totalLessons > 0)
        {
            var rows = await _dbContext.LessonCompletions.AsNoTracking()
                .Where(lc => memberIds.Contains(lc.StudentId)
                             && ((lc.ContentItemId != null && lessonIds.Contains(lc.ContentItemId.Value))
                                 || (lc.LessonId != null && lessonIds.Contains(lc.LessonId.Value))))
                .Select(lc => new { lc.ContentItemId, lc.LessonId })
                .ToListAsync(ct);
            completions.AddRange(rows.Select(r => (r.ContentItemId, r.LessonId)));
        }

        int completedLessons = completions
            .Select(c => c.ContentId ?? c.LessonId ?? Guid.Empty)
            .Distinct()
            .Count();

        // Prefer the stored enrollment progress (authoritative, instructor-visible);
        // fall back to the completion ratio for members without an enrollment row.
        var progresses = await _dbContext.Enrollments.AsNoTracking()
            .Where(e => e.CourseId == courseId
                        && memberIds.Contains(e.StudentId)
                        && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
            .Select(e => e.ProgressPercentage)
            .ToListAsync(ct);

        double learningProgress;
        if (progresses.Count > 0)
        {
            learningProgress = Math.Round(progresses.Average(), 1);
        }
        else if (totalLessons > 0)
        {
            learningProgress = Math.Round(100.0 * completedLessons / (totalLessons * memberIds.Count), 1);
        }
        else
        {
            learningProgress = 0;
        }

        return (Math.Clamp(learningProgress, 0, 100), completedLessons, totalLessons);
    }

    /// <summary>
    /// Quest title is never a hard-coded constant: it comes from the instructor's input,
    /// else the bound course, else a neutral label.
    /// </summary>
    private static string ResolveQuestTitle(string? requested, string? courseTitle)
    {
        if (!string.IsNullOrWhiteSpace(requested)) return requested.Trim();
        if (!string.IsNullOrWhiteSpace(courseTitle)) return $"{courseTitle} Mastery Quest";
        return "Collaborative Learning Sprint";
    }

    private static string ResolveQuestTitle(string? requested, Course? course)
        => ResolveQuestTitle(requested, course?.Title);

    /// <summary>The real reward total of a course: configured total, else lesson + quiz XP.</summary>
    private async Task<int> DeriveCourseTargetXpAsync(Course? course, CancellationToken ct)
    {
        if (course == null) return 0;
        if (course.XpReward > 0) return course.XpReward;

        int lessonXp = await _dbContext.ContentItems.AsNoTracking()
            .Where(ci => ci.Module!.CourseId == course.Id)
            .SumAsync(ci => (int?)ci.XpReward) ?? 0;

        int quizXp = await _dbContext.Assessments.AsNoTracking()
            .Where(a => a.CourseId == course.Id)
            .SumAsync(a => (int?)a.XpReward) ?? 0;

        return lessonXp + quizXp;
    }
}
