using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;

namespace EduFlow.Core.Interfaces;

public interface ITeamService
{
    Task<SquadDto?> GetStudentSquadAsync(Guid studentId, CancellationToken ct = default);
    Task<List<SquadLeaderboardEntryDto>> GetSquadLeaderboardAsync(int top = 10, CancellationToken ct = default);
    Task<SquadActionResultDto> CreateSquadAsync(Guid leaderId, CreateSquadRequest request, CancellationToken ct = default);
    Task<SquadActionResultDto> JoinSquadAsync(Guid squadId, Guid studentId, CancellationToken ct = default);
}
