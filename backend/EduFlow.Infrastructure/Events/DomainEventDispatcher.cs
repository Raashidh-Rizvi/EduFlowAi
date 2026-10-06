using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Events;
using EduFlow.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace EduFlow.Infrastructure.Events;

public class DomainEventDispatcher : IDomainEventDispatcher
{
    private readonly IServiceProvider _serviceProvider;

    public DomainEventDispatcher(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<IReadOnlyList<object>> PublishAsync<TEvent>(TEvent domainEvent, CancellationToken ct = default)
        where TEvent : IDomainEvent
    {
        var results = new List<object>();
        foreach (var handler in _serviceProvider.GetServices<IDomainEventHandler<TEvent>>())
        {
            var result = await handler.HandleAsync(domainEvent, ct);
            if (result != null) results.Add(result);
        }
        return results;
    }
}
