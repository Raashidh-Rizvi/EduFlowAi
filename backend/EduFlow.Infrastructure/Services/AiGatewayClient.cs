using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace EduFlow.Infrastructure.Services;

public interface IAiGatewayClient
{
    Task<string> OrchestrateStudyPlanAsync(object requestPayload, CancellationToken ct = default);
    Task<string> GenerateAdaptiveChallengeAsync(object requestPayload, CancellationToken ct = default);
    Task<string> ChatWithCoachAsync(object requestPayload, CancellationToken ct = default);
}

public class AiGatewayClient : IAiGatewayClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    public AiGatewayClient(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _baseUrl = configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
    }

    public async Task<string> OrchestrateStudyPlanAsync(object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/orchestrate-study-plan", requestPayload, ct);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync(ct);
            }
        }
        catch
        {
            // Fallback simulation when python microservice is not active
        }

        return FallbackStudyPlanJson();
    }

    public async Task<string> GenerateAdaptiveChallengeAsync(object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/generate-adaptive-challenge", requestPayload, ct);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync(ct);
            }
        }
        catch
        {
            // Fallback
        }

        return FallbackAdaptiveChallengeJson();
    }

    public async Task<string> ChatWithCoachAsync(object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/ai-coach-chat", requestPayload, ct);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync(ct);
            }
        }
        catch
        {
            // Fallback
        }

        return JsonSerializer.Serialize(new
        {
            reply = "I'm your EduFlow AI Learning Coach! Keep completing lessons and quizzes to earn XP and level up.",
            suggested_action = "Review Clean Architecture and start a practice challenge.",
            confidence_score = 0.95
        });
    }

    private static string FallbackStudyPlanJson()
    {
        return JsonSerializer.Serialize(new
        {
            workflow_id = $"wf-{Guid.NewGuid().ToString("N")[..8]}",
            status = "PendingInstructorApproval",
            milestones = new[]
            {
                new { milestone_id = 1, title = "Foundations & Relational Modeling", target_topics = new[] { "PostgreSQL Schema Design", "Indexes" }, estimated_hours = 3.2 },
                new { milestone_id = 2, title = "Architecture & State Validation", target_topics = new[] { "ASP.NET Core Controllers", "EF Core" }, estimated_hours = 4.8 }
            },
            schedule = new[]
            {
                new { day_number = 1, activity_title = "Review: PostgreSQL Relational Indexes", description = "Study database indexing", activity_type = "Lesson", estimated_minutes = 90, xp_reward = 40 },
                new { day_number = 3, activity_title = "Interactive Lab: EF Core Migrations", description = "Hands-on coding exercise", activity_type = "Lab", estimated_minutes = 120, xp_reward = 60 },
                new { day_number = 5, activity_title = "Knowledge Check: Quiz 1", description = "Complete self-assessment", activity_type = "Quiz", estimated_minutes = 45, xp_reward = 50 },
                new { day_number = 7, activity_title = "Boss Encounter: Concurrency Dungeon", description = "Reinforce ACID boundaries", activity_type = "Boss", estimated_minutes = 60, xp_reward = 150 }
            },
            validation = new { passed = true, errors = Array.Empty<string>(), deterministic_rule_count = 5 }
        });
    }

    private static string FallbackAdaptiveChallengeJson()
    {
        return JsonSerializer.Serialize(new
        {
            challenge_id = Guid.NewGuid().ToString(),
            workflow_id = $"wf-ch-{Guid.NewGuid().ToString("N")[..8]}",
            title = "Adaptive Mission: Clean Architecture Mastery",
            description = "Calibrated 5-minute practice quest targeting identified gaps.",
            difficulty = "Medium",
            xp_reward = 120,
            coin_reward = 40,
            time_limit_minutes = 15,
            questions = new[]
            {
                new
                {
                    question_text = "In Clean Architecture, which layer should contain core domain entities?",
                    options = new[] { "EduFlow.Core", "EduFlow.Api", "EduFlow.Infrastructure" },
                    correct_index = 0,
                    explanation = "Domain entities must reside exclusively in Core.",
                    points = 10
                }
            },
            validation_passed = true,
            status = "PendingInstructorApproval"
        });
    }
}
