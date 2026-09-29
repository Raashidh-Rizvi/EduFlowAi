using System;
using System.Collections.Generic;
using System.Linq;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;

namespace EduFlow.Infrastructure.Data;

/// <summary>
/// Demo storefront catalogue for the public course marketplace (home page,
/// catalog, course detail). Seeds additional published courses across several
/// categories, each with a real curriculum (modules + lessons), a few
/// enrollments and approved reviews so that every number the storefront shows
/// — ratings, enrolment counts, category totals, "popular" ordering — is a
/// genuine aggregate rather than a placeholder.
///
/// SECURITY/DATA NOTES:
///   * Every seeded course is IsPublished = true; drafts are never part of the
///     public catalogue and drafts are hidden by the marketplace endpoints.
///   * Every seeded review is Status = Approved and belongs to a student who is
///     also seeded as enrolled, matching the platform's eligibility rules.
///   * Course.AverageRating / RatingCount are set from the exact review rows
///     inserted below, so they agree with what IRatingService would recalculate.
///
/// IDEMPOTENT: each course is guarded by its unique Code, so the seeder is a
/// no-op on subsequent startups and is safe to re-run after a partial failure.
/// </summary>
public static class MarketplaceSeedData
{
    private sealed record ModuleSpec(string Title, string Description, string[] Lessons);

    private sealed record ReviewSpec(int Rating, string Comment);

    private sealed record CourseSpec(
        string Code,
        string Title,
        string Description,
        string Category,
        DifficultyLevel Difficulty,
        int DurationHours,
        decimal Price,
        string ThumbnailUrl,
        int EnrollmentCount,
        ModuleSpec[] Modules,
        ReviewSpec[] Reviews,
        string ShortDescription = "",
        string[] LearningOutcomes = null,
        string[] Prerequisites = null,
        string[] TargetAudience = null,
        int XpReward = 0,
        bool CertificateEnabled = false,
        string Language = "English")
    {
        public bool IsFree => Price == 0m;
    }

    public static void Seed(ApplicationDbContext context)
    {
        var students = context.Users
            .Where(u => u.Role == UserRole.Student && u.IsActive)
            .OrderBy(u => u.Id)
            .ToList();
        if (students.Count == 0) return;

        var instructors = context.Users
            .Where(u => u.Role == UserRole.Instructor && u.IsActive)
            .OrderBy(u => u.Id)
            .ToList();
        if (instructors.Count == 0) return;

        var specs = Catalogue();

        for (var i = 0; i < specs.Length; i++)
        {
            var spec = specs[i];
            if (context.Courses.Any(c => c.Code == spec.Code)) continue;

            var course = new Course
            {
                Id = Guid.Parse($"44444444-4444-4444-4444-{0x100 + i:X12}"),
                Code = spec.Code,
                Title = spec.Title,
                Description = spec.Description,
                ShortDescription = spec.ShortDescription,
                Category = spec.Category,
                Term = "Fall 2026",
                ThumbnailUrl = spec.ThumbnailUrl,
                InstructorId = instructors[i % instructors.Count].Id,
                IsPublished = true,
                Status = "Published",
                Difficulty = spec.Difficulty,
                DurationHours = spec.DurationHours,
                Price = spec.Price,
                IsFree = spec.IsFree,
                Language = spec.Language,
                XpReward = spec.XpReward,
                CertificateEnabled = spec.CertificateEnabled,
                LearningOutcomesJson = System.Text.Json.JsonSerializer.Serialize(spec.LearningOutcomes ?? Array.Empty<string>()),
                PrerequisitesJson = System.Text.Json.JsonSerializer.Serialize(spec.Prerequisites ?? Array.Empty<string>()),
                TargetAudienceJson = System.Text.Json.JsonSerializer.Serialize(spec.TargetAudience ?? Array.Empty<string>()),
                AverageRating = spec.Reviews.Length > 0
                    ? Math.Round(spec.Reviews.Average(r => r.Rating), 2)
                    : 0.0,
                RatingCount = spec.Reviews.Length,
                CreatedAt = DateTime.UtcNow.AddDays(-14 - (i * 3)),
                UpdatedAt = DateTime.UtcNow.AddDays(-14 - (i * 3))
            };
            context.Courses.Add(course);

            for (var m = 0; m < spec.Modules.Length; m++)
            {
                var moduleSpec = spec.Modules[m];
                var module = new Module
                {
                    Id = Guid.Parse($"55555555-5555-5555-5555-{0x100 + (i * 10) + m:X12}"),
                    CourseId = course.Id,
                    Title = moduleSpec.Title,
                    Description = moduleSpec.Description,
                    OrderIndex = m + 1,
                    Status = "Published"
                };
                context.Modules.Add(module);

                for (var l = 0; l < moduleSpec.Lessons.Length; l++)
                {
                    context.Lessons.Add(new Lesson
                    {
                        ModuleId = module.Id,
                        Title = moduleSpec.Lessons[l],
                        Content = $"Lesson {l + 1} of {moduleSpec.Title}.",
                        OrderIndex = l + 1,
                        EstimatedMinutes = 15 + (l * 5),
                        XpReward = 25
                    });
                }
            }

            // Enrolments: a spread of real students so "popular" ordering and the
            // enrolment counters reflect data instead of hardcoded numbers.
            var enrolled = students
                .Take(Math.Min(students.Count, spec.EnrollmentCount))
                .ToList();

            for (var e = 0; e < enrolled.Count; e++)
            {
                context.Enrollments.Add(new Enrollment
                {
                    StudentId = enrolled[e].Id,
                    CourseId = course.Id,
                    ProgressPercentage = 10.0 + ((e * 17) % 80),
                    Status = EnrollmentStatus.Active,
                    RequestedAt = DateTime.UtcNow.AddDays(-12),
                    CreatedAt = DateTime.UtcNow.AddDays(-12)
                });
            }

            // Reviews: only from enrolled students, Approved, one per student.
            for (var r = 0; r < spec.Reviews.Length && r < enrolled.Count; r++)
            {
                context.CourseReviews.Add(new CourseReview
                {
                    CourseId = course.Id,
                    StudentId = enrolled[r].Id,
                    Rating = spec.Reviews[r].Rating,
                    Comment = spec.Reviews[r].Comment,
                    Status = ReviewStatus.Approved,
                    CreatedAt = DateTime.UtcNow.AddDays(-6 + r)
                });
            }
        }

        context.SaveChanges();
    }

