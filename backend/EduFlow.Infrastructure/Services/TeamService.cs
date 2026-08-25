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
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class TeamService : ITeamService
{
    private readonly ApplicationDbContext _dbContext;

    public TeamService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
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

        var squadDto = await BuildSquadDtoAsync(team, ct);
        return new SquadActionResultDto(true, $"Squad '{team.Name}' created successfully.", squadDto);
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
            team.CreatedAt
        );
    }
}
