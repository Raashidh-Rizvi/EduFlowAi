import 'package:flutter/material.dart';

void main() {
  runApp(const EduFlowApp());
}

class EduFlowApp extends StatelessWidget {
  const EduFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EduFlow AI Student',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
      ),
      home: const StudentHomeScreen(),
    );
  }
}

class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({super.key});

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  int _selectedIndex = 0;
  bool _planRequested = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF06B6D4)],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Text(
              'EduFlow AI',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _buildCoursesTab(),
          _buildAiStudyCoachTab(),
          _buildAssessmentsTab(),
          _buildProfileTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: const Color(0xFF111827),
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.book_outlined),
            selectedIcon: Icon(Icons.book),
            label: 'Courses',
          ),
          NavigationDestination(
            icon: Icon(Icons.psychology_outlined),
            selectedIcon: Icon(Icons.psychology),
            label: 'AI Study Coach',
          ),
          NavigationDestination(
            icon: Icon(Icons.quiz_outlined),
            selectedIcon: Icon(Icons.quiz),
            label: 'Quizzes',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildCoursesTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Enrolled Courses',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 12),
        Card(
          color: const Color(0xFF1F2937),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('SE3090', style: TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold)),
                    ),
                    const Text('Progress: 35%', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  'Software Engineering Frameworks',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Instructor: Dr. Sarah Jenkins',
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                ),
                const SizedBox(height: 12),
                LinearProgressIndicator(
                  value: 0.35,
                  backgroundColor: Colors.black26,
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAiStudyCoachTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Personalized AI Study Coach 🤖',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 6),
        const Text(
          'Request a personalized study plan built by our 4-Agent LangGraph AI and approved by your course instructor.',
          style: TextStyle(fontSize: 13, color: Colors.grey),
        ),
        const SizedBox(height: 16),
        Card(
          color: const Color(0xFF1F2937),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Target Learning Objective', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 8),
                TextField(
                  readOnly: true,
                  controller: TextEditingController(text: 'Prepare for Midterm Quiz in 2 weeks (8 hrs/week)'),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: const Color(0xFF111827),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        _planRequested = true;
                      });
                    },
                    icon: const Icon(Icons.bolt, color: Colors.white),
                    label: Text(_planRequested ? 'Proposal Sent to Instructor' : 'Generate AI Study Plan'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_planRequested) ...[
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withOpacity(0.12),
              border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Row(
              children: [
                Icon(Icons.hourglass_top, color: Color(0xFFF59E0B)),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Multi-agent plan generated. Status: Pending Instructor Approval in React Portal.',
                    style: TextStyle(fontSize: 13, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildAssessmentsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Active Quizzes & Assignments',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 12),
        Card(
          color: const Color(0xFF1F2937),
          child: ListTile(
            leading: const Icon(Icons.timer_outlined, color: Color(0xFF06B6D4)),
            title: const Text('Quiz 1: Agentic AI & Clean Architecture', style: TextStyle(color: Colors.white)),
            subtitle: const Text('Time Limit: 20 Mins | Max Score: 100'),
            trailing: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF06B6D4), foregroundColor: Colors.black),
              child: const Text('Start'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileTab() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: Color(0xFF6366F1),
            child: Text('AR', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
          SizedBox(height: 12),
          Text('Alex Rivera', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
          Text('Student ID: IT22104500', style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
