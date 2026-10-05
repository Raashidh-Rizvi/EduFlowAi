import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'portal_widgets.dart';

/// Enrollment tab: approved course cards + enrollment request history
/// (web: EnrollmentRequestsTab).
class EnrollmentRequestsTab extends StatelessWidget {
  final List<Map<String, dynamic>> requests;
  final List<Map<String, dynamic>> courses;
  final bool loading;
  final String? busyCourseId;
  final void Function(String courseId) onWithdraw;
  final void Function(String courseId) onRequestAgain;
  final void Function(String courseId) onOpenCourse;
  final VoidCallback onBrowse;

  const EnrollmentRequestsTab({
    super.key,
    required this.requests,
    required this.courses,
    required this.loading,
    required this.busyCourseId,
    required this.onWithdraw,
    required this.onRequestAgain,
    required this.onOpenCourse,
    required this.onBrowse,
  });

  @override
  Widget build(BuildContext context) {
    if (loading && requests.isEmpty && courses.isEmpty) {
      return const LoadingLine('Loading your enrollment requests…');
    }

    final myCourses = courses
        .where((c) =>
            c['canAccess'] == true &&
            enrollmentGrantsAccess(c['enrollmentStatus']?.toString()))
        .toList();

    final sorted = [...requests]..sort((a, b) {
        final da = DateTime.tryParse(a['requestedAt']?.toString() ?? '') ?? DateTime(1970);
        final db = DateTime.tryParse(b['requestedAt']?.toString() ?? '') ?? DateTime(1970);
        return db.compareTo(da);
      });

    final browseButton = GhostButton(
      label: 'Browse courses',
      icon: Icons.search,
      onPressed: onBrowse,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader(
          title: 'My Courses',
          subtitle:
              'Open an approved course to see its details, continue learning and take its quiz — the curriculum and syllabus live inside.',
        ),
        if (myCourses.isEmpty)
          const PortalCard(
            child: Text(
              'No approved courses yet — request one below and its card appears here once your instructor approves it.',
              style: TextStyle(color: AppTheme.textMuted, height: 1.4),
            ),
          )
        else
          for (final c in myCourses)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: EnrolledCourseCard(
                course: c,
                onOpen: () => onOpenCourse(c['id'].toString()),
              ),
            ),
        const SizedBox(height: 24),
        if (sorted.isEmpty)
          EmptyState(
            icon: Icons.how_to_reg_outlined,
            title: 'No enrollment requests yet',
            message:
                'Browse the course catalog and request a course — your instructor will approve or decline it.',
            action: browseButton,
          )
        else ...[
          SectionHeader(
            title: 'My Enrollment Requests',
            subtitle:
                'Approval is required before a course opens its materials. Click an approved course to open its page.',
            trailing: browseButton,
          ),
          for (final r in sorted)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _RequestCard(
                request: r,
                busy: busyCourseId != null &&
                    busyCourseId == r['courseId']?.toString(),
                onWithdraw: onWithdraw,
                onRequestAgain: onRequestAgain,
                onOpenCourse: onOpenCourse,
              ),
            ),
        ],
      ],
    );
  }
}

class _RequestCard extends StatelessWidget {
  final Map<String, dynamic> request;
  final bool busy;
  final void Function(String) onWithdraw;
  final void Function(String) onRequestAgain;
  final void Function(String) onOpenCourse;

  const _RequestCard({
    required this.request,
    required this.busy,
    required this.onWithdraw,
    required this.onRequestAgain,
    required this.onOpenCourse,
  });

