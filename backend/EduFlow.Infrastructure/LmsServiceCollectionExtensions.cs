using EduFlow.Core.Events;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Events;
using EduFlow.Infrastructure.Services;
using EduFlow.Infrastructure.Services.Evaluation;
using EduFlow.Infrastructure.Services.Gamification;
using Microsoft.Extensions.DependencyInjection;

namespace EduFlow.Infrastructure;

public static class LmsServiceCollectionExtensions
{
    /// <summary>
    /// Registers the academic domain (access, attempts, evaluation, grading, progress), the
    /// gamification stack and the in-process domain event dispatcher. One registration point,
    /// used by the API and by test hosts.
    /// </summary>
    public static IServiceCollection AddLmsDomainServices(this IServiceCollection services)
    {
        services.AddScoped<IPaymentVerificationService, PaymentVerificationService>();
        services.AddScoped<IAuditLogWriter, AuditLogWriter>();

        services.AddScoped<IAssessmentAccessService, AssessmentAccessService>();
        services.AddScoped<IAttemptService, AttemptService>();
        services.AddSingleton<IEvaluationService>(_ => new EvaluationService(EvaluationService.DefaultEvaluators()));
        services.AddScoped<IAttemptGradingService, AttemptGradingService>();
        services.AddScoped<IGradeService, GradeService>();
        services.AddScoped<IProgressService, ProgressService>();

        services.AddScoped<GamificationRuleSet>();
        services.AddScoped<PointsLedger>();
        services.AddScoped<AchievementService>();
        services.AddScoped<IGamificationService, GamificationService>();

        services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
        services.AddScoped<GamificationEventHandler>();
        services.AddScoped<IDomainEventHandler<AssessmentEvaluated>>(sp => sp.GetRequiredService<GamificationEventHandler>());
        services.AddScoped<IDomainEventHandler<LessonCompleted>>(sp => sp.GetRequiredService<GamificationEventHandler>());
        services.AddScoped<IDomainEventHandler<ChallengeCompleted>>(sp => sp.GetRequiredService<GamificationEventHandler>());
        services.AddScoped<IDomainEventHandler<CourseCompleted>>(sp => sp.GetRequiredService<GamificationEventHandler>());

        return services;
    }
}
