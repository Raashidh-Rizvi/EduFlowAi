import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../services/course_catalog_service.dart';
import 'course_detail_screen.dart';

class ExploreScreen extends StatefulWidget {
  final Function(String courseId)? onCourseEnrolled;

  const ExploreScreen({
    Key? key,
    this.onCourseEnrolled,
  }) : super(key: key);

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final CourseCatalogService _catalogService = CourseCatalogService();
  final TextEditingController _searchController = TextEditingController();

  List<Map<String, dynamic>> _courses = [];
  List<String> _categories = ['All'];
  
  String _selectedCategory = 'All';
  String _selectedLevel = 'All';
  String _selectedPrice = 'All';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _fetchCourses();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    final cats = await _catalogService.getCategories();
    if (mounted) {
      setState(() {
        _categories = cats;
      });
    }
  }

  Future<void> _fetchCourses() async {
    setState(() => _isLoading = true);
    final results = await _catalogService.getCourses(
      search: _searchController.text,
      category: _selectedCategory,
      level: _selectedLevel,
      price: _selectedPrice,
    );
    if (mounted) {
      setState(() {
        _courses = results;
        _isLoading = false;
      });
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

  void _openCourseDetail(Map<String, dynamic> course) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => CourseDetailScreen(
          course: course,
          onEnrolled: (courseId) {
            if (widget.onCourseEnrolled != null) {
              widget.onCourseEnrolled!(courseId);
            }
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgSurface,
        title: const Text(
          'Explore Catalog',
          style: TextStyle(fontWeight: FontWeight.w800, color: AppTheme.textMain, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.textMuted),
            onPressed: _fetchCourses,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchCourses,
        color: AppTheme.secondary,
        backgroundColor: AppTheme.bgSurface,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Search Bar
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.bgSurface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.borderSubtle),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => _fetchCourses(),
                  style: const TextStyle(color: AppTheme.textMain, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search courses, topics, instructors...',
                    hintStyle: const TextStyle(color: AppTheme.textSubtle, fontSize: 13),
                    prefixIcon: const Icon(Icons.search, color: AppTheme.textSubtle, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: AppTheme.textSubtle, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _fetchCourses();
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // 2. Categories Pill Carousel
              SizedBox(
                height: 38,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    final isSelected = _selectedCategory == cat;
                    return GestureDetector(
                      onTap: () {
                        setState(() => _selectedCategory = cat);
                        _fetchCourses();
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.secondary : AppTheme.bgSurface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? AppTheme.secondary : AppTheme.borderSubtle,
                          ),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: AppTheme.secondary.withOpacity(0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  )
                                ]
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            cat,
                            style: TextStyle(
                              color: isSelected ? Colors.white : AppTheme.textMuted,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 12),

              // 3. Filters Row (Level & Price)
              Row(
                children: [
                  const Text('Filter:', style: TextStyle(color: AppTheme.textSubtle, fontSize: 11, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 8),

                  // Level Dropdown Chip
                  _buildFilterDropdown(
                    label: 'Level: $_selectedLevel',
                    items: ['All', 'Beginner', 'Intermediate', 'Advanced'],
                    currentValue: _selectedLevel,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedLevel = val);
                        _fetchCourses();
                      }
                    },
                  ),
                  const SizedBox(width: 8),

                  // Price Dropdown Chip
                  _buildFilterDropdown(
                    label: 'Price: $_selectedPrice',
                    items: ['All', 'Free', 'Paid'],
                    currentValue: _selectedPrice,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedPrice = val);
                        _fetchCourses();
                      }
                    },
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // 4. Featured Banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF312E81), Color(0xFF1E1B4B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.borderAccent),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            '🎓 Explore & Enroll',
                            style: TextStyle(color: AppTheme.warning, fontWeight: FontWeight.w900, fontSize: 13),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Unlock new skills & earn XP',
                            style: TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w800, fontSize: 15),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Enroll in any course to add it to your learning journey.',
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    const CircleAvatar(
                      radius: 24,
                      backgroundColor: AppTheme.primary,
                      child: Icon(Icons.explore, color: Colors.white, size: 28),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // 5. Course Cards List Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Available Courses (${_courses.length})',
                    style: const TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                  if (_selectedCategory != 'All' || _selectedLevel != 'All' || _selectedPrice != 'All' || _searchController.text.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        _searchController.clear();
                        setState(() {
                          _selectedCategory = 'All';
                          _selectedLevel = 'All';
                          _selectedPrice = 'All';
                        });
                        _fetchCourses();
                      },
                      child: const Text(
                        'Reset Filters',
                        style: TextStyle(color: AppTheme.secondary, fontSize: 12, fontWeight: FontWeight.w700),
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 12),

              // 6. Course List / Grid
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.all(40.0),
                  child: Center(
                    child: CircularProgressIndicator(color: AppTheme.secondary),
                  ),
                )
              else if (_courses.isEmpty)
                Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: AppTheme.bgSurface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.borderSubtle),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.search_off, color: AppTheme.textSubtle, size: 44),
                      const SizedBox(height: 12),
                      const Text(
                        'No courses found matching criteria',
                        style: TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Try adjusting your search query or filter tags.',
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _selectedCategory = 'All';
                            _selectedLevel = 'All';
                            _selectedPrice = 'All';
                          });
                          _fetchCourses();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.secondary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Clear All Filters', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _courses.length,
                  itemBuilder: (context, index) {
                    final course = _courses[index];
                    return _buildCourseCard(course);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterDropdown({
    required String label,
    required List<String> items,
    required String currentValue,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: currentValue,
          dropdownColor: AppTheme.bgSurface,
          isDense: true,
          style: const TextStyle(color: AppTheme.textMain, fontSize: 11, fontWeight: FontWeight.w700),
          icon: const Icon(Icons.keyboard_arrow_down, color: AppTheme.textSubtle, size: 16),
          onChanged: onChanged,
          items: items.map((item) {
            return DropdownMenuItem<String>(
              value: item,
              child: Text(item, style: const TextStyle(color: AppTheme.textMain, fontSize: 11)),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCourseCard(Map<String, dynamic> course) {
    final title = course['title']?.toString() ?? 'Course';
    final shortDesc = course['shortDescription']?.toString() ?? course['description']?.toString() ?? '';
    final category = course['category']?.toString() ?? 'General';
    final difficulty = course['difficulty']?.toString() ?? 'Beginner';
    final instructor = course['instructorName']?.toString() ?? 'EduFlow';
    final rating = (course['averageRating'] as num?)?.toDouble() ?? 4.8;
    final ratingCount = (course['ratingCount'] as num?)?.toInt() ?? 12;
    final durationHours = (course['durationHours'] as num?)?.toInt() ?? 10;
    final xpReward = (course['xpReward'] as num?)?.toInt() ?? 500;
    final isFree = course['isFree'] == true || (course['price'] as num? ?? 0) == 0;
    final priceStr = isFree ? 'FREE' : '\$${(course['price'] as num).toStringAsFixed(2)}';

    return GestureDetector(
      onTap: () => _openCourseDetail(course),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: AppTheme.bgSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.borderSubtle),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Card Banner Header
            Container(
              height: 90,
              decoration: BoxDecoration(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primary.withOpacity(0.8),
                    AppTheme.secondary.withOpacity(0.6),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              padding: const EdgeInsets.all(12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Category Tag
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      category,
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                    ),
                  ),

                  // Difficulty Tag
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getDifficultyColor(difficulty).withOpacity(0.25),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: _getDifficultyColor(difficulty)),
                    ),
                    child: Text(
                      difficulty,
                      style: TextStyle(color: _getDifficultyColor(difficulty), fontSize: 10, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),

            // Card Body
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                  if (shortDesc.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      shortDesc,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.3),
                    ),
                  ],
                  const SizedBox(height: 12),

                  // Stats Row
                  Row(
                    children: [
                      const Icon(Icons.star, color: AppTheme.warning, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        rating.toStringAsFixed(1),
                        style: const TextStyle(color: AppTheme.textMain, fontWeight: FontWeight.w800, fontSize: 12),
                      ),
                      Text(' ($ratingCount)', style: const TextStyle(color: AppTheme.textSubtle, fontSize: 10)),
                      const SizedBox(width: 12),
                      const Icon(Icons.schedule, color: AppTheme.textSubtle, size: 14),
                      const SizedBox(width: 4),
                      Text('$durationHours hrs', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                      const Spacer(),
                      // XP Tag
                      Text(
                        '+$xpReward XP',
                        style: const TextStyle(color: AppTheme.warning, fontWeight: FontWeight.w800, fontSize: 11),
                      ),
                    ],
                  ),

                  const Divider(color: AppTheme.borderSubtle, height: 20),

                  // Card Footer
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.person_outline, size: 14, color: AppTheme.textSubtle),
                          const SizedBox(width: 4),
                          Text(
                            instructor,
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Text(
                            priceStr,
                            style: TextStyle(
                              color: isFree ? AppTheme.success : AppTheme.secondary,
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(width: 10),
                          ElevatedButton(
                            onPressed: () => _openCourseDetail(course),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.secondary,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: const Text(
                              'Explore',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
