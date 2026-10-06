import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/student_portal_service.dart';
import 'explore/explore_screen.dart';
import 'student/coach_tab.dart';
import 'student/course_detail_view.dart';
import 'student/enrollment_tab.dart';
import 'student/focus_tab.dart';
import 'student/home_tab.dart';
import 'student/leaderboard_tab.dart';
import 'student/portal_widgets.dart';
import 'student/profile_tab.dart';
import 'student/quiz_runner.dart';
import 'student/support_dialog.dart';

final _num = NumberFormat.decimalPattern();

const _fallbackQuestions = <Map<String, dynamic>>[
  {
    'id': 'q1',
    'prompt': 'What is the primary objective of microservices architecture?',
    'options': [
      'Loose coupling and independent deployability',
      'Single database for all services',
      'Monolithic code organization',
      'Eliminating HTTP communication',
    ],
  },
  {
    'id': 'q2',
    'prompt': 'How does indexing enhance database query performance?',
    'options': [
      'By establishing lookup trees to reduce sequential disk reads',
      'By compressing tables into text files',
      'By disabling transactions during read operations',
      'By translating SQL directly to HTML templates',
    ],
  },
  {
    'id': 'q3',
    'prompt':
        'What principle ensures high-level policy does not depend on low-level detail?',
    'options': [
      'Dependency Inversion Principle (DIP)',
      'Single Responsibility Principle (SRP)',
      'Open/Closed Principle (OCP)',
      'Liskov Substitution Principle (LSP)',
    ],
  },
];

class _TabDef {
  final String id;
  final String label;
  final IconData icon;
  const _TabDef(this.id, this.label, this.icon);
}

const _tabs = [
  _TabDef('enrollments', 'Enrollment', Icons.how_to_reg_outlined),
  _TabDef('browse', 'Browse', Icons.explore_outlined),
  _TabDef('home', 'Dashboard', Icons.home_outlined),
  _TabDef('focus', 'Focus & Flow', Icons.bolt_outlined),
  _TabDef('coach', 'AI Assistant', Icons.smart_toy_outlined),
  _TabDef('ranks', 'Rankings & Squad', Icons.emoji_events_outlined),
  _TabDef('profile', 'Profile', Icons.person_outline),
];

