import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class AiCoachScreen extends StatefulWidget {
  const AiCoachScreen({Key? key}) : super(key: key);

  @override
  State<AiCoachScreen> createState() => _AiCoachScreenState();
}

class _AiCoachScreenState extends State<AiCoachScreen> {
  final TextEditingController _msgController = TextEditingController();
  final List<Map<String, String>> _messages = [
    {
      'sender': 'ai',
      'text': 'Hello! I am your EduFlow AI Learning Coach 🤖. I analyze your quiz attempts to formulate the most optimal learning quests. What concept would you like to review today?'
    },
  ];

  final List<String> _quickPrompts = [
    'Explain PostgreSQL Composite Indexes 🧩',
    'How do ACID boundaries work in EF Core? ⚡',
    'Generate a 5-min practice challenge for me 🎯',
  ];

  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;

    setState(() {
      _messages.add({'sender': 'user', 'text': text});
    });
    _msgController.clear();

    Future.delayed(const Duration(milliseconds: 700), () {
      String reply = "Great question! Let's break this down:";
      if (text.toLowerCase().contains('index')) {
        reply = "In PostgreSQL, a composite index (col1, col2) only optimizes queries when col1 is present in the WHERE clause. Always order index columns from highest to lowest selectivity!";
      } else if (text.toLowerCase().contains('acid') || text.toLowerCase().contains('ef')) {
        reply = "In EF Core, DbContext.SaveChangesAsync() runs within an atomic transaction. If any entity constraint fails, all modifications roll back safely.";
      } else if (text.toLowerCase().contains('challenge') || text.toLowerCase().contains('practice')) {
        reply = "I've calibrated a 5-minute practice quest targeting PostgreSQL concurrency. It's ready in your Journey tab with +80 XP bonus!";
      } else {
        reply = "I recommend checking out Module 1.2 on Deterministic Ledgers. It directly addresses this pattern!";
      }

      setState(() {
        _messages.add({'sender': 'ai', 'text': reply});
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgMain,
      appBar: AppBar(
        backgroundColor: AppTheme.bgSurface,
        title: const Row(
          children: [
            Text('🤖', style: TextStyle(fontSize: 20)),
            SizedBox(width: 8),
            Text('AI Learning Coach'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Messages List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isAi = msg['sender'] == 'ai';

                return Align(
                  alignment: isAi ? Alignment.centerLeft : Alignment.centerRight,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    decoration: BoxDecoration(
                      color: isAi ? AppTheme.bgSurface : AppTheme.primary,
                      borderRadius: BorderRadius.circular(16),
                      border: isAi ? Border.all(color: AppTheme.borderSubtle) : null,
                    ),
                    child: Text(
                      msg['text']!,
                      style: TextStyle(color: AppTheme.textMain, fontSize: 13, height: 1.4),
                    ),
                  ),
                );
              },
            ),
          ),

          // Quick Prompt Pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              children: _quickPrompts.map((prompt) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    backgroundColor: AppTheme.bgSurface,
                    side: BorderSide(color: AppTheme.borderSubtle),
                    label: Text(prompt, style: const TextStyle(fontSize: 11, color: AppTheme.secondary)),
                    onPressed: () => _sendMessage(prompt),
                  ),
                );
              }).toList(),
            ),
          ),

          // Input Bar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.bgSurface,
              border: Border(top: BorderSide(color: AppTheme.borderSubtle)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgController,
                    style: TextStyle(color: AppTheme.textMain, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Ask your AI Coach anything...',
                      hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      filled: true,
                      fillColor: AppTheme.bgCard,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send_rounded, color: AppTheme.secondary),
                  onPressed: () => _sendMessage(_msgController.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