  @override
  Widget build(BuildContext context) {
    final status = (request['status']?.toString().isNotEmpty ?? false)
        ? request['status'].toString()
        : 'Pending';
    final courseId = request['courseId']?.toString() ?? '';
    final isPending = status == 'Pending';
    final isRejected =
        status == 'Rejected' || status == 'Cancelled' || status == 'Dropped';
    final isApproved = !isPending && !isRejected;
    final notes = request['reviewNotes']?.toString() ?? '';
    final reviewedAt = request['reviewedAt'];

    return PortalCard(
      onTap: isApproved ? () => onOpenCourse(courseId) : null,
      borderColor: isApproved ? tint(AppTheme.success, 0.35) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(request['courseCode']?.toString() ?? '',
                        style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.6,
                            color: AppTheme.primaryGlow)),
                    const SizedBox(height: 2),
                    Text(request['courseTitle']?.toString() ?? 'Untitled course',
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textMain)),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              EnrollmentStatusPill(
                  status: status,
                  label: request['statusLabel']?.toString()),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Requested ${formatDate(request['requestedAt'])}'
            '${reviewedAt != null ? ' · Reviewed ${formatDate(reviewedAt)}' : ''}',
            style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
          ),
          if (notes.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.bgSurface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.borderSubtle),
              ),
              child: Text(notes,
                  style: const TextStyle(fontSize: 13, color: AppTheme.textMain)),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (isPending)
                GhostButton(
                  label: busy ? 'Withdrawing…' : 'Withdraw',
                  icon: Icons.undo,
                  color: AppTheme.error,
                  onPressed: busy ? null : () => onWithdraw(courseId),
                ),
              if (isRejected)
                PrimaryButton(
                  label: busy ? 'Sending…' : 'Request again',
                  icon: Icons.refresh,
                  onPressed: busy ? null : () => onRequestAgain(courseId),
                ),
              if (isApproved) ...[
                const StatusPill(
                    label: 'Access granted',
                    color: AppTheme.success,
                    icon: Icons.lock_open),
                PrimaryButton(
                  label: 'Continue Course',
                  icon: Icons.arrow_forward,
                  onPressed: () => onOpenCourse(courseId),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

/// Card for an approved course (web: EnrolledCourseCard).
class EnrolledCourseCard extends StatelessWidget {
  final Map<String, dynamic> course;
  final VoidCallback onOpen;

  const EnrolledCourseCard({super.key, required this.course, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final progress = course['progress'] as Map<String, dynamic>?;
    final grade = course['grade'] as Map<String, dynamic>?;
    final pct = toInt(progress?['percentage']);
    final modules = (course['modules'] as List?) ?? const [];
    final lessonCount = course['totalLessons'] != null
        ? toInt(course['totalLessons'])
        : modules.fold<int>(
            0, (s, m) => s + (((m as Map)['lessons'] as List?)?.length ?? 0));
    final desc = course['description']?.toString() ?? '';
    final instructor = course['instructorName']?.toString();

    String footer;
    if (grade != null && grade['gradingStatus'] == 'Active') {
      footer = 'Grade ${grade['grade'] ?? '-'}';
    } else if (progress != null && progress['totalUnits'] != null) {
      footer =
          '${toInt(progress['completedUnits'])} of ${toInt(progress['totalUnits'])} completed';
    } else {
      footer = 'Syllabus available';
    }

    return PortalCard(
      onTap: onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.menu_book, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              EnrollmentStatusPill(status: course['enrollmentStatus']?.toString()),
              const Spacer(),
              Text('$pct% complete',
                  style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.secondary,
                      fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '${course['code'] ?? ''}${instructor != null && instructor.isNotEmpty ? ' · $instructor' : ''}',
            style: const TextStyle(
                fontSize: 12, color: AppTheme.primaryGlow, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(course['title']?.toString() ?? 'Untitled course',
              style: const TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textMain)),
          const SizedBox(height: 6),
          Text(desc.isEmpty ? 'No description yet.' : desc,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 12,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              _meta(Icons.layers_outlined, '${modules.length} modules'),
              _meta(Icons.play_lesson_outlined, '$lessonCount lessons'),
              StarRating(
                average: course['averageRating'] == null
                    ? null
                    : toDouble(course['averageRating']),
                count: toInt(course['ratingCount']),
              ),
            ],
          ),
          if (pct > 0) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct / 100,
                minHeight: 6,
                backgroundColor: AppTheme.bgSurface,
                color: AppTheme.secondary,
              ),
            ),
          ],
          const Divider(height: 24, color: AppTheme.borderSubtle),
          Row(
            children: [
              Expanded(
                child: Text(footer,
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
              ),
              PrimaryButton(
                label: 'Continue Course',
                icon: Icons.arrow_forward,
                onPressed: onOpen,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _meta(IconData icon, String text) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.textSubtle),
          const SizedBox(width: 4),
          Text(text, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        ],
      );
}