/// Student workspace shell, mirroring the web StudentPortal.
class MainNavigationScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const MainNavigationScreen({
    super.key,
    required this.user,
    required this.onLogout,
  });

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  final _enrollment = EnrollmentService();
  final _courseService = StudentCourseService();
  final _quizService = PortalQuizService();
  final _gamification = PortalGamificationService();

  String _activeTab = 'enrollments';
  Map<String, dynamic>? _activeQuiz;
  Map<String, dynamic>? _serverQuiz;
  String? _openCourseId;
  CourseAccessState _openAccess = const CourseAccessState();

  List<Map<String, dynamic>> _courses = [];
  bool _coursesLoading = true;
  List<Map<String, dynamic>> _requests = [];
  bool _requestsLoading = true;
  String? _busyCourseId;
  String? _studentId;

  late Map<String, dynamic> _profile;

  @override
  void initState() {
    super.initState();
    _profile = {
      'fullName': (widget.user['fullName'] ?? widget.user['name'] ?? 'Student')
          .toString(),
      'level': 1,
      'levelName': 'Novice',
      'totalXp': 0,
      'xpInLevel': 0,
      'xpToNext': 100,
      'coins': 0,
      'streak': 0,
      'freezeTokens': 0,
      'badges': <Map<String, dynamic>>[],
    };
    _loadStudentData().whenComplete(() {
      if (mounted) setState(() => _coursesLoading = false);
    });
  }

  // ---------------------------------------------------------------- loading

  Future<void> _resolveStudentId() async {
    try {
      _studentId = await ApiService.getUserId();
    } catch (_) {}
    final fromUser = widget.user['id']?.toString();
    if ((_studentId == null || _studentId!.isEmpty) &&
        fromUser != null &&
        fromUser.isNotEmpty) {
      _studentId = fromUser;
    }
  }

  Future<void> _loadStudentData() async {
    await _resolveStudentId();

    // 0. Enrollment requests gate the curriculum and feed the Enrollment tab.
    await _refreshRequests();

    // 1. Enrolled courses with full modules & syllabus.
    var loaded = <Map<String, dynamic>>[];
    try {
      final raw = await _courseService.getMyCourses();
      if (raw.isNotEmpty) {
        final rawMaps = raw
            .whereType<Map>()
            .map((m) => Map<String, dynamic>.from(m))
            .toList();
        final details = await Future.wait(rawMaps.map((c) async {
          final id = (c['courseId'] ?? c['id'])?.toString() ?? '';
          try {
            final d = await _courseService.getCourse(id);
            return d.isNotEmpty ? d : c;
          } catch (_) {
            return c;
          }
        }));
        final statusByCourse = <String, dynamic>{
          for (final c in rawMaps)
            ((c['courseId'] ?? c['id'])?.toString() ?? ''): c['status'],
        };
        loaded = details.map((c) {
          final id = (c['id'] ?? c['courseId'])?.toString() ?? '';
          return _mapCourse(c, id, statusByCourse[id]);
        }).toList();
        if (loaded.isNotEmpty && mounted) {
          setState(() => _courses = loaded);
          _enrichCourses(loaded);
        }
      }
    } catch (e) {
      debugPrint('Could not load courses: $e');
    }

    // 2. The next quiz comes from the student's own accessible courses.
    try {
      final ids = loaded
          .where((c) =>
              c['canAccess'] == true &&
              enrollmentGrantsAccess(c['enrollmentStatus']?.toString()))
          .map((c) => c['id'].toString());
      for (final id in ids) {
        List<dynamic> list = const [];
        try {
          list = await _quizService.getCourseQuizzes(id);
        } catch (_) {}
        if (list.isNotEmpty && list.first is Map) {
          if (mounted) {
            setState(() =>
                _serverQuiz = Map<String, dynamic>.from(list.first as Map));
          }
          break;
        }
      }
    } catch (e) {
      debugPrint('Could not load course quizzes: $e');
    }

    // 3. Live gamification dashboard profile.
    await _refreshProfile();
  }

  Map<String, dynamic> _mapCourse(
      Map<String, dynamic> c, String id, dynamic status) {
    final modules = (c['modules'] is List) ? c['modules'] as List : const [];
    return {
      'id': id,
      'canAccess': c['canAccessMaterials'] != false,
      'enrollmentStatus': (status ?? c['status'] ?? 'Active').toString(),
      'code': (c['code'] ?? c['courseCode'] ?? 'CS-301').toString(),
      'title': (c['title'] ?? c['courseTitle'] ?? 'Untitled course').toString(),
      'description': (c['description'] ?? '').toString(),
      'totalLessons': toInt(c['totalLessons']),
      'instructorId': c['instructorId'],
      'instructorName': c['instructorName'],
      'averageRating': toDouble(c['averageRating']),
      'ratingCount': toInt(c['ratingCount']),
      'modules': [
        for (var i = 0; i < modules.length; i++)
          if (modules[i] is Map) _mapModule(modules[i] as Map, i),
      ],
    };
  }

  Map<String, dynamic> _mapModule(Map m, int idx) {
    final lessons = (m['lessons'] is List) ? m['lessons'] as List : const [];
    return {
      'id': (m['id'] ?? 'm_$idx').toString(),
      'title': m['title']?.toString() ?? '',
      'description': (m['description'] ?? '').toString(),
      'pdfUrl': m['pdfUrl'],
      'attachmentFileName':
          (m['attachmentFileName'] ?? 'Module Syllabus.pdf').toString(),
      'lessons': [
        for (var j = 0; j < lessons.length; j++)
          if (lessons[j] is Map)
            {
              'id': ((lessons[j] as Map)['id'] ?? 'l_$j').toString(),
              'title': (lessons[j] as Map)['title']?.toString() ?? '',
              'duration':
                  '${toInt((lessons[j] as Map)['estimatedMinutes'], 30) == 0 ? 30 : toInt((lessons[j] as Map)['estimatedMinutes'], 30)} mins',
              'xp': toInt((lessons[j] as Map)['xpReward'], 40) == 0
                  ? 40
                  : toInt((lessons[j] as Map)['xpReward'], 40),
              'completed': (lessons[j] as Map)['isCompleted'] == true,
              'pdfUrl': (lessons[j] as Map)['pdfUrl'],
              'attachmentFileName': (lessons[j] as Map)['attachmentFileName'],
              'content': (lessons[j] as Map)['content'],
            },
      ],
    };
  }

  /// Grades and progress exist only for enrollments that grant access.
  Future<void> _enrichCourses(List<Map<String, dynamic>> mapped) async {
    bool enriches(Map<String, dynamic> c) =>
        c['canAccess'] == true &&
        enrollmentGrantsAccess(c['enrollmentStatus']?.toString());
    Future<Map<String, dynamic>?> safe(
        Future<Map<String, dynamic>> Function() f) async {
      try {
        return await f();
      } catch (_) {
        return null;
      }
    }

    try {
      final grades = await Future.wait(mapped.map((c) => enriches(c)
          ? safe(() => _courseService.getGrade(c['id'].toString()))
          : Future<Map<String, dynamic>?>.value(null)));
      final progress = await Future.wait(mapped.map((c) => enriches(c)
          ? safe(() => _courseService.getProgress(c['id'].toString()))
          : Future<Map<String, dynamic>?>.value(null)));
      if (!mounted) return;
      setState(() {
        _courses = [
          for (var i = 0; i < _courses.length; i++)
            {
              ..._courses[i],
              if (i < grades.length && grades[i] != null)
                'courseGrade': grades[i],
              if (i < progress.length && progress[i] != null)
                'courseProgress': progress[i],
            },
        ];
      });
    } catch (_) {
      // Enrichment is optional — the cards stay usable without it.
    }
  }

  Future<void> _refreshRequests() async {
    try {
      final list = await _enrollment.getMyRequests();
      if (!mounted) return;
      setState(() => _requests = list
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .toList());
    } catch (_) {
      // Keep whatever is already on screen rather than blanking the tab.
    } finally {
      if (mounted) setState(() => _requestsLoading = false);
    }
  }

  Future<void> _refreshProfile() async {
    final id = _studentId;
    if (id == null || id.isEmpty) return;
    try {
      final data = await _gamification.getDashboard(id);
      final prof = data['profile'];
      if (prof is! Map || !mounted) return;
      final badges = (prof['recentBadges'] is List)
          ? prof['recentBadges'] as List
          : const [];
      setState(() {
        _profile = {
          ..._profile,
          'fullName': prof['studentName'] ??
              widget.user['fullName'] ??
              _profile['fullName'],
          'totalXp': prof['totalXp'],
          'level': prof['currentLevel'],
          'levelName': prof['levelName'] ?? _profile['levelName'],
          'xpInLevel': prof['xpProgressInCurrentLevel'],
          'xpToNext': prof['xpRequiredForNextLevel'],
          'coins': prof['coins'],
          'streak': prof['currentStreak'],
          'freezeTokens': prof['freezeTokensAvailable'],
          'badges': [
            for (final b in badges)
              if (b is Map)
                {
                  'id': b['id'],
                  'name': b['title'],
                  'icon': (b['iconUrl'] ?? '').toString().isEmpty
                      ? '🏅'
                      : b['iconUrl'],
                  'unlocked': b['isUnlocked'],
                  'desc': b['description'],
                },
          ],
        };
      });
    } catch (e) {
      debugPrint('Could not load gamification dashboard: $e');
    }
  }

  // ---------------------------------------------------------------- actions

  void _setActiveTab(String tab) {
    setState(() {
      _activeTab = tab;
      _activeQuiz = null;
      _openCourseId = null;
    });
  }

  Future<void> _openCourse(String courseId) async {
    setState(() {
      _openCourseId = courseId;
      _openAccess = const CourseAccessState();
    });
    CourseAccessState next;
    try {
      final res = await _enrollment.getCourseAccess(courseId);
      next = CourseAccessState(
        ready: true,
        hasAccess: res['hasAccess'] == true,
        reason: res['reason']?.toString(),
      );
    } catch (_) {
      next = const CourseAccessState(
        ready: true,
        hasAccess: false,
        reason: 'We could not verify your access to this course.',
      );
    }
    if (mounted && _openCourseId == courseId) {
      setState(() => _openAccess = next);
    }
  }

  void _patchCourseStatus(String courseId, String status) {
    setState(() {
      _courses = [
        for (final c in _courses)
          c['id'] == courseId ? {...c, 'enrollmentStatus': status} : c,
      ];
    });
  }

  Future<void> _withdraw(String courseId) async {
    setState(() => _busyCourseId = courseId);
    try {
      await _enrollment.withdrawEnrollment(courseId);
      if (mounted) _patchCourseStatus(courseId, 'Cancelled');
    } catch (e) {
      debugPrint('Could not withdraw the enrollment request: $e');
    }
    await _refreshRequests();
    if (mounted) setState(() => _busyCourseId = null);
  }

  Future<void> _requestAgain(String courseId) async {
    setState(() => _busyCourseId = courseId);
    try {
      await _enrollment.requestEnrollment(courseId);
      if (mounted) _patchCourseStatus(courseId, 'Pending');
    } catch (e) {
      debugPrint('Could not resubmit the enrollment request: $e');
    }
    await _refreshRequests();
    if (mounted) setState(() => _busyCourseId = null);
  }

  void _browseCourses() {
    _setActiveTab('browse');
  }

  String _friendly(Object e, String fallback) =>
      e is PortalException ? e.message : fallback;

  Future<void> _handleMissionClaim() async {
    final id = _studentId;
    if (id == null) return;
    try {
      await _gamification.claimGrandMission(id);
    } catch (e) {
      if (mounted) {
        showPortalMessage(
            context, _friendly(e, 'The daily reward could not be claimed.'));
      }
    }
    await _refreshProfile();
  }

  Future<void> _handleFreezeUse() async {
    final id = _studentId;
    if (id == null || toInt(_profile['freezeTokens']) <= 0) return;
    try {
      await _gamification.useStreakFreeze(id);
      if (mounted) {
        showPortalMessage(context, 'Streak freeze activated for today.');
      }
    } catch (e) {
      if (mounted) {
        showPortalMessage(
            context, _friendly(e, 'The streak freeze could not be used.'));
      }
    }
    await _refreshProfile();
  }

  Future<void> _handleStartQuiz([Map<String, dynamic>? quizToRun]) async {
    final target = quizToRun ??
        _serverQuiz ??
        {
          'id': 'default_course_quiz',
          'passingScorePercent': 70,
          'title': 'Module Mastery & Knowledge Check',
        };
    final passing = toInt(target['passingScorePercent'], 70) == 0
        ? 70
        : toInt(target['passingScorePercent'], 70);
    Map<String, dynamic> quiz;
    try {
      final attempt = await _quizService.startQuiz(target['id'].toString());
      final qs = attempt['questions'];
      quiz = {
        'id': (attempt['quizId'] ?? target['id']).toString(),
        'attemptId': (attempt['attemptId'] ??
                'att_${DateTime.now().millisecondsSinceEpoch}')
            .toString(),
        'title': (attempt['quizTitle'] ??
                target['title'] ??
                'Module Assessment Quiz')
            .toString(),
        'passingScorePercent': passing,
        'questions': (qs is List && qs.isNotEmpty) ? qs : _fallbackQuestions,
      };
    } catch (_) {
      quiz = {
        'id': (target['id'] ?? 'quiz_fallback').toString(),
        'attemptId': 'att_${DateTime.now().millisecondsSinceEpoch}',
        'title': (target['title'] ?? 'Module Assessment Quiz').toString(),
        'passingScorePercent': passing,
        'questions': _fallbackQuestions,
      };
    }
    if (mounted) setState(() => _activeQuiz = quiz);
  }

  /// Quiz button on a course page: that course's published quiz first,
  /// then the shared default assessment.
  Future<void> _handleCourseQuiz(String courseId) async {
    if (courseId.isNotEmpty) {
      try {
        final list = await _quizService.getCourseQuizzes(courseId);
        if (list.isNotEmpty && list.first is Map) {
          await _handleStartQuiz(Map<String, dynamic>.from(list.first as Map));
          return;
        }
      } catch (_) {
        // Fall through to the default assessment.
      }
    }
    await _handleStartQuiz();
  }

  Future<void> _handleCompleteLesson(
      String lessonId, int xp, String courseId, String moduleId) async {
    try {
      await _courseService.completeLesson(lessonId);
    } catch (e) {
      if (mounted) {
        showPortalMessage(
            context, _friendly(e, 'The lesson could not be marked complete.'));
      }
      return;
    }
    Map<String, dynamic>? progress;
    try {
      progress = await _courseService.getProgress(courseId);
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _courses = [
        for (final c in _courses)
          if (c['id'] != courseId)
            c
          else
            {
              ...c,
              if (progress != null) 'courseProgress': progress,
              'modules': [
                for (final m in (c['modules'] as List))
                  if ((m as Map)['id'] != moduleId)
                    m
                  else
                    {
                      ...m,
                      'lessons': [
                        for (final l in (m['lessons'] as List))
                          (l as Map)['id'] == lessonId
                              ? {...l, 'completed': true}
                              : l,
                      ],
                    },
              ],
            },
      ];
    });
    await _refreshProfile();
  }

  Future<Map<String, dynamic>> _handleQuizComplete(
      Map<String, dynamic> quiz, List<Map<String, dynamic>> answers) async {
    final res = await _quizService.submitQuiz({
      'quizId': quiz['id'],
      'attemptId': quiz['attemptId'],
      'answers': answers,
    });
    await _refreshProfile();
    return res;
  }

  String get _coachCourseId {
    if (_courses.isEmpty) return 'it3012-se';
    final code = (_courses.first['code'] ?? '').toString();
    if (code.isNotEmpty) return code.toLowerCase();
    final id = (_courses.first['id'] ?? '').toString();
    return id.isNotEmpty ? id : 'it3012-se';
  }

  // ---------------------------------------------------------------- UI

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _topBar(),
            Expanded(child: _content()),
          ],
        ),
      ),
      bottomNavigationBar: _bottomNav(),
    );
  }

  Widget _topBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
      decoration: const BoxDecoration(
        color: AppTheme.bgSurface,
        border: Border(bottom: BorderSide(color: AppTheme.borderSubtle)),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(9),
            ),
            child: const Icon(Icons.school, color: Colors.white, size: 19),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('EduFlow',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textMain)),
                Text('Student Workspace',
                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Help & Support',
            onPressed: () => showHelpSupportDialog(context),
            icon: const Icon(Icons.help_outline, color: AppTheme.textMuted),
          ),
          StatusPill(
            label: '${_num.format(toInt(_profile['totalXp']))} XP',
            color: AppTheme.warning,
            icon: Icons.star_rounded,
          ),
          const SizedBox(width: 6),
          StatusPill(
            label: '${toInt(_profile['streak'])}d streak',
            color: AppTheme.error,
            icon: Icons.local_fire_department,
          ),
        ],
      ),
    );
  }

  Widget _scroll(Widget child) => SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: child,
      );

  Widget _content() {
    if (_activeQuiz != null) {
      return _scroll(QuizRunner(
        key: ValueKey(_activeQuiz!['attemptId']),
        quiz: _activeQuiz!,
        onComplete: _handleQuizComplete,
        onCancel: () => setState(() => _activeQuiz = null),
      ));
    }
    if (_openCourseId != null) {
      Map<String, dynamic>? course;
      for (final c in _courses) {
        if (c['id'] == _openCourseId) course = c;
      }
      return _scroll(CourseDetailView(
        course: course,
        access: _openAccess,
        coursesLoading: _coursesLoading,
        onBack: () => setState(() => _openCourseId = null),
        onCompleteLesson: _handleCompleteLesson,
        onStartQuiz: _handleCourseQuiz,
      ));
    }
    switch (_activeTab) {
      case 'browse':
        return ExploreScreen(onCourseEnrolled: (_) => _refreshRequests());
      case 'home':
        return _scroll(HomeTab(
          profile: _profile,
          onMissionClaim: _handleMissionClaim,
          onFreezeUse: _handleFreezeUse,
          onNavigate: _setActiveTab,
          onStartQuiz: () => _handleStartQuiz(),
        ));
      case 'focus':
        return _scroll(FocusFlowTab(
            profile: _profile, onSessionCompleted: _refreshProfile));
      case 'coach':
        return Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: CoachTab(studentId: _studentId, courseId: _coachCourseId),
        );
      case 'ranks':
        return _scroll(
            LeaderboardTab(profile: _profile, studentId: _studentId));
      case 'profile':
        return _scroll(
            ProfileTab(profile: _profile, onLogout: widget.onLogout));
      case 'enrollments':
      default:
        return RefreshIndicator(
          onRefresh: _refreshRequests,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: EnrollmentRequestsTab(
              requests: _requests,
              courses: _courses,
              loading: _requestsLoading,
              busyCourseId: _busyCourseId,
              onWithdraw: _withdraw,
              onRequestAgain: _requestAgain,
              onOpenCourse: _openCourse,
              onBrowse: _browseCourses,
            ),
          ),
        );
    }
  }

  Widget _bottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.bgSurface,
        border: Border(top: BorderSide(color: AppTheme.borderSubtle)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 62,
          child: Row(
            children: [
              for (final t in _tabs)
                Expanded(child: _navItem(t)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(_TabDef t) {
    final isActive = _activeTab == t.id && _activeQuiz == null;
    final color = isActive ? AppTheme.primary : AppTheme.textMuted;
    return InkWell(
      onTap: () => _setActiveTab(t.id),
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
                color: isActive ? AppTheme.primary : Colors.transparent,
                width: 2),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(t.icon, size: 21, color: color),
            const SizedBox(height: 3),
            Text(t.label,
                maxLines: 2,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 9.5,
                    height: 1.1,
                    color: color,
                    fontWeight: isActive ? FontWeight.w700 : FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}
