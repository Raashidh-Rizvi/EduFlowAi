import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../services/api_service.dart';

class JourneyScreen extends StatefulWidget {
  final Function(Map<String, dynamic> node) onSelectNode;

  const JourneyScreen({Key? key, required this.onSelectNode}) : super(key: key);

  @override
  State<JourneyScreen> createState() => _JourneyScreenState();
}

class _JourneyScreenState extends State<JourneyScreen> {
  List<Map<String, dynamic>> _nodes = [];
  bool _isLoading = true;
  String? _errorMessage;
  final _dio = ApiService.createDio();

  @override
  void initState() {
    super.initState();
    _loadJourneyNodes();
  }

  Future<void> _loadJourneyNodes() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Fetch enrolled courses for the current student
      final coursesResp = await _dio.get('/students/me/courses');
      final enrollments = coursesResp.data as List<dynamic>? ?? [];

      if (enrollments.isEmpty) {
        setState(() {
          _nodes = [];
          _isLoading = false;
        });
        return;
      }

      // Use the first enrolled course hierarchy to build journey nodes
      final firstCourse = enrollments.first as Map<String, dynamic>;
      final courseId = firstCourse['courseId'] ?? firstCourse['id'];

      final hierarchyResp = await _dio.get('/courses/$courseId/hierarchy');
      final hierarchy = hierarchyResp.data as Map<String, dynamic>;
      final modules = hierarchy['modules'] as List<dynamic>? ?? [];

      final List<Map<String, dynamic>> nodes = [];
      for (final mod in modules) {
        final modMap = mod as Map<String, dynamic>;
        final moduleTitle = modMap['title'] as String? ?? 'Module';
        final topics = modMap['topics'] as List<dynamic>? ?? [];

        // Add each topic as a journey node
        for (final topic in topics) {
          final topicMap = topic as Map<String, dynamic>;
          final quizCount = topicMap['quizCount'] as int? ?? 0;
          final contentItems = topicMap['contentItems'] as List<dynamic>? ?? [];
          final isCompleted = contentItems.isNotEmpty &&
              contentItems.every((ci) => (ci as Map<String, dynamic>)['isCompleted'] == true);
          final xp = (topicMap['estimatedMinutes'] as int? ?? 30) * 3;

          nodes.add({
            'id': topicMap['id'],
            'title': topicMap['title'] ?? 'Topic',
            'moduleTitle': moduleTitle,
            'type': quizCount > 0 ? 'challenge' : 'lesson',
            'icon': quizCount > 0 ? '⚔️' : '📖',
            'status': isCompleted ? 'completed' : 'active',
            'xp': xp,
            'duration': '${topicMap['estimatedMinutes'] ?? 30}m',
            'desc': topicMap['description'] ?? 'Explore $moduleTitle content.',
            'quizCount': quizCount,
          });
        }

        // Add module-level quizzes as boss nodes
        final moduleQuizzes = modMap['quizzes'] as List<dynamic>? ?? [];
        for (final quiz in moduleQuizzes) {
          final quizMap = quiz as Map<String, dynamic>;
          nodes.add({
            'id': quizMap['id'],
            'title': quizMap['title'] ?? 'Module Quiz',
            'moduleTitle': moduleTitle,
            'type': 'boss',
            'icon': '👹',
            'status': 'locked',
            'xp': quizMap['xpReward'] ?? 200,
            'duration': '${quizMap['timeLimitMinutes'] ?? 20}m',
            'desc': quizMap['description'] ?? 'Module assessment quiz.',
            'quizCount': 1,
          });
        }
      }

      setState(() {
        _nodes = nodes;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Unable to load course journey. Please check your connection.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgSurface,
        title: const Text('World Journey Map 🗺️'),
        actions: [
          if (!_isLoading)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadJourneyNodes,
              tooltip: 'Refresh',
            ),
        ],
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading your journey...', style: TextStyle(color: AppTheme.textMuted)),
                ],
              ),
            )
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppTheme.error),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppTheme.textMuted),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: _loadJourneyNodes,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _nodes.isEmpty
                  ? Center(
                      child: Text(
                        'No course content found.\nEnroll in a course to start your journey!',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppTheme.textMuted),
                      ),
                    )
                  : ListView.builder(
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
                              onTap: () => widget.onSelectNode(node),
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
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: isCompleted
                                            ? AppTheme.success.withOpacity(0.2)
                                            : isActive
                                                ? AppTheme.primary.withOpacity(0.25)
                                                : AppTheme.textMain.withOpacity(0.05),
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
                                                    color: isCompleted || isActive
                                                        ? AppTheme.textMain
                                                        : AppTheme.textMuted,
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
                                            style: TextStyle(
                                                color: AppTheme.textMuted, fontSize: 11.5),
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
                            if (index < _nodes.length - 1)
                              Container(
                                width: 3,
                                height: 24,
                                margin: const EdgeInsets.symmetric(vertical: 4),
                                decoration: BoxDecoration(
                                  color: isCompleted
                                      ? AppTheme.success.withOpacity(0.4)
                                      : AppTheme.borderSubtle,
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

