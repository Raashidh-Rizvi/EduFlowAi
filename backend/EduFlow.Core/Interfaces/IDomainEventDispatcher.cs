using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Events;

namespace EduFlow.Core.Interfaces;

/// <summary>Reacts to one kind of domain event. Runs inside the publisher's transaction.</summary>
public interface IDomainEventHandler<in TEvent> where TEvent : IDomainEvent
{
    /// <returns>An optional result the publisher may surface (e.g. the XP awarded), or null.</returns>
    Task<object?> HandleAsync(TEvent domainEvent, CancellationToken ct = default);
}

/// <summary>
/// In-process, synchronous event dispatch. Handlers run in the caller's scope and database
/// transaction, so an event and its consequences commit or roll back together.
/// </summary>
public interface IDomainEventDispatcher
{
    Task<IReadOnlyList<object>> PublishAsync<TEvent>(TEvent domainEvent, CancellationToken ct = default)
        where TEvent : IDomainEvent;
}
