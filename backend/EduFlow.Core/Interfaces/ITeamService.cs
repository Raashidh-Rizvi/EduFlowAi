using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;

namespace EduFlow.Core.Interfaces;

public interface ITeamService
{
    Task<SquadDto?> GetStudentSquadAsync(Guid studentId, CancellationToken ct = default);
    Task<List<SquadDto>> GetAllSquadsAsync(CancellationToken ct = default);
    Task<List<SquadLeaderboardEntryDto>> GetSquadLeaderboardAsync(int top = 10, CancellationToken ct = default);
    Task<SquadActionResultDto> CreateSquadAsync(Guid leaderId, CreateSquadRequest request, CancellationToken ct = default);
    Task<SquadActionResultDto> InstructorCreateSquadAsync(InstructorCreateSquadRequest request, CancellationToken ct = default);
    Task<SquadActionResultDto> UpdateSquadAsync(Guid squadId, UpdateSquadRequest request, CancellationToken ct = default);
    Task<SquadActionResultDto> AddMemberAsync(Guid squadId, Guid studentId, EduFlow.Core.Enums.TeamRole role = EduFlow.Core.Enums.TeamRole.Member, CancellationToken ct = default);
    Task<SquadActionResultDto> RemoveMemberAsync(Guid squadId, Guid studentId, CancellationToken ct = default);
    Task<bool> DeleteSquadAsync(Guid squadId, CancellationToken ct = default);
    Task<List<StudentTeamOptionDto>> GetStudentsForTeamsAsync(CancellationToken ct = default);
    Task<SquadActionResultDto> JoinSquadAsync(Guid squadId, Guid studentId, CancellationToken ct = default);
}
