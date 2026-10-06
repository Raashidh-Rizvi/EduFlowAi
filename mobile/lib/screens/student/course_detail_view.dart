import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'course_reviews.dart';
import 'portal_widgets.dart';

/// Access check state for an opened course (web: courseAccess).
class CourseAccessState {
  final bool ready;
  final bool hasAccess;
  final String? reason;

  const CourseAccessState({this.ready = false, this.hasAccess = false, this.reason});
}

/// Course page: details card + curriculum (web: CourseDetailView).
class CourseDetailView extends StatelessWidget {
  final Map<String, dynamic>? course;
  final CourseAccessState access;
  final bool coursesLoading;
  final VoidCallback onBack;
  final void Function(String lessonId, int xp, String courseId, String moduleId)
      onCompleteLesson;
  final void Function(String courseId) onStartQuiz;

  const CourseDetailView({
    super.key,
    required this.course,
    required this.access,
    required this.coursesLoading,
    required this.onBack,
    required this.onCompleteLesson,
    required this.onStartQuiz,
  });

  @override
  Widget build(BuildContext context) {
    if (!access.ready) {
      return PortalCard(
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 36),
        child: Text('Verifying your access to this course…',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
      );
    }

    if (!access.hasAccess) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackToCoursesButton(onTap: onBack),
          const SizedBox(height: 14),
          PortalCard(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 34),
            child: Column(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: tint(AppTheme.warning, 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.lock_outline, color: AppTheme.warning, size: 22),
                ),
                const SizedBox(height: 12),
                Text('Course materials are locked',
                    style: TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textMain)),
                const SizedBox(height: 12),
                Text(
                  (access.reason?.isNotEmpty ?? false)
                      ? access.reason!
                      : 'Only learners with an approved enrollment — plus the course instructor and admins — can open this curriculum and syllabus.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 12.5, color: AppTheme.textMuted, height: 1.6),
                ),
                const SizedBox(height: 12),
                GhostButton(
                    label: 'Back to My Courses', icon: Icons.arrow_back, onPressed: onBack),
              ],
            ),
          ),
        ],
      );
    }

    final c = course;
    if (c == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BackToCoursesButton(onTap: onBack),
          const SizedBox(height: 14),
          PortalCard(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 36),
            child: Text(
              coursesLoading
                  ? 'Loading your course…'
                  : 'This course is not in your enrolled courses.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
            ),
          ),
        ],
      );
    }

    final modules = (c['modules'] as List?) ?? const [];
    final lessonSum = modules.fold<int>(
        0, (n, m) => n + (((m as Map)['lessons'] as List?)?.length ?? 0));
    final lessonCount = lessonSum > 0 ? lessonSum : toInt(c['totalLessons']);
    final progress = c['courseProgress'] as Map?;
    final pct = progress != null ? toDouble(progress['percentage']).round() : 0;
    final grade = c['courseGrade'] as Map?;
    final instructor = c['instructorName']?.toString() ?? '';
    final desc = c['description']?.toString() ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BackToCoursesButton(onTap: onBack),
        const SizedBox(height: 16),
        PortalCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  StatusPill(label: c['code']?.toString() ?? '', color: AppTheme.primaryGlow),
                  EnrollmentStatusPill(status: c['enrollmentStatus']?.toString()),
                  if (progress != null)
                    StatusPill(label: 'Progress $pct%', color: AppTheme.primaryGlow),
                  if (grade?['gradingStatus'] == 'Active')
                    StatusPill(
                        label: 'Grade ${grade!['grade']} • ${grade['coursePercentage']}%',
                        color: AppTheme.success),
                ],
              ),
              const SizedBox(height: 12),
              Text(c['title']?.toString() ?? '',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textMain,
                      height: 1.3)),
              const SizedBox(height: 8),
              Text(
                desc.isNotEmpty
                    ? desc
                    : 'Your instructor has not added a course description yet.',
                style: TextStyle(
                    fontSize: 12.5, color: AppTheme.textMuted, height: 1.65),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 14,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (instructor.isNotEmpty)
                    Text.rich(TextSpan(children: [
                      const TextSpan(text: 'By '),
                      TextSpan(
                          text: instructor,
                          style: TextStyle(
                              fontWeight: FontWeight.w700, color: AppTheme.textMain)),
                    ]), style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                  StarRating(
                      average: toDouble(c['averageRating']),
                      count: toInt(c['ratingCount'])),
                  _meta(Icons.menu_book_outlined, '${modules.length} modules'),
                  _meta(Icons.schedule, '$lessonCount lessons'),
                ],
              ),
              if (progress != null) ...[
                const SizedBox(height: 12),
                _GradientBar(value: (pct.clamp(0, 100)) / 100),
                const SizedBox(height: 6),
                Text(
                  '${progress['completedUnits'] ?? 0} of ${progress['totalUnits'] ?? 0} lessons and assessments completed',
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        CurriculumSection(
          courses: [c],
          onCompleteLesson: onCompleteLesson,
          onStartQuiz: onStartQuiz,
        ),
      ],
    );
  }

  Widget _meta(IconData icon, String text) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppTheme.textMuted),
          const SizedBox(width: 5),
          Text(text, style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        ],
      );
}

