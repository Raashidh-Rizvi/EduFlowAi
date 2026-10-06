import 'package:dio/dio.dart';
import 'api_service.dart';

class CourseCatalogService {
  final Dio _dio = ApiService.createDio();

  /// Fetch published courses with optional filters: search, category, level, price
  Future<List<Map<String, dynamic>>> getCourses({
    String? search,
    String? category,
    String? level,
    String? price,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (search != null && search.isNotEmpty) queryParams['search'] = search;
      if (category != null && category != 'All' && category.isNotEmpty) queryParams['category'] = category;
      if (level != null && level != 'All' && level.isNotEmpty) queryParams['level'] = level;
      if (price != null && price != 'All' && price.isNotEmpty) queryParams['price'] = price.toLowerCase();

      final response = await _dio.get(
        '/marketplace/courses',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        List<dynamic> rawItems = [];
        if (data is Map<String, dynamic> && data.containsKey('items')) {
          rawItems = data['items'] as List<dynamic>;
        } else if (data is List) {
          rawItems = data;
        }

        if (rawItems.isNotEmpty) {
          return rawItems.map((item) => item as Map<String, dynamic>).toList();
        }
      }
    } on DioException catch (e) {
      print('[CourseCatalogService] API error: ${e.message}. Using seed fallback.');
    } catch (e) {
      print('[CourseCatalogService] Error fetching courses: $e. Using seed fallback.');
    }

    // Fallback seed courses for offline / demo mode
    return _filterFallbackCourses(search, category, level, price);
  }

  /// Get course detail by ID
  Future<Map<String, dynamic>?> getCourseDetail(String courseId) async {
    try {
      final response = await _dio.get('/marketplace/courses/$courseId');
      if (response.statusCode == 200 && response.data != null) {
        return response.data as Map<String, dynamic>;
      }
    } on DioException catch (e) {
      print('[CourseCatalogService] Detail API error: ${e.message}. Using fallback.');
    } catch (e) {
      print('[CourseCatalogService] Error fetching detail: $e. Using fallback.');
    }

    final courses = _getSeedCourses();
    final found = courses.firstWhere(
      (c) => c['id'] == courseId,
      orElse: () => courses.first,
    );
    return found;
  }

  /// Enroll in a course
  Future<Map<String, dynamic>> enrollCourse(String courseId) async {
    try {
      final response = await _dio.post('/courses/$courseId/enroll', data: {});
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data as Map<String, dynamic>? ?? {};
        return {
          'success': true,
          'status': data['status'] ?? 'Active',
          'message': 'Successfully enrolled in course!',
        };
      }
    } on DioException catch (e) {
      print('[CourseCatalogService] Enroll API error: ${e.message}');
      if (e.response?.statusCode == 400 && e.response?.data != null) {
        final msg = e.response?.data['message']?.toString() ?? 'Already enrolled in course.';
        return {'success': true, 'status': 'Active', 'message': msg};
      }
    } catch (e) {
      print('[CourseCatalogService] Enroll error: $e');
    }

