import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../services/course_catalog_service.dart';

class CourseDetailScreen extends StatefulWidget {
  final Map<String, dynamic> course;
  final Function(String courseId)? onEnrolled;

  const CourseDetailScreen({
    Key? key,
    required this.course,
    this.onEnrolled,
  }) : super(key: key);

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> with SingleTickerProviderStateMixin {
  final CourseCatalogService _catalogService = CourseCatalogService();
  late TabController _tabController;

  bool _isLoading = false;
  bool _isEnrolled = false;
  bool _isEnrolling = false;
  Map<String, dynamic>? _fullDetail;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadCourseDetail();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadCourseDetail() async {
    setState(() => _isLoading = true);
    final detail = await _catalogService.getCourseDetail(widget.course['id']?.toString() ?? '');
    if (mounted) {
      setState(() {
        _fullDetail = detail ?? widget.course;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleEnrollment() async {
    if (_isEnrolled || _isEnrolling) return;

    setState(() => _isEnrolling = true);

    final courseId = (_fullDetail ?? widget.course)['id']?.toString() ?? '';
    final res = await _catalogService.enrollCourse(courseId);

    if (mounted) {
      setState(() {
        _isEnrolling = false;
        _isEnrolled = true;
      });

      if (widget.onEnrolled != null) {
        widget.onEnrolled!(courseId);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '🎉 ${res['message']} Start learning today!',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }

  Color _getDifficultyColor(String level) {
    switch (level.toLowerCase()) {
      case 'beginner':
        return AppTheme.success;
      case 'intermediate':
        return AppTheme.warning;
      case 'advanced':
        return AppTheme.accent;
      default:
        return AppTheme.secondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _fullDetail ?? widget.course;
    final title = c['title']?.toString() ?? 'Course Details';
    final category = c['category']?.toString() ?? 'General';
    final difficulty = c['difficulty']?.toString() ?? 'Beginner';
    final instructorName = c['instructorName']?.toString() ?? 'EduFlow Instructor';
    final rating = (c['averageRating'] as num?)?.toDouble() ?? 4.8;
    final ratingCount = (c['ratingCount'] as num?)?.toInt() ?? 12;
    final durationHours = (c['durationHours'] as num?)?.toInt() ?? 10;
    final xpReward = (c['xpReward'] as num?)?.toInt() ?? 500;
    final isFree = c['isFree'] == true || (c['price'] as num? ?? 0) == 0;
    final price = isFree ? 'FREE' : '\$${(c['price'] as num).toStringAsFixed(2)}';

    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      body: CustomScrollView(
        slivers: [
          // Hero Header App Bar
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppTheme.bgSurface,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1E1B4B), Color(0xFF0F172A), AppTheme.bgMain],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 50, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        // Category & Difficulty Badges
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.25),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppTheme.primary.withOpacity(0.5)),
                              ),
                              child: Text(
                                category.toUpperCase(),
                                style: const TextStyle(
                                  color: AppTheme.primary,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: _getDifficultyColor(difficulty).withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: _getDifficultyColor(difficulty).withOpacity(0.4)),
                              ),
                              child: Text(
                                difficulty,
                                style: TextStyle(
                                  color: _getDifficultyColor(difficulty),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            const Spacer(),
                            // XP Badge
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.warning.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.warning.withOpacity(0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.bolt, color: AppTheme.warning, size: 14),
                                  const SizedBox(width: 2),
                                  Text(
                                    '+$xpReward XP',
                                    style: const TextStyle(
                                      color: AppTheme.warning,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        // Title
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppTheme.textMain,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Instructor & Rating Row
                        Row(
                          children: [
                            const CircleAvatar(
                              radius: 12,
                              backgroundColor: AppTheme.secondary,
                              child: Icon(Icons.person, size: 14, color: Colors.white),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              instructorName,
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                            const Spacer(),
                            const Icon(Icons.star, color: AppTheme.warning, size: 16),
                            const SizedBox(width: 4),
                            Text(
                              rating.toStringAsFixed(1),
                              style: const TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w800, fontSize: 13),
                            ),
                            Text(
                              ' ($ratingCount)',
                              style: const TextStyle(color: AppTheme.textSubtle, fontSize: 11),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Content Tabs
          SliverToBoxAdapter(
            child: Column(
              children: [
                // Quick Info Bar
                Container(
                  color: AppTheme.bgSurface,
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildQuickStat(Icons.schedule, '$durationHours Hours', 'Total Duration'),
                      Container(width: 1, height: 28, color: AppTheme.borderSubtle),
                      _buildQuickStat(Icons.play_circle_outline, '${c['lessonCount'] ?? 18} Lessons', 'Curriculum'),
                      Container(width: 1, height: 28, color: AppTheme.borderSubtle),
                      _buildQuickStat(Icons.verified, isFree ? 'Free Access' : price, 'Enrollment'),
                    ],
                  ),
                ),

                const SizedBox(height: 8),

                // Tab Header
                Container(
                  color: AppTheme.bgSurface,
                  child: TabBar(
                    controller: _tabController,
                    indicatorColor: AppTheme.secondary,
                    labelColor: AppTheme.secondary,
                    unselectedLabelColor: AppTheme.textSubtle,
                    labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    tabs: const [
                      Tab(text: 'Overview'),
                      Tab(text: 'Curriculum'),
                      Tab(text: 'Reviews'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Tab Body Content
          SliverToBoxAdapter(
            child: Container(
              height: 480,
              padding: const EdgeInsets.all(18),
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildOverviewTab(c),
                  _buildCurriculumTab(c),
                  _buildReviewsTab(c),
                ],
              ),
            ),
          ),
        ],
      ),

      // Bottom Sticky Enrollment Action Bar
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: AppTheme.bgSurface,
          border: Border(top: BorderSide(color: AppTheme.borderSubtle)),
        ),
        child: SafeArea(
          child: Row(
            children: [
              // Price Tag
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Course Price', style: TextStyle(color: AppTheme.textSubtle, fontSize: 11)),
                  Text(
                    price,
                    style: TextStyle(
                      color: isFree ? AppTheme.success : AppTheme.secondary,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 20),
              // Enroll Action Button
              Expanded(
                child: ElevatedButton(
                  onPressed: (_isEnrolled || _isEnrolling) ? null : _handleEnrollment,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isEnrolled ? AppTheme.success : AppTheme.secondary,
                    disabledBackgroundColor: AppTheme.success.withOpacity(0.8),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: _isEnrolled ? 0 : 4,
                  ),
                  child: _isEnrolling
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(_isEnrolled ? Icons.check_circle : Icons.school, size: 20, color: Colors.white),
                            const SizedBox(width: 8),
                            Text(
                              _isEnrolled ? 'ENROLLED' : 'ENROLL NOW',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickStat(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.secondary, size: 18),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w700, fontSize: 12)),
        Text(label, style: const TextStyle(color: AppTheme.textSubtle, fontSize: 10)),
      ],
    );
  }

  Widget _buildOverviewTab(Map<String, dynamic> c) {
    final desc = c['description']?.toString() ?? c['shortDescription']?.toString() ?? 'No description provided.';
    final outcomes = (c['learningOutcomes'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [
      'Gain comprehensive theoretical and practical knowledge',
      'Complete hands-on interactive assessments and quizzes',
      'Earn course completion certificate & XP bonuses',
    ];
    final prereqs = (c['prerequisites'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? ['Basic interest in the topic'];

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('About This Course', style: TextStyle(color: AppTheme.textMain, fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text(
            desc,
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 20),

          const Text('What You Will Learn', style: TextStyle(color: AppTheme.textMain, fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          ...outcomes.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle_outline, color: AppTheme.success, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        item,
                        style: const TextStyle(color: AppTheme.textMain, fontSize: 13, height: 1.3),
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 16),

          const Text('Prerequisites', style: TextStyle(color: AppTheme.textMain, fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ...prereqs.map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    const Icon(Icons.circle, color: AppTheme.textSubtle, size: 6),
                    const SizedBox(width: 10),
                    Text(p, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildCurriculumTab(Map<String, dynamic> c) {
    final modules = (c['modules'] as List<dynamic>?) ?? [];
    if (modules.isEmpty) {
      return const Center(
        child: Text('Curriculum lessons will be unlocked upon enrollment.', style: TextStyle(color: AppTheme.textMuted)),
      );
    }

    return ListView.builder(
      itemCount: modules.length,
      itemBuilder: (context, idx) {
        final mod = modules[idx] as Map<String, dynamic>;
        final modTitle = mod['title']?.toString() ?? 'Module ${idx + 1}';
        final lessons = (mod['lessons'] as List<dynamic>?) ?? [];

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppTheme.bgSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderSubtle),
          ),
          child: ExpansionTile(
            initiallyExpanded: idx == 0,
            iconColor: AppTheme.secondary,
            collapsedIconColor: AppTheme.textSubtle,
            title: Text(
              modTitle,
              style: const TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w700, fontSize: 13),
            ),
            subtitle: Text(
              '${lessons.length} lessons',
              style: const TextStyle(color: AppTheme.textSubtle, fontSize: 11),
            ),
            children: lessons.map((l) {
              final lessonMap = l as Map<String, dynamic>;
              final lTitle = lessonMap['title']?.toString() ?? 'Lesson';
              final mins = lessonMap['estimatedMinutes'] ?? 15;
              final xp = lessonMap['xpReward'] ?? 25;
              final isPreview = lessonMap['isFreePreview'] == true;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: AppTheme.borderSubtle, width: 0.5)),
                ),
                child: Row(
                  children: [
                    Icon(
                      isPreview ? Icons.play_circle_fill : Icons.lock_outline,
                      size: 18,
                      color: isPreview ? AppTheme.secondary : AppTheme.textSubtle,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            lTitle,
                            style: const TextStyle(color: AppTheme.textMain, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                          Text(
                            '$mins mins • +$xp XP',
                            style: const TextStyle(color: AppTheme.textSubtle, fontSize: 10),
                          ),
                        ],
                      ),
                    ),
                    if (isPreview)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.success.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'Preview',
                          style: TextStyle(color: AppTheme.success, fontSize: 10, fontWeight: FontWeight.w700),
                        ),
                      ),
                  ],
                ),
              );
            }).toList(),
          ),
        );
      },
    );
  }

  Widget _buildReviewsTab(Map<String, dynamic> c) {
    final reviews = (c['reviews'] as List<dynamic>?) ?? [];
    if (reviews.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.rate_review_outlined, color: AppTheme.textSubtle, size: 40),
            SizedBox(height: 10),
            Text('No student reviews yet.', style: TextStyle(color: AppTheme.textMuted)),
            Text('Be the first to enroll and submit your review!', style: TextStyle(color: AppTheme.textSubtle, fontSize: 12)),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: reviews.length,
      itemBuilder: (context, idx) {
        final r = reviews[idx] as Map<String, dynamic>;
        final studentName = r['studentName']?.toString() ?? 'Student';
        final rating = (r['rating'] as num?)?.toInt() ?? 5;
        final comment = r['comment']?.toString() ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.bgSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: AppTheme.primary.withOpacity(0.3),
                    child: Text(
                      studentName[0],
                      style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      studentName,
                      style: const TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ),
                  Row(
                    children: List.generate(
                      5,
                      (i) => Icon(
                        i < rating ? Icons.star : Icons.star_border,
                        color: AppTheme.warning,
                        size: 14,
                      ),
                    ),
                  ),
                ],
              ),
              if (comment.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  comment,
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.4),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
