import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class JourneyScreen extends StatelessWidget {
  final Function(Map<String, dynamic> node) onSelectNode;

  const JourneyScreen({Key? key, required this.onSelectNode}) : super(key: key);

  final List<Map<String, dynamic>> _nodes = const [
    {
      'id': 1,
      'title': '1. Clean Architecture Domain Isolation',
      'type': 'lesson',
      'icon': '🌱',
      'status': 'completed',
      'xp': 150,
      'duration': '25m',
      'desc': 'Core entities, domain rules, and dependency inversion in .NET 8.'
    },
    {
      'id': 2,
      'title': '2. PostgreSQL Relational Schemas & Indexes',
      'type': 'lab',
      'icon': '🧩',
      'status': 'completed',
      'xp': 200,
      'duration': '35m',
      'desc': 'Composite indexing, EXPLAIN ANALYZE queries, and table partitions.'
    },
    {
      'id': 3,
      'title': '3. EF Core Migrations & Transactions',
      'type': 'challenge',
      'icon': '⚔️',
      'status': 'active',
      'xp': 350,
      'duration': '40m',
      'desc': 'ACID boundaries, concurrency tokens, and optimistic locking.'
    },
    {
      'id': 4,
      'title': '4. Multi-Agent LangGraph Swarm Node',
      'type': 'ai',
      'icon': '🤖',
      'status': 'locked',
      'xp': 400,
      'duration': '45m',
      'desc': 'State machine graphs, deterministic schema guards, and audit trails.'
    },
    {
      'id': 5,
      'title': '5. Dungeon Boss: PostgreSQL Concurrency Raid',
      'type': 'boss',
      'icon': '👹',
      'status': 'locked',
      'xp': 500,
      'duration': '20m',
      'desc': 'Defeat the 15-scenario deadlock raid to unlock the Boss Slayer Trophy!'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgSurface,
        title: const Text('World Journey Map 🗺️'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
        itemCount: _nodes.length,
        itemBuilder: (context, index) {
          final node = _nodes[index];
          final isCompleted = node['status'] == 'completed';
          final isActive = node['status'] == 'active';
          final isBoss = node['type'] == 'boss';

          return Column(
            children: [
              InkWell(
                onTap: () => onSelectNode(node),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? AppTheme.success.withOpacity(0.08)
                        : isActive
                            ? AppTheme.primary.withOpacity(0.15)
                            : AppTheme.bgSurface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isBoss
                          ? AppTheme.accent.withOpacity(0.5)
                          : isCompleted
                              ? AppTheme.success.withOpacity(0.3)
                              : isActive
                                  ? AppTheme.borderAccent
                                  : AppTheme.borderSubtle,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Node Icon Badge
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isCompleted
                              ? AppTheme.success.withOpacity(0.2)
                              : isActive
                                  ? AppTheme.primary.withOpacity(0.25)
                                  : Colors.white.withOpacity(0.05),
                        ),
                        child: Center(
                          child: Text(
                            isCompleted ? '✓' : node['icon'],
                            style: TextStyle(
                              fontSize: isCompleted ? 20 : 22,
                              fontWeight: FontWeight.w900,
                              color: isCompleted ? AppTheme.success : null,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Node Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    node['title'],
                                    style: TextStyle(
                                      color: isCompleted || isActive ? AppTheme.textMain : AppTheme.textMuted,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13.5,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '+${node['xp']} XP',
                                  style: TextStyle(
                                    color: isBoss ? AppTheme.accent : AppTheme.warning,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              node['desc'],
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Connecting Path Line between nodes
              if (index < _nodes.length - 1)
                Container(
                  width: 3,
                  height: 24,
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  decoration: BoxDecoration(
                    color: isCompleted ? AppTheme.success.withOpacity(0.4) : AppTheme.borderSubtle,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