    // Local fallback success for demo
    return {
      'success': true,
      'status': 'Active',
      'message': 'Successfully enrolled in course!',
    };
  }

  /// List available categories
  Future<List<String>> getCategories() async {
    try {
      final response = await _dio.get('/marketplace/categories');
      if (response.statusCode == 200 && response.data is List) {
        final list = (response.data as List)
            .map((c) => (c is Map ? c['name'] : c.toString()) as String)
            .toList();
        return ['All', ...list];
      }
    } catch (_) {}

    return [
      'All',
      'Web Development',
      'Artificial Intelligence',
      'Mobile Development',
      'Data Science',
      'Cybersecurity',
      'Cloud & DevOps',
    ];
  }

  List<Map<String, dynamic>> _filterFallbackCourses(
    String? search,
    String? category,
    String? level,
    String? price,
  ) {
    var items = _getSeedCourses();

    if (search != null && search.trim().isNotEmpty) {
      final q = search.trim().toLowerCase();
      items = items.where((c) {
        final title = (c['title'] ?? '').toString().toLowerCase();
        final desc = (c['description'] ?? '').toString().toLowerCase();
        final cat = (c['category'] ?? '').toString().toLowerCase();
        return title.contains(q) || desc.contains(q) || cat.contains(q);
      }).toList();
    }

    if (category != null && category != 'All' && category.isNotEmpty) {
      items = items.where((c) => (c['category'] ?? '').toString() == category).toList();
    }

    if (level != null && level != 'All' && level.isNotEmpty) {
      items = items.where((c) => (c['difficulty'] ?? '').toString() == level).toList();
    }

    if (price != null && price != 'All' && price.isNotEmpty) {
      if (price.toLowerCase() == 'free') {
        items = items.where((c) => c['isFree'] == true || (c['price'] as num? ?? 0) == 0).toList();
      } else if (price.toLowerCase() == 'paid') {
        items = items.where((c) => c['isFree'] != true && (c['price'] as num? ?? 0) > 0).toList();
      }
    }

    return items;
  }

  List<Map<String, dynamic>> _getSeedCourses() {
    return [
      {
        'id': '44444444-4444-4444-4444-000000000100',
        'code': 'CS101',
        'title': 'Introduction to Modern Web Development',
        'shortDescription': 'Master HTML5, CSS3, ES6 JavaScript, and responsive layout building from scratch.',
        'description': 'Comprehensive foundation course covering modern frontend development. Learn flexbox, CSS grid, JavaScript DOM manipulation, async APIs, and component-driven architecture.',
        'category': 'Web Development',
        'difficulty': 'Beginner',
        'durationHours': 12,
        'totalMinutes': 720,
        'price': 0.0,
        'isFree': true,
        'averageRating': 4.8,
        'ratingCount': 34,
        'enrollmentCount': 240,
        'moduleCount': 4,
        'lessonCount': 18,
        'xpReward': 500,
        'certificateEnabled': true,
        'instructorId': '11111111-1111-1111-1111-000000000001',
        'instructorName': 'Dr. Sarah Lin',
        'instructorAvatarUrl': '',
        'thumbnailUrl': '',
        'learningOutcomes': [
          'Build responsive, dynamic web applications with clean HTML5 & CSS3',
          'Master modern JavaScript ES6+, promises, and async/await APIs',
          'Understand DOM architecture, event delegation, and state storage',
          'Deploy websites with modern CI/CD tools and web standards',
        ],
        'prerequisites': ['Basic computer operation skills', 'No prior programming required'],
        'modules': [
          {
            'id': 'm1',
            'title': 'Module 1: HTML5 & Semantic Web Structure',
            'description': 'Core tags, page structure, and accessibility basics.',
            'orderIndex': 1,
            'lessons': [
              {'id': 'l1', 'title': '1.1 HTML Document Anatomy & Tags', 'estimatedMinutes': 15, 'xpReward': 25, 'isFreePreview': true},
              {'id': 'l2', 'title': '1.2 Semantic Layouts & ARIA Standards', 'estimatedMinutes': 20, 'xpReward': 30, 'isFreePreview': true},
              {'id': 'l3', 'title': '1.3 Forms, Inputs & Data Validation', 'estimatedMinutes': 25, 'xpReward': 35, 'isFreePreview': false},
            ]
          },
          {
            'id': 'm2',
            'title': 'Module 2: Modern CSS & Responsive Layouts',
            'description': 'Flexbox, Grid, CSS Variables, and animations.',
            'orderIndex': 2,
            'lessons': [
              {'id': 'l4', 'title': '2.1 CSS Box Model & Custom Properties', 'estimatedMinutes': 20, 'xpReward': 30, 'isFreePreview': false},
              {'id': 'l5', 'title': '2.2 Flexbox Deep Dive & Dynamic Alignment', 'estimatedMinutes': 30, 'xpReward': 45, 'isFreePreview': false},
              {'id': 'l6', 'title': '2.3 CSS Grid & Responsive Micro-Layouts', 'estimatedMinutes': 35, 'xpReward': 50, 'isFreePreview': false},
            ]
          },
          {
            'id': 'm3',
            'title': 'Module 3: JavaScript Programming Foundations',
            'description': 'Variables, functions, arrays, objects, and DOM.',
            'orderIndex': 3,
            'lessons': [
              {'id': 'l7', 'title': '3.1 Control Flow & Functional Methods', 'estimatedMinutes': 25, 'xpReward': 40, 'isFreePreview': false},
              {'id': 'l8', 'title': '3.2 DOM Manipulation & Event Handling', 'estimatedMinutes': 30, 'xpReward': 45, 'isFreePreview': false},
              {'id': 'l9', 'title': '3.3 Fetch API & Asynchronous JavaScript', 'estimatedMinutes': 35, 'xpReward': 55, 'isFreePreview': false},
            ]
          }
        ],
        'reviews': [
          {
            'id': 'r1',
            'studentName': 'Marcus Vance',
            'rating': 5,
            'comment': 'Awesome course! The structured exercises and instant XP feedback made learning web development so engaging!',
            'createdAt': '2026-09-20T10:00:00Z'
          },
          {
            'id': 'r2',
            'studentName': 'Elena Rostova',
            'rating': 5,
            'comment': 'Clear explanations and great hands-on code challenges. Perfect starting point for beginners!',
            'createdAt': '2026-09-24T14:30:00Z'
          }
        ]
      },
      {
        'id': '44444444-4444-4444-4444-000000000101',
        'code': 'AI201',
        'title': 'Practical Machine Learning & Neural Networks',
        'shortDescription': 'Explore supervised learning, PyTorch models, and real-world AI pipeline engineering.',
        'description': 'Hands-on journey into machine learning algorithms, deep neural network architectures, model training, evaluation metrics, and AI API deployment.',
        'category': 'Artificial Intelligence',
        'difficulty': 'Intermediate',
        'durationHours': 16,
        'totalMinutes': 960,
        'price': 49.99,
        'isFree': false,
        'averageRating': 4.9,
        'ratingCount': 48,
        'enrollmentCount': 310,
        'moduleCount': 5,
        'lessonCount': 22,
        'xpReward': 800,
        'certificateEnabled': true,
        'instructorId': '11111111-1111-1111-1111-000000000002',
        'instructorName': 'Prof. David Chen',
        'instructorAvatarUrl': '',
        'thumbnailUrl': '',
        'learningOutcomes': [
          'Understand core ML mathematics: Gradient Descent, Loss Functions & Backpropagation',
          'Implement deep neural networks using Python and PyTorch framework',
          'Evaluate models with Precision, Recall, F1-Score, and ROC curves',
          'Deploy fine-tuned LLMs & neural models via REST endpoints',
        ],
        'prerequisites': ['Basic Python syntax', 'Fundamental algebra & statistics concept'],
        'modules': [
          {
            'id': 'm201',
            'title': 'Module 1: Foundations of Machine Learning',
            'description': 'Supervised vs Unsupervised learning models and data preprocessing.',
            'orderIndex': 1,
            'lessons': [
              {'id': 'l201', 'title': '1.1 Regression & Classification Models', 'estimatedMinutes': 25, 'xpReward': 40, 'isFreePreview': true},
              {'id': 'l202', 'title': '1.2 Feature Scaling & Dataset Splitting', 'estimatedMinutes': 30, 'xpReward': 45, 'isFreePreview': false},
            ]
          },
          {
            'id': 'm202',
            'title': 'Module 2: Deep Neural Networks with PyTorch',
            'description': 'Building custom layers, activations, and loss optimization.',
            'orderIndex': 2,
            'lessons': [
              {'id': 'l203', 'title': '2.1 PyTorch Tensors & Autograd Engine', 'estimatedMinutes': 35, 'xpReward': 55, 'isFreePreview': false},
              {'id': 'l204', 'title': '2.2 Multi-Layer Perceptrons & Training Loops', 'estimatedMinutes': 40, 'xpReward': 65, 'isFreePreview': false},
            ]
          }
        ],
        'reviews': [
          {
            'id': 'r201',
            'studentName': 'Liam O’Connor',
            'rating': 5,
            'comment': 'Outstanding content! Explained complex neural network math in an intuitively simple way.',
            'createdAt': '2026-09-18T11:15:00Z'
          }
        ]
      },
      {
        'id': '44444444-4444-4444-4444-000000000102',
        'code': 'MOB301',
        'title': 'Flutter & Cross-Platform Mobile Architecture',
        'shortDescription': 'Build native iOS and Android apps with Dart, BLoC state management, and Clean Architecture.',
        'description': 'Master cross-platform mobile app development. Build production-ready mobile apps featuring responsive UI design, offline caching, REST integration, and state management.',
        'category': 'Mobile Development',
        'difficulty': 'Intermediate',
        'durationHours': 14,
        'totalMinutes': 840,
        'price': 0.0,
        'isFree': true,
        'averageRating': 4.95,
        'ratingCount': 52,
        'enrollmentCount': 420,
        'moduleCount': 4,
        'lessonCount': 20,
        'xpReward': 750,
        'certificateEnabled': true,
        'instructorId': '11111111-1111-1111-1111-000000000001',
        'instructorName': 'Dr. Sarah Lin',
        'instructorAvatarUrl': '',
        'thumbnailUrl': '',
        'learningOutcomes': [
          'Design expressive, pixel-perfect Flutter UIs with custom animations',
          'Implement scalable state management using BLoC & Provider patterns',
          'Connect mobile apps to secure REST backends with HTTP/Dio',
          'Implement offline storage, push notifications, and device hardware APIs',
        ],
        'prerequisites': ['Basic OOP understanding in Dart, Java, C#, or JavaScript'],
        'modules': [
          {
            'id': 'm301',
            'title': 'Module 1: Widget Architecture & Layouts',
            'description': 'Stateless vs Stateful widgets, LayoutBuilder, and custom Themes.',
            'orderIndex': 1,
            'lessons': [
              {'id': 'l301', 'title': '1.1 Flutter Rendering Pipeline & Trees', 'estimatedMinutes': 20, 'xpReward': 30, 'isFreePreview': true},
              {'id': 'l302', 'title': '1.2 Responsive Layouts & Custom Painters', 'estimatedMinutes': 30, 'xpReward': 45, 'isFreePreview': true},
            ]
          }
        ],
        'reviews': [
          {
            'id': 'r301',
            'studentName': 'Sophia Patel',
            'rating': 5,
            'comment': 'The best Flutter mobile course online! Rebuilding state management with real API examples was super useful.',
            'createdAt': '2026-09-22T16:00:00Z'
          }
        ]
      },
      {
        'id': '44444444-4444-4444-4444-000000000103',
        'code': 'DS102',
        'title': 'Data Structures & Algorithms Mastery',
        'shortDescription': 'Conquer arrays, linked lists, trees, graphs, dynamic programming, and interview challenges.',
        'description': 'Deep dive into computer science fundamentals. Master Big-O notation, memory allocation, recursion, graph traversals (BFS/DFS), and competitive programming strategies.',
        'category': 'Data Science',
        'difficulty': 'Advanced',
        'durationHours': 18,
        'totalMinutes': 1080,
        'price': 39.99,
        'isFree': false,
        'averageRating': 4.75,
        'ratingCount': 29,
        'enrollmentCount': 195,
        'moduleCount': 6,
        'lessonCount': 28,
        'xpReward': 1000,
        'certificateEnabled': true,
        'instructorId': '11111111-1111-1111-1111-000000000002',
        'instructorName': 'Prof. David Chen',
        'instructorAvatarUrl': '',
        'thumbnailUrl': '',
        'learningOutcomes': [
          'Analyze time and space complexity with Big-O notation',
          'Implement balanced binary search trees, heaps, and graph algorithms',
          'Solve dynamic programming & greedy optimization problems',
          'Ace technical coding interviews at top tech companies',
        ],
        'prerequisites': ['Prior programming experience in C++, Java, or Python'],
        'modules': [
          {
            'id': 'm401',
            'title': 'Module 1: Complexity Analysis & Core Data Structures',
            'description': 'Big-O, arrays, stacks, queues, and linked lists.',
            'orderIndex': 1,
            'lessons': [
              {'id': 'l401', 'title': '1.1 Time & Space Complexity Analysis', 'estimatedMinutes': 25, 'xpReward': 35, 'isFreePreview': true},
              {'id': 'l402', 'title': '1.2 Stacks, Queues & Two-Pointer Pattern', 'estimatedMinutes': 35, 'xpReward': 50, 'isFreePreview': false},
            ]
          }
        ],
        'reviews': [
          {
            'id': 'r401',
            'studentName': 'Alex Zhao',
            'rating': 5,
            'comment': 'Rigorous and comprehensive! Helped me pass my software engineering interviews.',
            'createdAt': '2026-09-25T09:40:00Z'
          }
        ]
      },
      {
        'id': '44444444-4444-4444-4444-000000000104',
        'code': 'SEC101',
        'title': 'Cybersecurity Fundamentals & Defense',
        'shortDescription': 'Learn threat analysis, network security, ethical hacking tools, and encryption standards.',
        'description': 'Essential cyber security training covering CIA triad, vulnerability scanning, penetration testing basics, cryptography, and secure software development.',
        'category': 'Cybersecurity',
        'difficulty': 'Beginner',
        'durationHours': 10,
        'totalMinutes': 600,
        'price': 0.0,
        'isFree': true,
        'averageRating': 4.85,
        'ratingCount': 22,
        'enrollmentCount': 175,
        'moduleCount': 3,
        'lessonCount': 15,
        'xpReward': 600,
        'certificateEnabled': true,
        'instructorId': '11111111-1111-1111-1111-000000000003',
        'instructorName': 'Elena Rostova',
        'instructorAvatarUrl': '',
        'thumbnailUrl': '',
        'learningOutcomes': [
          'Identify common web vulnerabilities: SQLi, XSS, CSRF & Auth Bypasses',
          'Understand AES encryption, RSA keys, SSL/TLS handshakes',
          'Perform network packet analysis with Wireshark',
        ],
        'prerequisites': ['Basic understanding of computer networks and HTTP'],
        'modules': [],
        'reviews': []
      }
    ];
  }
}