class _GradientBar extends StatelessWidget {
  final double value;
  const _GradientBar({required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 7,
      decoration: BoxDecoration(
        color: AppTheme.bgMain,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: Align(
        alignment: Alignment.centerLeft,
        child: FractionallySizedBox(
          widthFactor: value,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(99),
              gradient: const LinearGradient(colors: [AppTheme.primary, AppTheme.secondary]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Shown instead of the module tree while enrollment is pending/denied
/// (web: AwaitingApprovalCard).
class AwaitingApprovalCard extends StatelessWidget {
  final Map<String, dynamic> course;
  const AwaitingApprovalCard({super.key, required this.course});

  @override
  Widget build(BuildContext context) {
    final raw = course['enrollmentStatus']?.toString() ?? '';
    final status = raw.isEmpty ? 'Pending' : raw;
    final isPending = status == 'Pending';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            StatusPill(label: course['code']?.toString() ?? '', color: AppTheme.primaryGlow),
            Text(course['title']?.toString() ?? '',
                style: TextStyle(
                    fontSize: 13.5, fontWeight: FontWeight.w700, color: AppTheme.textMain)),
            EnrollmentStatusPill(status: status),
          ],
        ),
        const SizedBox(height: 12),
        PortalCard(
          padding: const EdgeInsets.all(20),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isPending ? tint(AppTheme.warning, 0.15) : AppTheme.bgSurface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.borderSubtle),
                ),
                child: Icon(isPending ? Icons.schedule : Icons.lock_outline,
                    size: 19, color: isPending ? AppTheme.warning : AppTheme.textMuted),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isPending
                          ? 'Waiting for instructor approval'
                          : 'Course materials are locked',
                      style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textMain),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      isPending
                          ? 'Your enrollment request has been sent to the instructor. Course materials, PDFs and lesson completion unlock the moment it is approved.'
                          : status == 'Rejected'
                              ? 'Your enrollment request was declined. You can submit it again from the Enrollment tab if your circumstances change.'
                              : 'You do not have an approved enrollment for this course. Submit a new request from the Enrollment tab to regain access.',
                      style: TextStyle(
                          fontSize: 12.5, color: AppTheme.textMuted, height: 1.6),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

List<Map<String, dynamic>> _fallbackModules(String courseId) => [
      {
        'id': 'mod_fallback_1_$courseId',
        'title': 'Module 1: Core Architecture & PDF Lecture Slides',
        'description': 'Core architectural principles and PDF reading slides.',
        'pdfUrl': '/api/syllabus-demo.pdf',
        'attachmentFileName': 'Module1_Architecture_Slides.pdf',
        'lessons': [
          {
            'id': 'les_fallback_1_$courseId',
            'title': 'Lesson 1.1: System Concepts & Fundamental Patterns',
            'duration': '25 mins',
            'xp': 40,
            'completed': false,
            'pdfUrl': '/api/slides-lesson1.pdf',
            'attachmentFileName': 'Lesson1_Slides.pdf',
            'content': 'Study architectural patterns and key abstractions.',
          },
          {
            'id': 'les_fallback_2_$courseId',
            'title': 'Lesson 1.2: Deep Dive Implementation & Practice',
            'duration': '35 mins',
            'xp': 50,
            'completed': false,
            'pdfUrl': '/api/slides-lesson2.pdf',
            'attachmentFileName': 'Lesson2_Slides.pdf',
            'content': 'Hands-on implementation and performance evaluation.',
          },
        ],
      },
      {
        'id': 'mod_fallback_2_$courseId',
        'title': 'Module 2: Advanced Design, Databases & Assessments',
        'description': 'Advanced topics, PDF documentation, and module quiz.',
        'pdfUrl': '/api/syllabus-demo2.pdf',
        'attachmentFileName': 'Module2_Advanced_Slides.pdf',
        'lessons': [
          {
            'id': 'les_fallback_3_$courseId',
            'title': 'Lesson 2.1: Performance Optimization & Evaluation',
            'duration': '40 mins',
            'xp': 60,
            'completed': false,
            'pdfUrl': '/api/slides-lesson3.pdf',
            'attachmentFileName': 'Lesson3_Slides.pdf',
            'content': 'Review query plans, caching strategies, and DIP.',
          },
        ],
      },
    ];

/// Curriculum & syllabus with module tree, PDFs, lessons and quiz actions
/// (web: CurriculumTab).
class CurriculumSection extends StatefulWidget {
  final List<Map<String, dynamic>> courses;
  final void Function(String lessonId, int xp, String courseId, String moduleId)
      onCompleteLesson;
  final void Function(String courseId) onStartQuiz;

  const CurriculumSection({
    super.key,
    required this.courses,
    required this.onCompleteLesson,
    required this.onStartQuiz,
  });

  @override
  State<CurriculumSection> createState() => _CurriculumSectionState();
}

class _CurriculumSectionState extends State<CurriculumSection> {
  final Map<String, bool> _expanded = {'m1': true, 'm2': true, 'm_0': true, 'm_1': true};
  final Map<String, bool> _reviewsOpen = {};
  final Map<String, GlobalKey> _moduleKeys = {};

  GlobalKey _keyFor(String courseId, String moduleId) =>
      _moduleKeys.putIfAbsent('module-$courseId-$moduleId', () => GlobalKey());

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Curriculum & Syllabus',
            style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textMain)),
        const SizedBox(height: 2),
        Text(
          'Study the syllabus PDFs and lecture materials, then complete each unit for XP and course progress.',
          style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
        ),
        const SizedBox(height: 16),
        if (widget.courses.isEmpty)
          const EmptyState(
            icon: Icons.menu_book_outlined,
            title: 'No Enrolled Courses Found',
            message:
                'When instructors publish courses and materials with attached PDFs, they will appear here.',
          )
        else
          for (final course in widget.courses) ...[
            _course(course),
            const SizedBox(height: 16),
          ],
      ],
    );
  }

