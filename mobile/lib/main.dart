import 'package:flutter/material.dart';

void main() {
  runApp(const EduFlowApp());
}

class EduFlowApp extends StatelessWidget {
  const EduFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EduFlow AI Student 🎓🎮',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Roboto',
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
  int _totalXp = 1250;
  int _currentLevel = 2;
  int _streakDays = 5;
  int _freezeTokens = 2;
  bool _missionCompleted = false;

  void _claimMissionXp(int xp) {
    setState(() {
      _totalXp += xp;
      _missionCompleted = true;
      if (_totalXp >= 1500) {
        _currentLevel = 3;
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        content: Row(
          children: [
            const Text('🎉 ', style: TextStyle(fontSize: 20)),
            Expanded(
              child: Text(
                '+$xp XP Earned! Total XP: $_totalXp (${_totalXp >= 1500 ? "LEVEL UP! ⚡" : "Keep going!"})',
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF06B6D4)],
                ),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6366F1).withOpacity(0.4),
                    blurRadius: 10,
                  )
                ],
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'EduFlow AI',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: Colors.white),
                ),
                Text(
                  'Level $_currentLevel • Code Apprentice',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Streak Flame Pill
          Container(
            margin: const EdgeInsets.only(right: 8, top: 10, bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF97316).withOpacity(0.15),
              border: Border.all(color: const Color(0xFFF97316).withOpacity(0.4)),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                const Text('🔥', style: TextStyle(fontSize: 14)),
                const SizedBox(width: 4),
                Text(
                  '$_streakDays Days',
                  style: const TextStyle(
                    color: Color(0xFFF97316),
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // Coins Pill
          Container(
            margin: const EdgeInsets.only(right: 12, top: 10, bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withOpacity(0.15),
              border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              children: [
                Text('💰', style: TextStyle(fontSize: 14)),
                SizedBox(width: 4),
                Text(
                  '180',
                  style: TextStyle(
                    color: Color(0xFFF59E0B),
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          _buildHomeGameLoopTab(),
          _buildLearningJourneyTab(),
          _buildLeaderboardTab(),
          _buildAiCoachTab(),
          _buildProfileTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        backgroundColor: const Color(0xFF111827),
        indicatorColor: const Color(0xFF6366F1).withOpacity(0.25),
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: Color(0xFF818CF8)),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map, color: Color(0xFF06B6D4)),
            label: 'Journey',
          ),
          NavigationDestination(
            icon: Icon(Icons.emoji_events_outlined),
            selectedIcon: Icon(Icons.emoji_events, color: Color(0xFFF59E0B)),
            label: 'Rankings',
          ),
          NavigationDestination(
            icon: Icon(Icons.psychology_outlined),
            selectedIcon: Icon(Icons.psychology, color: Color(0xFFF43F5E)),
            label: 'AI Coach',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: Colors.white),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  // --- 1. Home Game Loop Tab ---
  Widget _buildHomeGameLoopTab() {
    double progress = (_totalXp - 500) / 1000.0;
    progress = progress.clamp(0.0, 1.0);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Greeting & XP Bar Card
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                const Color(0xFF1F2937),
                const Color(0xFF6366F1).withOpacity(0.15),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Good afternoon, Alex 👋',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  Text('⚡ Level 2', style: TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('$_totalXp / 1,500 XP', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                  Text('${(1500 - _totalXp)} XP to Level 3', style: const TextStyle(fontSize: 12, color: Color(0xFF06B6D4))),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 10,
                  backgroundColor: Colors.black38,
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Today's Mission Card
        const Text(
          "Today's Mission 🎯",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: _missionCompleted ? const Color(0xFF10B981) : const Color(0xFFF59E0B).withOpacity(0.4),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('DAILY MISSION', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                  const Text('+120 XP • +40 Coins', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 10),
              const Text(
                'Clean Architecture & EF Core Indexing',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 6),
              const Text(
                'Complete 1 lesson and score ≥ 80% on the Module 1 Quiz to claim your daily reward.',
                style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _missionCompleted ? null : () => _claimMissionXp(120),
                  icon: Icon(_missionCompleted ? Icons.check_circle : Icons.play_arrow, color: Colors.white),
                  label: Text(_missionCompleted ? 'Mission Completed & Claimed' : 'Start & Claim Reward (+120 XP)'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _missionCompleted ? const Color(0xFF10B981) : const Color(0xFF6366F1),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Quick Continue Learning
        const Text(
          "Continue Learning 📚",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 10),
        Card(
          color: const Color(0xFF1F2937),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF6366F1).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.code, color: Color(0xFF818CF8)),
            ),
            title: const Text('SE3090: Clean Architecture', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            subtitle: const Text('Lesson 1.2: Deterministic XP Ledgers (+40 XP)'),
            trailing: const Icon(Icons.chevron_right, color: Color(0xFF94A3B8)),
            onTap: () => _claimMissionXp(40),
          ),
        ),
      ],
    );
  }

  // --- 2. Learning Journey Tab ---
  Widget _buildLearningJourneyTab() {
    final nodes = [
      {'title': '🌱 1. Clean Architecture Foundations', 'status': 'Completed', 'xp': '+30 XP', 'done': true},
      {'title': '🧩 2. PostgreSQL Indexes & Constraints', 'status': 'Completed', 'xp': '+40 XP', 'done': true},
      {'title': '⚔️ 3. EF Core Migrations & Transactions', 'status': 'In Progress', 'xp': '+60 XP', 'done': false},
      {'title': '🤖 4. LangGraph Multi-Agent Swarm', 'status': 'Locked', 'xp': '+100 XP', 'done': false},
      {'title': '👹 5. Boss Encounter: Concurrency Dungeon', 'status': 'Locked', 'xp': '+500 XP', 'done': false},
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: nodes.length,
      itemBuilder: (context, index) {
        final node = nodes[index];
        final bool isDone = node['done'] as bool;
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDone ? const Color(0xFF10B981) : const Color(0xFF334155),
            ),
          ),
          child: Row(
            children: [
              Icon(
                isDone ? Icons.check_circle : Icons.lock_clock,
                color: isDone ? const Color(0xFF10B981) : const Color(0xFF64748B),
                size: 24,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      node['title'] as String,
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${node['status']} • Reward: ${node['xp']}',
                      style: TextStyle(color: isDone ? const Color(0xFF10B981) : const Color(0xFF94A3B8), fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- 3. Leaderboard Tab ---
  Widget _buildLeaderboardTab() {
    final competitors = [
      {'rank': '🥇 1', 'name': 'Maya Patel', 'xp': '8,420 XP', 'level': 'Lvl 6', 'streak': '18 🔥'},
      {'rank': '🥈 2', 'name': 'Alex Rivera (You)', 'xp': '$_totalXp XP', 'level': 'Lvl $_currentLevel', 'streak': '$_streakDays 🔥'},
      {'rank': '🥉 3', 'name': 'Chen Wei', 'xp': '4,650 XP', 'level': 'Lvl 4', 'streak': '9 🔥'},
      {'rank': '4', 'name': 'Elena Rostova', 'xp': '2,940 XP', 'level': 'Lvl 3', 'streak': '6 🔥'},
      {'rank': '5', 'name': 'Tariq Mansoor', 'xp': '2,810 XP', 'level': 'Lvl 3', 'streak': '5 🔥'},
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Weekly Leaderboard 🏆',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 4),
        const Text(
          'Rankings reset every Sunday at midnight UTC.',
          style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
        ),
        const SizedBox(height: 16),
        ...competitors.map((c) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: c['name']!.contains('You') ? const Color(0xFF6366F1).withOpacity(0.18) : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: c['name']!.contains('You') ? const Color(0xFF6366F1) : const Color(0xFF334155),
            ),
          ),
          child: Row(
            children: [
              Text(c['rank']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c['name']!, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                    Text('${c['level']} • ${c['streak']}', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                  ],
                ),
              ),
              Text(
                c['xp']!,
                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFF59E0B), fontSize: 14),
              ),
            ],
          ),
        )),
      ],
    );
  }

  // --- 4. AI Coach Tab ---
  Widget _buildAiCoachTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Personalized AI Study Coach 🤖',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 6),
        const Text(
          'Analyzes your quiz answers, pinpoints knowledge gaps, and constructs tailored 5-minute micro-challenges.',
          style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Coach Insight', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF818CF8))),
              const SizedBox(height: 8),
              const Text(
                '"You demonstrated strong understanding in Clean Architecture layers but made mistakes in composite index ordering. Try this 5-minute challenge to level up!"',
                style: TextStyle(fontStyle: FontStyle.italic, color: Colors.white, fontSize: 14),
              ),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                onPressed: () => _claimMissionXp(80),
                icon: const Icon(Icons.bolt, color: Colors.white),
                label: const Text('Start AI Practice Challenge (+80 XP)'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- 5. Profile Tab ---
  Widget _buildProfileTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Center(
          child: Column(
            children: [
              CircleAvatar(
                radius: 40,
                backgroundColor: const Color(0xFF6366F1),
                child: const Text('AR', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
              const SizedBox(height: 12),
              const Text('Alex Rivera', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
              const Text('Student ID: IT22104500 • Level 2 Apprentice', style: TextStyle(color: Color(0xFF94A3B8))),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text('Unlocked Badges 🏆', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _buildBadgeChip('🚀 First Step', 'Lesson Master', true),
            _buildBadgeChip('🎯 Quiz Ace', '100% Score', true),
            _buildBadgeChip('🔥 7-Day Streak', 'Unstoppable', false),
            _buildBadgeChip('👹 Boss Slayer', 'Dungeon Hero', false),
          ],
        ),
      ],
    );
  }

  Widget _buildBadgeChip(String title, String desc, bool unlocked) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: unlocked ? const Color(0xFF1E293B) : const Color(0xFF111827),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: unlocked ? const Color(0xFFF59E0B) : const Color(0xFF334155),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: unlocked ? Colors.white : Colors.grey)),
          Text(desc, style: TextStyle(fontSize: 11, color: unlocked ? const Color(0xFFF59E0B) : Colors.grey)),
        ],
      ),
    );
  }
}
