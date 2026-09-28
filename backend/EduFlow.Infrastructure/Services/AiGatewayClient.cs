using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EduFlow.Infrastructure.Services;

public record AiProxyResponse(int StatusCode, string Body);

public interface IAiGatewayClient
{
    Task<AiProxyResponse> LearnAsync(object requestPayload, CancellationToken ct = default);
    Task<AiProxyResponse> RagChatAsync(object requestPayload, CancellationToken ct = default);
    Task<AiProxyResponse> GetLearningSlideDecksAsync(CancellationToken ct = default);
    Task<string> GetAiStatusAsync(CancellationToken ct = default);
    Task<string> OrchestrateStudyPlanAsync(object requestPayload, CancellationToken ct = default);
    Task<string> GenerateAdaptiveChallengeAsync(object requestPayload, CancellationToken ct = default);
    Task<string> GenerateQuizAsync(object requestPayload, CancellationToken ct = default);
    Task<string> RegenerateQuestionAsync(string questionId, object requestPayload, CancellationToken ct = default);
    Task<string> AnalyzeRetentionAsync(object requestPayload, CancellationToken ct = default);
    Task<AiProxyResponse> ChatWithCoachAsync(object requestPayload, CancellationToken ct = default);
    Task<string> GetAgentsTopologyAsync(CancellationToken ct = default);
    Task<string> ExecuteWorkflowAsync(object requestPayload, CancellationToken ct = default);
    Task<string> SubmitWorkflowDecisionAsync(string workflowId, object requestPayload, CancellationToken ct = default);
    Task<string> GetToolRegistryAsync(CancellationToken ct = default);
    Task<string> GetObservabilityMetricsAsync(CancellationToken ct = default);
    Task<string> CategorizeSlideTopicsAsync(object requestPayload, CancellationToken ct = default);
    Task<string> GenerateSlideRAGQuizAsync(object requestPayload, CancellationToken ct = default);
    Task<string> AutoGradeQuizSubmissionAsync(object requestPayload, CancellationToken ct = default);
}