  Widget _course(Map<String, dynamic> course) {
    if (!canOpenCourseMaterials(course['enrollmentStatus']?.toString())) {
      return AwaitingApprovalCard(course: course);
    }
    final courseId = course['id'].toString();
    final rawModules = (course['modules'] as List?) ?? const [];
    final modules = rawModules.isNotEmpty
        ? rawModules.map((m) => Map<String, dynamic>.from(m as Map)).toList()
        : _fallbackModules(courseId);
    final progress = course['courseProgress'] as Map?;
    final grade = course['courseGrade'] as Map?;
    final instructor = course['instructorName']?.toString() ?? '';
    final reviewsOpen = _reviewsOpen[courseId] ?? false;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            StatusPill(label: course['code']?.toString() ?? '', color: AppTheme.primaryGlow),
            Text(course['title']?.toString() ?? '',
                style: TextStyle(
                    fontSize: 13.5, fontWeight: FontWeight.w700, color: AppTheme.textMain)),
            if (progress != null)
              Tooltip(
                message:
                    '${progress['completedUnits']} of ${progress['totalUnits']} lessons and assessments completed',
                child: StatusPill(
                    label: 'Progress ${toDouble(progress['percentage']).round()}%',
                    color: AppTheme.primaryGlow),
              ),
            if (grade?['gradingStatus'] == 'Active')
              StatusPill(
                  label: 'Grade ${grade!['grade']} • ${grade['coursePercentage']}%',
                  color: AppTheme.success),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            if (instructor.isNotEmpty)
              Text.rich(TextSpan(children: [
                const TextSpan(text: 'By '),
                TextSpan(
                    text: instructor,
                    style: TextStyle(
                        fontWeight: FontWeight.w700, color: AppTheme.textMain)),
              ]), style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
            StarRating(
                average: toDouble(course['averageRating']),
                count: toInt(course['ratingCount'])),
            GhostButton(
              label: reviewsOpen ? 'Hide reviews' : 'Rate & reviews',
              icon: Icons.rate_review_outlined,
              onPressed: () => setState(() => _reviewsOpen[courseId] = !reviewsOpen),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [AppTheme.primary, AppTheme.secondary]),
                borderRadius: BorderRadius.circular(999),
              ),
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                ),
                icon: const Icon(Icons.play_arrow_rounded, size: 15),
                label: const Text('Continue Learning'),
                onPressed: () => _continueLearning(courseId, modules),
              ),
            ),
            GhostButton(
              label: 'Take Course Quiz (+80 XP)',
              icon: Icons.help_outline,
              onPressed: () => widget.onStartQuiz(courseId),
            ),
          ],
        ),
        if (reviewsOpen) ...[
          const SizedBox(height: 12),
          CourseReviews(courseId: courseId),
        ],
        for (var i = 0; i < modules.length; i++) ...[
          const SizedBox(height: 12),
          _module(courseId, modules[i], i),
        ],
      ],
    );
  }

  void _continueLearning(String courseId, List<Map<String, dynamic>> modules) {
    if (modules.isEmpty) return;
    final target = modules.firstWhere(
      (m) => ((m['lessons'] as List?) ?? const [])
          .any((l) => (l as Map)['completed'] != true),
      orElse: () => modules.first,
    );
    final id = target['id'].toString();
    setState(() => _expanded[id] = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = _keyFor(courseId, id).currentContext;
      if (ctx != null && ctx.mounted) {
        Scrollable.ensureVisible(ctx,
            duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
      }
    });
  }

  Widget _module(String courseId, Map<String, dynamic> mod, int index) {
    final id = mod['id'].toString();
    final expanded = _expanded[id] ?? false;
    final lessons = ((mod['lessons'] as List?) ?? const [])
        .map((l) => Map<String, dynamic>.from(l as Map))
        .toList();
    final pdfUrl = mod['pdfUrl']?.toString() ?? '';
    final title = mod['title']?.toString() ?? '';
    final fileName = mod['attachmentFileName']?.toString();

    return Container(
      key: _keyFor(courseId, id),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded[id] = !expanded),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: expanded ? tint(AppTheme.primary, 0.12) : AppTheme.bgSurface,
              child: Row(
                children: [
                  Icon(expanded ? Icons.expand_more : Icons.chevron_right,
                      size: 16, color: AppTheme.textMuted),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('MODULE ${index + 1}',
                            style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.secondary)),
                        Text(title,
                            style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textMain)),
                      ],
                    ),
                  ),
                  if (pdfUrl.isNotEmpty) ...[
                    const StatusPill(
                        label: 'PDF', color: AppTheme.secondary, icon: Icons.description),
                    const SizedBox(width: 8),
                  ],
                  Text('${lessons.length} Lessons',
                      style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                ],
              ),
            ),
          ),
          if (expanded)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (pdfUrl.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.bgSurface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.borderSubtle),
                      ),
                      child: Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.description,
                                  size: 18, color: AppTheme.secondary),
                              const SizedBox(width: 8),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                      (fileName?.isNotEmpty ?? false)
                                          ? fileName!
                                          : 'Module Reading Material.pdf',
                                      style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                          color: AppTheme.textMain)),
                                  Text('Official module documentation',
                                      style: TextStyle(
                                          fontSize: 11, color: AppTheme.textMuted)),
                                ],
                              ),
                            ],
                          ),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              GhostButton(
                                label: 'View PDF',
                                icon: Icons.visibility_outlined,
                                onPressed: () => showPdfDialog(context,
                                    title: '$title – PDF Material',
                                    url: pdfUrl,
                                    fileName: (fileName?.isNotEmpty ?? false)
                                        ? fileName
                                        : 'module_syllabus.pdf'),
                              ),
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                    foregroundColor: AppTheme.textMuted),
                                icon: const Icon(Icons.download, size: 14),
                                label: const Text('Download',
                                    style: TextStyle(fontSize: 11.5)),
                                onPressed: () => showPdfDialog(context,
                                    title: title,
                                    url: pdfUrl,
                                    fileName: (fileName?.isNotEmpty ?? false)
                                        ? fileName
                                        : 'material.pdf'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  for (final les in lessons) ...[
                    _lesson(courseId, id, les),
                    const SizedBox(height: 6),
                  ],
                  Divider(height: 18, color: AppTheme.borderSubtle),
                  Row(
                    children: [
                      Expanded(
                        child: Text('Ready for evaluation?',
                            style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                      ),
                      PrimaryButton(
                        label: 'Take Quiz (+80 XP)',
                        icon: Icons.help_outline,
                        onPressed: () => widget.onStartQuiz(courseId),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _lesson(String courseId, String moduleId, Map<String, dynamic> les) {
    final done = les['completed'] == true;
    final pdfUrl = les['pdfUrl']?.toString() ?? '';
    final xp = toInt(les['xp']);
    final title = les['title']?.toString() ?? '';
    final fileName = les['attachmentFileName']?.toString();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: done ? tint(AppTheme.success, 0.1) : AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
            color: done ? tint(AppTheme.success, 0.35) : AppTheme.borderSubtle),
      ),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: done ? tint(AppTheme.success, 0.15) : tint(AppTheme.primary, 0.15),
            ),
            child: Icon(done ? Icons.check_circle_outline : Icons.menu_book,
                size: done ? 14 : 12, color: done ? AppTheme.success : AppTheme.primary),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textMain)),
                if ((les['content']?.toString() ?? '').isNotEmpty)
                  Text(les['content'].toString(),
                      style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
              ],
            ),
          ),
          const SizedBox(width: 6),
          if (pdfUrl.isNotEmpty) ...[
            InkWell(
              onTap: () => showPdfDialog(context,
                  title: title,
                  url: pdfUrl,
                  fileName: (fileName?.isNotEmpty ?? false)
                      ? fileName
                      : 'lesson_attachment.pdf'),
              child: const StatusPill(label: 'PDF', color: AppTheme.secondary),
            ),
            const SizedBox(width: 6),
          ],
          Text('+$xp XP',
              style: const TextStyle(
                  fontSize: 11.5, fontWeight: FontWeight.w700, color: AppTheme.warning)),
          const SizedBox(width: 6),
          if (!done)
            SizedBox(
              height: 28,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                ),
                onPressed: () => widget.onCompleteLesson(
                    les['id'].toString(), xp, courseId, moduleId),
                child: const Text('Complete'),
              ),
            )
          else
            const Text('✓ Done',
                style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.success)),
        ],
      ),
    );
  }
}