    /// <summary>The demo catalogue: ten published courses over six categories.</summary>
    private static CourseSpec[] Catalogue() => new[]
    {
        new CourseSpec(
            "AI-210",
            "Machine Learning Foundations",
            "From linear regression to ensemble methods: build, evaluate and deploy classical ML models with clean, reproducible Python notebooks.",
            "Artificial Intelligence",
            DifficultyLevel.Easy,
            20,
            0m,
            "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600",
            4,
            new[]
            {
                new ModuleSpec(
                    "Supervised Learning",
                    "Regression, classification, feature engineering and the bias-variance trade-off.",
                    new[] { "Linear & logistic regression", "Trees, forests and boosting", "Feature engineering pipeline" }),
                new ModuleSpec(
                    "Model Evaluation",
                    "Cross-validation, metrics selection and honest reporting of results.",
                    new[] { "Train/validation/test splits", "Metrics that matter", "Avoiding leakage" })
            },
            new[]
            {
                new ReviewSpec(5, "The evaluation module alone was worth it — finally understand why accuracy lies."),
                new ReviewSpec(4, "Well paced for beginners, the notebooks run out of the box."),
                new ReviewSpec(5, "Clear explanations and practical projects.")
            }),
        new CourseSpec(
            "AI-330",
            "Deep Learning with Neural Networks",
            "Train convolutional and sequence models in PyTorch: architectures, regularization, training schedules and deploying models behind an API.",
            "Artificial Intelligence",
            DifficultyLevel.Hard,
            32,
            59.99m,
            "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600",
            3,
            new[]
            {
                new ModuleSpec(
                    "Convolutional Networks",
                    "CNN architectures, residual connections and transfer learning for vision.",
                    new[] { "Convolution & pooling", "ResNets and transfer learning", "Augmentation strategies" }),
                new ModuleSpec(
                    "Sequence Models",
                    "Recurrent networks, attention and transformers from first principles.",
                    new[] { "RNNs and LSTMs", "Attention explained", "Fine-tuning transformers" })
            },
            new[]
            {
                new ReviewSpec(5, "Transformers from first principles — best deep learning course I have taken."),
                new ReviewSpec(4, "Dense but the weekly checkpoints keep you honest.")
            }),
        new CourseSpec(
            "DS-201",
            "Data Analysis with Python",
            "Clean, transform and visualise real datasets with NumPy, pandas and matplotlib, then tell a story with a polished notebook report.",
            "Data Science",
            DifficultyLevel.Easy,
            16,
            0m,
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600",
            4,
            new[]
            {
                new ModuleSpec(
                    "NumPy & pandas",
                    "Vectorised computing, joins, group-by and tidy data principles.",
                    new[] { "Arrays and broadcasting", "DataFrames in practice", "Joins and reshaping" }),
                new ModuleSpec(
                    "Visualisation & Storytelling",
                    "Charts that communicate, and a reproducible analysis pipeline.",
                    new[] { "Choosing the right chart", "Annotation & emphasis", "Publishing notebooks" })
            },
            new[]
            {
                new ReviewSpec(5, "Practical from minute one — you work with messy real data."),
                new ReviewSpec(4, "Great refresher on pandas group-by tricks."),
                new ReviewSpec(5, "The final report template is now my team standard.")
            }),
        new CourseSpec(
            "DS-340",
            "Statistics for Machine Learning",
            "Inference, hypothesis testing and Bayesian thinking explained for practitioners who need to defend their models with evidence.",
            "Data Science",
            DifficultyLevel.Medium,
            22,
            39.99m,
            "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600",
            3,
            new[]
            {
                new ModuleSpec(
                    "Statistical Inference",
                    "Sampling distributions, confidence intervals and hypothesis tests you can explain.",
                    new[] { "Distributions that matter", "Confidence intervals", "p-values without myths" }),
                new ModuleSpec(
                    "Bayesian Thinking",
                    "Priors, posteriors and decision making under uncertainty.",
                    new[] { "Bayes in code", "Hierarchical models", "A/B testing with Bayes" })
            },
            new[]
            {
                new ReviewSpec(4, "Finally understand what a p-value is not."),
                new ReviewSpec(5, "The A/B testing module changed how we run experiments.")
            }),
        new CourseSpec(
            "CS-410",
            "Operating Systems Internals",
            "Processes, memory management, scheduling and filesystems — trace a syscall from user space to disk on a real kernel.",
            "Computer Science",
            DifficultyLevel.Hard,
            28,
            49.99m,
            "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
            3,
            new[]
            {
                new ModuleSpec(
                    "Processes & Memory",
                    "Scheduling, virtual memory, paging and the cost of a context switch.",
                    new[] { "Process lifecycle", "Virtual memory & page faults", "Schedulers compared" }),
                new ModuleSpec(
                    "Storage & Filesystems",
                    "Block devices, journaling and crash consistency.",
                    new[] { "From inode to disk", "Journaling explained", "Crash-consistency labs" })
            },
            new[]
            {
                new ReviewSpec(5, "The memory labs are brutal in the best way."),
                new ReviewSpec(4, "Excellent maps of what happens on a syscall."),
                new ReviewSpec(5, "Worth every hour — I read kernel code with confidence now.")
            }),
        new CourseSpec(
            "CS-150",
            "Programming Fundamentals in C#",
            "Start from zero: variables to classes, LINQ to async — build small programs every lesson and graduate to real projects.",
            "Computer Science",
            DifficultyLevel.Easy,
            14,
            0m,
            "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600",
            4,
            new[]
            {
                new ModuleSpec(
                    "Language Basics",
                    "Types, control flow, methods and debugging habits that stick.",
                    new[] { "Variables & control flow", "Methods and scope", "Debugging like a pro" }),
                new ModuleSpec(
                    "Object-Oriented Thinking",
                    "Classes, interfaces and collections — model real problems in code.",
                    new[] { "Classes & encapsulation", "Interfaces & polymorphism", "Collections & LINQ" })
            },
            new[]
            {
                new ReviewSpec(5, "Perfect first course — my students finish it and keep going."),
                new ReviewSpec(4, "Clear pacing, exercises are well scoped."),
                new ReviewSpec(5, "The LINQ chapter alone deserves five stars."),
                new ReviewSpec(4, "Friendly for complete beginners.")
            }),
        new CourseSpec(
            "SE-220",
            "API Design & Microservices",
            "Design contracts that age well: REST and messaging patterns, idempotency, retries, observability and graceful degradation.",
            "Software Engineering",
            DifficultyLevel.Medium,
            18,
            0m,
            "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600",
            4,
            new[]
            {
                new ModuleSpec(
                    "Contracts & Versioning",
                    "Resource modelling, errors, pagination and backwards-compatible change.",
                    new[] { "Modelling resources", "Errors & status codes", "Versioning without pain" }),
                new ModuleSpec(
                    "Resilience Patterns",
                    "Timeouts, retries, circuit breakers and backpressure under load.",
                    new[] { "Retries that help", "Circuit breakers", "Load shedding" })
            },
            new[]
            {
                new ReviewSpec(5, "The idempotency chapter fixed a production bug for us."),
                new ReviewSpec(4, "Great pattern catalogue, keep it updated."),
                new ReviewSpec(5, "Best API course on the platform.")
            }),
        new CourseSpec(
            "UX-110",
            "UI/UX Design Principles",
            "Layout, hierarchy, typography and colour — design interfaces that read instantly and hold up in accessibility audits.",
            "Design",
            DifficultyLevel.Easy,
            12,
            0m,
            "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600",
            3,
            new[]
            {
                new ModuleSpec(
                    "Visual Hierarchy",
                    "What the eye sees first, and how to guide it deliberately.",
                    new[] { "Spacing & alignment", "Type scale & contrast", "Colour with intent" }),
                new ModuleSpec(
                    "Interaction & Accessibility",
                    "States, feedback and WCAG-friendly defaults.",
                    new[] { "States & feedback", "Keyboard & focus", "Accessible colour pairs" })
            },
            new[]
            {
                new ReviewSpec(5, "Our whole team went through this together — worth it."),
                new ReviewSpec(4, "Short, sharp and immediately applicable."),
                new ReviewSpec(4, "The accessibility checklist is gold.")
            }),
        new CourseSpec(
            "UX-260",
            "Design Systems at Scale",
            "Tokens, components and governance: build a design system that survives three product teams and two rebrands.",
            "Design",
            DifficultyLevel.Medium,
            15,
            29.99m,
            "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600",
            2,
            new[]
            {
                new ModuleSpec(
                    "Design Tokens",
                    "Naming, theming and shipping tokens from Figma to code.",
                    new[] { "Token taxonomy", "Theming strategies", "Figma-to-code pipelines" }),
                new ModuleSpec(
                    "Component Governance",
                    "Versioning, adoption metrics and contribution workflows.",
                    new[] { "Versioning & deprecation", "Adoption dashboards", "Contribution model" })
            },
            new[]
            {
                new ReviewSpec(5, "Solved our token naming wars in one weekend."),
                new ReviewSpec(4, "Practical governance advice, not theory.")
            }),
        new CourseSpec(
            "BUS-305",
            "Product Management Essentials",
            "Discovery interviews, opportunity sizing and roadmaps that survive contact with engineering — ship the right thing, not everything.",
            "Business",
            DifficultyLevel.Medium,
            12,
            24.99m,
            "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600",
            3,
            new[]
            {
                new ModuleSpec(
                    "Discovery",
                    "User research, problem framing and opportunity trees.",
                    new[] { "Interviewing users", "Problem framing", "Opportunity sizing" }),
                new ModuleSpec(
                    "Delivery & Roadmaps",
                    "Outcome-based planning, prioritisation and stakeholder alignment.",
                    new[] { "Outcomes over output", "Prioritisation frameworks", "Roadmap communication" })
            },
            new[]
            {
                new ReviewSpec(5, "The opportunity-sizing template is now standard here."),
                new ReviewSpec(4, "Concise and free of buzzword soup."),
                new ReviewSpec(4, "Helped me move from feature factory to outcomes.")
            },
            ShortDescription: "Discovery, sizing and roadmaps that survive engineering.",
            LearningOutcomes: new[]
            {
                "Run discovery interviews that surface real problems",
                "Size opportunities with defensible assumptions",
                "Write outcome-based roadmaps",
                "Prioritise with confidence and communicate trade-offs"
            },
            TargetAudience: new[] { "Aspiring product managers", "Engineers moving into product", "Founders shipping their first product" },
            XpReward: 900),

        // ── Metadata for the remaining catalogue entries ─────────────────────────
        // (positional args above end at Reviews; these named upgrades run afterwards
        // via the course variable below, so existing specs stay untouched)
        new CourseSpec(
            "WS-101",
            "Cloud Foundations & Deployment",
            "Ship real services: containers, CI/CD pipelines, environments, monitoring and the deployment habits that keep Friday releases boring.",
            "Software Engineering",
            DifficultyLevel.Medium,
            18,
            34.99m,
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600",
            2,
            new[]
            {
                new ModuleSpec(
                    "Containers & Images",
                    "Dockerfiles, layers, and images that build the same everywhere.",
                    new[] { "Dockerfile fundamentals", "Multi-stage builds", "Registry workflows" }),
                new ModuleSpec(
                    "Pipelines & Observability",
                    "CI/CD, health checks and alerting you can act on.",
                    new[] { "Pipeline as code", "Health checks & probes", "Meaningful alerts" })
            },
            new[]
            {
                new ReviewSpec(5, "First course where my deploy actually worked afterwards."),
                new ReviewSpec(4, "Solid, practical pipeline material.")
            },
            ShortDescription: "Containers, CI/CD and deployment habits that keep releases boring.",
            LearningOutcomes: new[]
            {
                "Containerise applications with Docker",
                "Build a CI/CD pipeline from scratch",
                "Design environments and configuration strategy",
                "Monitor services with actionable alerting",
                "Deploy to production with zero-downtime patterns"
            },
            Prerequisites: new[] { "Basic command line comfort", "One programming language" },
            TargetAudience: new[] { "Backend developers", "Devs moving to DevOps", "Students building portfolio projects" },
            XpReward: 1200,
            CertificateEnabled: true),

        new CourseSpec(
            "CS-520",
            "Distributed Systems in Practice",
            "Consensus, replication, partitioning and the CAP theorem through hands-on labs — engineer systems that stay correct when networks misbehave.",
            "Computer Science",
            DifficultyLevel.Hard,
            30,
            69.99m,
            "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600",
            2,
            new[]
            {
                new ModuleSpec(
                    "Replication & Consistency",
                    "Leader election, quorums and the consistency models that matter.",
                    new[] { "Leader election labs", "Quorum reads & writes", "Consistency models compared" }),
                new ModuleSpec(
                    "Partition Tolerance",
                    "Detecting failures, healing state and designing for the inevitable split.",
                    new[] { "Failure detection", "State reconciliation", "Designing for splits" })
            },
            new[]
            {
                new ReviewSpec(5, "The partition labs changed how I design every service."),
                new ReviewSpec(4, "Challenging and fair — great labs.")
            },
            ShortDescription: "Consensus, replication and partition tolerance through real labs.",
            LearningOutcomes: new[]
            {
                "Explain consensus algorithms and their trade-offs",
                "Choose replication strategies for real workloads",
                "Design partition-tolerant data flows",
                "Debug distributed systems with intent"
            },
            Prerequisites: new[] { "Solid networking basics", "Comfort with concurrency" },
            TargetAudience: new[] { "Senior developers", "Platform engineers", "Graduate students" },
            XpReward: 1500,
            CertificateEnabled: true),

        new CourseSpec(
            "AI-110",
            "Prompt Engineering for Product Teams",
            "From zero to reliable LLM features: prompting patterns, evaluation harnesses and shipping AI features users trust.",
            "Artificial Intelligence",
            DifficultyLevel.Easy,
            10,
            0m,
            "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600",
            2,
            new[]
            {
                new ModuleSpec(
                    "Prompting Patterns",
                    "Few-shot, chain-of-thought and structured outputs that behave.",
                    new[] { "Instructions that stick", "Few-shot examples", "Structured outputs" }),
                new ModuleSpec(
                    "Evaluation & Shipping",
                    "Golden sets, regression tests and guarding user trust.",
                    new[] { "Golden datasets", "Regression harness", "Shipping guardrails" })
            },
            new[]
            {
                new ReviewSpec(4, "Practical patterns we shipped the same week."),
                new ReviewSpec(5, "The eval harness chapter is worth the price.")
            },
            ShortDescription: "Reliable LLM features: patterns, evaluation and shipping.",
            LearningOutcomes: new[]
            {
                "Write prompts that behave reliably in production",
                "Build an evaluation harness for AI features",
                "Ship LLM features with guardrails users trust"
            },
            TargetAudience: new[] { "Product teams adding AI features", "Developers new to LLMs" },
            XpReward: 600)
    };
}
