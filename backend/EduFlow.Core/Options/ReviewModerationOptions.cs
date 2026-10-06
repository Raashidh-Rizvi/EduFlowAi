namespace EduFlow.Core.Options;

/// <summary>
/// Moderation behaviour for student course reviews, bound from the
/// <c>ReviewModeration</c> configuration section.
/// </summary>
public class ReviewModerationOptions
{
    /// <summary>
    /// When true, newly submitted (and newly edited) reviews start as
    /// <c>Pending</c> and only become visible/averaged after an administrator
    /// approves them. When false (default) reviews are auto-approved on submit
    /// and administrators moderate by rejecting them.
    /// </summary>
    public bool RequireApproval { get; set; } = false;
}