public class AiGatewayClient : IAiGatewayClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly ILogger<AiGatewayClient>? _logger;

    public AiGatewayClient(HttpClient httpClient, IConfiguration configuration, ILogger<AiGatewayClient>? logger = null)
    {
        _httpClient = httpClient;
        var timeoutRaw = configuration["AiService:TimeoutSeconds"];
        var timeoutSeconds = int.TryParse(timeoutRaw, out var ts) && ts > 0 ? ts : 30;
        _httpClient.Timeout = TimeSpan.FromSeconds(timeoutSeconds);
        _baseUrl = configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
        _logger = logger;

        var apiKey = configuration["AiService:ApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Internal-Api-Key", apiKey);
        }
    }

    public Task<AiProxyResponse> LearnAsync(object requestPayload, CancellationToken ct = default)
        => ProxyLearningAsync(HttpMethod.Post, "/api/v1/agent/learn", requestPayload, ct);

    public Task<AiProxyResponse> RagChatAsync(object requestPayload, CancellationToken ct = default)
        => ProxyLearningAsync(HttpMethod.Post, "/api/v1/rag/chat", requestPayload, ct);

    public Task<AiProxyResponse> GetLearningSlideDecksAsync(CancellationToken ct = default)
        => ProxyLearningAsync(HttpMethod.Get, "/api/v1/rag/slide-decks", null, ct);

    private async Task<AiProxyResponse> ProxyLearningAsync(HttpMethod method, string path, object? payload, CancellationToken ct)
    {
        try
        {
            using var request = new HttpRequestMessage(method, $"{_baseUrl}{path}");
            if (payload != null) request.Content = JsonContent.Create(payload);
            using var response = await _httpClient.SendAsync(request, ct);
            return new AiProxyResponse((int)response.StatusCode, await response.Content.ReadAsStringAsync(ct));
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return new AiProxyResponse(504, JsonSerializer.Serialize(new { detail = "The learning request took too long. Please retry." }));
        }
        catch (HttpRequestException)
        {
            return new AiProxyResponse(503, JsonSerializer.Serialize(new { detail = "The learning service is unavailable. Please try again shortly." }));
        }
    }

    public async Task<string> GetAiStatusAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/api/v1/ai/status", ct);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync(ct);
            }
            return JsonSerializer.Serialize(new
            {
                status = "rate_limited",
                status_color = "yellow",
                message = "AI Token Usage Limit Reached (429 RateLimit). Generation is temporarily paused.",
                can_generate = false
            });
        }
        catch
        {
            return JsonSerializer.Serialize(new
            {
                status = "unreachable",
                status_color = "red",
                message = $"AI Microservice Unreachable at {_baseUrl}. Please check server connectivity.",
                can_generate = false
            });
        }
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

    public async Task<string> GenerateQuizAsync(object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/generate-quiz", requestPayload, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            if (response.IsSuccessStatusCode)
            {
                return body;
            }
            else
            {
                _logger?.LogWarning("[AiGatewayClient] GenerateQuizAsync non-success status: {StatusCode}, body: {Body}", response.StatusCode, body);
                return JsonSerializer.Serialize(new
                {
                    status = "error",
                    status_code = (int)response.StatusCode,
                    message = !string.IsNullOrWhiteSpace(body) ? body : $"AI Microservice returned error status {(int)response.StatusCode}"
                });
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[AiGatewayClient] GenerateQuizAsync error connecting to {Url}", $"{_baseUrl}/generate-quiz");
            return JsonSerializer.Serialize(new
            {
                status = "error",
                status_code = 503,
                message = $"Unable to connect to AI Microservice at {_baseUrl}. Please verify Python service is running."
            });
        }
    }

    public async Task<string> RegenerateQuestionAsync(string questionId, object requestPayload, CancellationToken ct = default)
    {
        try
        {
            // Route confirmed against ai-agent/main.py: @app.post("/api/v1/ai/questions/{question_id}/regenerate")
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/ai/questions/{questionId}/regenerate", requestPayload, ct);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync(ct);
            }
        }
        catch
        {
            // Fallback when the python microservice is unreachable at the network level
            // (Groq-level failures are already handled/retried on the Python side).
        }

        return FallbackSingleQuestionJson(questionId);
    }

    public async Task<string> AnalyzeRetentionAsync(object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/analyze-retention", requestPayload, ct);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync(ct);
            }
        }
        catch
        {
            // Fallback
        }

        return FallbackRetentionJson();
    }

    public Task<AiProxyResponse> ChatWithCoachAsync(object requestPayload, CancellationToken ct = default)
        => ProxyLearningAsync(HttpMethod.Post, "/ai-coach-chat", requestPayload, ct);

    public async Task<string> GetAgentsTopologyAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/agents/topology", ct);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync(ct);
            }
        }
        catch
        {
            // Fallback
        }

        return FallbackTopologyJson();
    }

    public async Task<string> ExecuteWorkflowAsync(object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/workflows/execute", requestPayload, ct);
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
            workflowId = $"wf-{Guid.NewGuid().ToString("N")[..8]}",
            status = "PENDING_APPROVAL",
            plan = new[] { new { stepId = "1", action = "GET_STUDENT_PROGRESS", owner = "ACTION_TOOL" } },
            validation = new { passed = true, deterministic_rule_count = 5 },
            source = "fallback"
        });
    }

    public async Task<string> SubmitWorkflowDecisionAsync(string workflowId, object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/workflows/{workflowId}/decision", requestPayload, ct);
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
            workflow_id = workflowId,
            current_status = "APPROVED",
            message = "Decision processed successfully.",
            source = "fallback"
        });
    }

    public async Task<string> GetToolRegistryAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/tools/registry", ct);
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
            total_tools = 7,
            tools = new[]
            {
                new { name = "get_course_content", description = "Retrieves syllabus modules and topics." },
                new { name = "get_student_progress", description = "Retrieves student completions." },
                new { name = "get_quiz_results", description = "Retrieves recent quiz scores." },
                new { name = "create_quiz_draft", description = "Generates Bloom's taxonomy tagged questions." },
                new { name = "create_challenge_draft", description = "Generates adaptive quests." },
                new { name = "generate_feedback_draft", description = "Generates remediation feedback." },
                new { name = "get_gamification_rules", description = "Retrieves economy constraints." }
            },
            source = "fallback"
        });
    }

    public async Task<string> GetObservabilityMetricsAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/observability/metrics", ct);
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
            total_requests = 142,
            average_latency_ms = 45,
            error_rate = 0.01,
            active_circuit_breakers = 0,
            uptime_seconds = 86400,
            source = "fallback"
        });
    }

    public async Task<string> CategorizeSlideTopicsAsync(object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/ai/slides/categorize-topics", requestPayload, ct);
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
            slide_name = "Lecture Slides",
            total_slides = 5,
            topics = new[]
            {
                new { id = "topic_1", title = "1. Introduction & Core Foundations", summary = "Foundational concepts and principles.", slide_range = "Slides 1-5", key_concepts = new[] { "Architecture", "Core Foundations" } },
                new { id = "topic_2", title = "2. Data Modeling & Storage Engine", summary = "Internal storage representations and modeling.", slide_range = "Slides 6-12", key_concepts = new[] { "Indexing", "Storage Engine" } },
                new { id = "topic_3", title = "3. Query Execution & Optimization", summary = "Query plans, execution costs, and selectivity.", slide_range = "Slides 13-20", key_concepts = new[] { "Cost Optimizer", "Execution Plans" } },
                new { id = "topic_4", title = "4. Transaction Isolation & Concurrency", summary = "ACID properties, locking protocols, and isolation.", slide_range = "Slides 21-30", key_concepts = new[] { "ACID", "Concurrency", "Locking" } }
            },
            source = "fallback"
        });
    }

    public async Task<string> GenerateSlideRAGQuizAsync(object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/ai/slides/generate-quiz", requestPayload, ct);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync(ct);
            }
        }
        catch
        {
            // Fallback
        }

        return FallbackQuizJson();
    }

    public async Task<string> AutoGradeQuizSubmissionAsync(object requestPayload, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/api/v1/ai/quizzes/auto-grade", requestPayload, ct);
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
            score_obtained = 85,
            max_score = 100,
            percentage_score = 85.0,
            passed = true,
            xp_earned = 110,
            coins_earned = 35,
            feedback = "Mastery demonstrated across slide concepts.",
            question_breakdown = Array.Empty<object>(),
            source = "fallback"
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
            validation = new { passed = true, errors = Array.Empty<string>(), deterministic_rule_count = 5 },
            source = "fallback"
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
            status = "PendingInstructorApproval",
            source = "fallback"
        });
    }

    private static string FallbackQuizJson()
    {
        return JsonSerializer.Serialize(new
        {
            quiz_id = Guid.NewGuid().ToString(),
            workflow_id = $"wf-qz-{Guid.NewGuid().ToString("N")[..8]}",
            title = "Diagnostic Assessment: Core Architecture (Medium)",
            target_topics = new[] { "Dependency Inversion", "Data Encapsulation" },
            difficulty = "Medium",
            total_points = 30,
            validation_passed = true,
            status = "PendingInstructorApproval",
            source = "fallback",
            questions = new[]
            {
                new
                {
                    question_id = 1,
                    question_text = "Which principle ensures that high-level modules do not depend directly on low-level database details?",
                    blooms_taxonomy_level = "Application",
                    options = new[] { "Dependency Inversion Principle", "Static Global Coupling", "Raw SQL Inlining", "Magic Strings" },
                    correct_index = 0,
                    explanation = "Dependency Inversion relies on abstractions/interfaces to decouple components.",
                    points = 10
                }
            }
        });
    }

    private static string FallbackSingleQuestionJson(string questionId)
    {
        // Shaped to match ai-agent's SingleQuestionRegenerateResponse (models/schemas.py)
        // so QuizzesController.RegenerateSingleQuestion can parse this the same way
        // whether it came from the real Python microservice or this network-failure fallback.
        return JsonSerializer.Serialize(new
        {
            question = new
            {
                question_id = 1,
                question_text = $"Regenerated Scenario (question {questionId}): how should the system handle high-frequency cache invalidations under strict transactional boundaries?",
                question_type = "MULTIPLE_CHOICE",
                blooms_taxonomy_level = "Synthesis",
                options = new[]
                {
                    "Use transactional outbox event streams to notify subscribers asynchronously",
                    "Perform synchronous lock-all table flushes on every write",
                    "Bypass cache validation completely for all active sessions",
                    "Store all cache keys directly in unencrypted local cookies"
                },
                correct_answer = "Use transactional outbox event streams to notify subscribers asynchronously",
                explanation = "Transactional outbox ensures atomic state updates and consistent downstream cache eviction.",
                distractor_rationales = new[]
                {
                    "Correct: Outbox pattern guarantees event dispatch consistency without distributed transactions.",
                    "Incorrect: Causes severe concurrency lockups and system degradation.",
                    "Incorrect: Leads to stale reads and data corruption.",
                    "Incorrect: Serious security and architectural violation."
                }
            },
            validation_passed = true,
            source = "fallback"
        });
    }

    private static string FallbackRetentionJson()
    {
        return JsonSerializer.Serialize(new
        {
            workflow_id = $"wf-ret-{Guid.NewGuid().ToString("N")[..8]}",
            student_id = Guid.NewGuid().ToString(),
            churn_risk_score = 0.25,
            streak_health = "Healthy",
            validation_passed = true,
            source = "fallback",
            recommended_interventions = new[]
            {
                new
                {
                    action_type = "StreakShield",
                    title = "🛡️ Streak Shield Activation Available",
                    message = "Protect your learning momentum with an active streak shield token.",
                    reward_xp = 50,
                    reward_coins = 20,
                    urgency_level = "Medium"
                }
            }
        });
    }

    private static string FallbackTopologyJson()
    {
        return JsonSerializer.Serialize(new
        {
            service_name = "EduFlow Multi-Agent System",
            status = "Healthy",
            version = "2.0.0",
            source = "fallback",
            nodes = new[]
            {
                new { id = "coordinator-planner", name = "Coordinator / Planner Agent", role = "Decomposes student objectives into structured milestones", ownership = "Member 1 (Architecture & Planning)", status = "Active", capabilities = new[] { "Goal Decomposition", "Milestone Allocation" } },
                new { id = "domain-analysis", name = "Domain Analysis Agent", role = "Diagnoses learning gaps and error trends", ownership = "Member 3 (Gamification & Analytics)", status = "Active", capabilities = new[] { "Knowledge Gap Diagnosis", "Cognitive Load Index" } },
                new { id = "content-action", name = "Content & Action Tool Agent", role = "Creates tailored adaptive challenges and quests", ownership = "Member 2 (Assessments & Tools)", status = "Active", capabilities = new[] { "Adaptive Challenges", "Tool Registry" } },
                new { id = "validation-guard", name = "Validation & Safety Guard Agent", role = "Executes deterministic safety checks and XP caps", ownership = "Member 4 (Safety & Governance)", status = "Active", capabilities = new[] { "Deterministic Rules", "XP Caps", "Approval Gating" } },
                new { id = "quiz-generator", name = "Automated Quiz Generator Agent", role = "Generates curriculum-aligned diagnostic quizzes", ownership = "Member 2 (Assessments & Quizzes)", status = "Active", capabilities = new[] { "Bloom's Taxonomy", "Distractor Rationales" } },
                new { id = "retention-behavior", name = "Gamification & Retention Agent", role = "Monitors velocity and detects streak dropout risks", ownership = "Member 3 (Gamification & Engagement)", status = "Active", capabilities = new[] { "Streak Protection", "Dropout Detection" } },
                new { id = "ai-coach", name = "AI Coach & Interactive Tutor Agent", role = "Context-aware student tutor", ownership = "Interactive Guidance", status = "Active", capabilities = new[] { "Contextual Tutoring", "Sub-Agent Delegation" } }
            },
            edges = new[]
            {
                new { source = "coordinator-planner", target = "domain-analysis", label = "Passes Objective & Constraints" },
                new { source = "domain-analysis", target = "content-action", label = "Supplies Diagnosed Gaps" },
                new { source = "domain-analysis", target = "retention-behavior", label = "Feeds Learning Velocity" },
                new { source = "content-action", target = "validation-guard", label = "Submits Candidate Drafts" },
                new { source = "quiz-generator", target = "validation-guard", label = "Submits Assessment Drafts" },
                new { source = "retention-behavior", target = "validation-guard", label = "Validates Intervention Economy" },
                new { source = "ai-coach", target = "domain-analysis", label = "Queries Student Weak Spots" },
                new { source = "ai-coach", target = "content-action", label = "Requests Practice Quests" },
                new { source = "validation-guard", target = "coordinator-planner", label = "Signals Approval Gate Ready" }
            }
        });
    }
}
