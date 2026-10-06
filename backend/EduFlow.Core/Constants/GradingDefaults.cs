using System;
using System.Collections.Generic;

namespace EduFlow.Core.Constants;

/// <summary>
/// The institution's default grading scale. It only initializes the GradingPolicy table;
/// every grade calculation reads the persisted policy, never these constants.
/// </summary>
public static class GradingDefaults
{
    public static readonly Guid InstitutionPolicyId = new("6a0e1b00-0000-4000-8000-000000000000");

    public static readonly IReadOnlyList<(string Label, decimal MinPercentage)> Bands = new[]
    {
        ("A+", 85m), ("A", 80m), ("A-", 75m), ("B+", 70m), ("B", 65m), ("B-", 60m),
        ("C+", 55m), ("C", 50m), ("C-", 45m), ("D", 40m), ("F", 0m)
    };
}
