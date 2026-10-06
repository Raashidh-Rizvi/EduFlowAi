import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../services/student_portal_service.dart';
import 'portal_widgets.dart';

const _prompts = [
  'What is searching and problem solving in this lecture?',
  'Explain PostgreSQL Composite Indexes',
  'How do ACID transactions work in EF Core?',
  'What is Clean Architecture domain isolation?',
];

/// AI Learning Assistant: lecture-scoped RAG chat plus the learning agent
/// (study plan / topic breakdown / explain). Mirrors the web CoachTab.
class CoachTab extends StatefulWidget {
  final String? studentId;
  final String courseId;

  const CoachTab({super.key, required this.studentId, required this.courseId});

  @override
  State<CoachTab> createState() => _CoachTabState();
}

class _CoachTabState extends State<CoachTab> {
  final _ai = AiAssistantService();
  final _sessionId = generateUuid();
  final _input = TextEditingController();
  final _inputFocus = FocusNode();
  final _scroll = ScrollController();

  final List<Map<String, dynamic>> _messages = [
    {
      'sender': 'ai',
      'text':
          'Hello. I am your AI Learning Assistant. I analyze curriculum progress and clarify technical concepts. What topic are you studying today?',
    },
  ];
  List<Map<String, dynamic>> _decks = [];
  String _selectedDeck = '';
  Map<String, dynamic>? _selectedTopic;
  bool _toolsExpanded = false;
  bool _showSuggestions = false;
  String _deckError = '';
  bool _loading = false;
  bool _showScrollBottom = false;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _loadDecks();
  }

  @override
  void dispose() {
    _input.dispose();
    _inputFocus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadDecks() async {
    setState(() => _deckError = '');
    try {
      final decks = await _ai.getSlideDecks();
      if (!mounted) return;
      setState(() {
        _decks = decks
            .whereType<Map>()
            .map((d) => Map<String, dynamic>.from(d))
            .toList();
        if (_decks.isEmpty) {
          _deckError =
              'No indexed lectures are available yet. Index a lecture to use the Learning Agent.';
        }
      });
    } catch (e) {
      if (mounted) setState(() => _deckError = e.toString());
    }
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    final nearBottom =
        _scroll.position.maxScrollExtent - _scroll.position.pixels < 120;
    if (nearBottom == _showScrollBottom) {
      setState(() => _showScrollBottom = !nearBottom);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(_scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    });
  }

  Map<String, dynamic>? get _activeDeck {
    for (final d in _decks) {
      if (d['source_file'] == _selectedDeck) return d;
    }
    return null;
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty || _loading) return;
    setState(() {
      _messages.add({'sender': 'user', 'text': text});
      _input.clear();
      _loading = true;
    });
    _scrollToBottom();
    try {
      final courseId = (_activeDeck?['course_id'] as String?) ?? widget.courseId;
      final res = await _ai.chat(
        studentId: widget.studentId,
        courseId: courseId,
        message: text,
        sourceFile: _selectedDeck.isEmpty ? null : _selectedDeck,
        sessionId: _sessionId,
      );
      if (!mounted) return;
      setState(() => _messages.add({
            'sender': 'ai',
            'text': res['reply'],
            'action': res['suggested_action'],
            'topic': res['identified_weak_topic'],
            'citations': res['citations'],
          }));
    } catch (e) {
      if (!mounted) return;
      final msg = e is PortalException
          ? e.message
          : 'The AI assistant is unavailable. Please retry.';
      setState(() => _messages.add({
            'sender': 'ai',
            'text': msg,
            'error': true,
            'retryText': text,
          }));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        _scrollToBottom();
        _inputFocus.requestFocus();
      }
    }
  }

  String _topicName(Map<String, dynamic>? t) =>
      (t?['topic'] ?? t?['title'] ?? '').toString();

  Future<void> _requestLearning(String type, [Map<String, dynamic>? topic]) async {
    if (_selectedDeck.isEmpty || _loading) return;
    final deck = _selectedDeck;
    final label = type == 'breakdown'
        ? 'Break Into Topics'
        : type == 'explain'
            ? 'Explain: ${_topicName(topic)}'
            : topic != null
                ? 'Study plan: ${_topicName(topic)}'
                : 'Complete Lecture Study Plan';
    setState(() {
      _loading = true;
      _messages.add({'sender': 'user', 'text': label, 'learningDeck': deck});
    });
    _scrollToBottom();
    try {
      final result = await _ai.learn(
        studentId: widget.studentId,
        sessionId: _sessionId,
        courseId: _activeDeck?['course_id'] as String?,
        sourceFile: deck,
        requestType: type,
        subLectureId: topic?['id']?.toString(),
        topic: topic?['topic'] as String?,
      );
      if (!mounted) return;
      final plan = result['plan'] is Map ? Map<String, dynamic>.from(result['plan']) : null;
      setState(() {
        if (type == 'breakdown') _selectedTopic = null;
        _messages.add({
          'sender': 'ai',
          'learningDeck': deck,
          'text': result['answer'] ??
              (plan != null
                  ? plan['title']
                  : 'Lecture topics — select a topic or subtopic to study.'),
          'subLectures': result['sub_lectures'],
          'plan': plan,
          'citations': result['citations'],
        });
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _messages.add({
            'sender': 'ai',
            'learningDeck': deck,
            'error': true,
            'text': e is PortalException
                ? e.message
                : 'The learning service is unavailable. Please retry.',
            'retryLearning': {'requestType': type, 'topic': topic},
          }));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
        _scrollToBottom();
      }
    }
  }

  // ───────────────────────── UI ─────────────────────────

  @override
  Widget build(BuildContext context) {
    final visible = _messages
        .where((m) => m['learningDeck'] == null || m['learningDeck'] == _selectedDeck)
        .toList();
    final firstRun = _messages.length <= 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _controlBar(),
        if (_deckError.isNotEmpty) _deckErrorBanner(),
        if (_selectedDeck.isNotEmpty && _toolsExpanded) _studyTools(),
        Expanded(
          child: Stack(
            children: [
              ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.symmetric(vertical: 12),
                itemCount: visible.length + (_loading ? 1 : 0),
                itemBuilder: (_, i) {
                  if (i == visible.length) return _thinking();
                  return _bubble(visible[i]);
                },
              ),
              if (_showScrollBottom)
                Positioned(
                  bottom: 8,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: ActionChip(
                      onPressed: _scrollToBottom,
                      avatar: const Icon(Icons.keyboard_arrow_down,
                          size: 14, color: AppTheme.primary),
                      label: Text('Latest answer',
                          style: TextStyle(fontSize: 12, color: AppTheme.textMain)),
                      backgroundColor: AppTheme.bgSurface,
                      side: BorderSide(color: AppTheme.borderSubtle),
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (firstRun || _showSuggestions) _suggestions(),
        _inputDock(firstRun),
      ],
    );
  }

  Widget _controlBar() {
    final hasDeck = _selectedDeck.isNotEmpty;
    return PortalCard(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.smart_toy_outlined, size: 16, color: AppTheme.primary),
              const SizedBox(width: 6),
              Text('AI Assistant',
                  style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5,
                      color: AppTheme.textMain)),
              const Spacer(),
              StatusPill(
                label: hasDeck ? '🎯 Strict Focus' : '🌐 Global',
                color: hasDeck ? AppTheme.primary : AppTheme.success,
              ),
              if (hasDeck) ...[
                const SizedBox(width: 6),
                InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => setState(() => _toolsExpanded = !_toolsExpanded),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _toolsExpanded ? tint(AppTheme.primary, 0.12) : AppTheme.bgMain,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: _toolsExpanded
                              ? tint(AppTheme.primary, 0.4)
                              : AppTheme.borderSubtle),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Study Tools',
                            style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: _toolsExpanded
                                    ? AppTheme.primary
                                    : AppTheme.textMuted)),
                        Icon(
                            _toolsExpanded
                                ? Icons.keyboard_arrow_up
                                : Icons.keyboard_arrow_down,
                            size: 14,
                            color: _toolsExpanded ? AppTheme.primary : AppTheme.textMuted),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text('Focus:',
                  style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textMuted)),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedDeck,
                    isExpanded: true,
                    isDense: true,
                    dropdownColor: AppTheme.bgCard,
                    style: TextStyle(fontSize: 12, color: AppTheme.textMain),
                    onChanged: _loading
                        ? null
                        : (v) => setState(() {
                              _selectedDeck = v ?? '';
                              _selectedTopic = null;
                            }),
                    items: [
                      const DropdownMenuItem(
                        value: '',
                        child: Text('🌐 All Enrolled Lectures (Global Course Scope)',
                            overflow: TextOverflow.ellipsis),
                      ),
                      for (final d in _decks)
                        DropdownMenuItem(
                          value: (d['source_file'] ?? '').toString(),
                          child: Text(
                              '📑 ${d['display_title'] ?? d['source_file']} (${d['total_chunks'] ?? 0} slides)',
                              overflow: TextOverflow.ellipsis),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _deckErrorBanner() => Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: tint(AppTheme.error, 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: tint(AppTheme.error, 0.3)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(_deckError,
                  style: const TextStyle(fontSize: 12, color: AppTheme.error)),
            ),
            TextButton(
              onPressed: _loadDecks,
              child: const Text('Retry loading lectures', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      );

  Widget _studyTools() {
    final title = (_activeDeck?['display_title'] ?? 'Active Deck').toString();
    final t = _selectedTopic;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: tint(AppTheme.primary, 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('⚡ Lecture Tools: $title',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textMain)),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: () => setState(() => _toolsExpanded = false),
                icon: Icon(Icons.close, size: 14, color: AppTheme.textMuted),
              ),
            ],
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              GhostButton(
                label: '📅 Complete Study Plan',
                onPressed: _loading
                    ? null
                    : () {
                        _requestLearning('plan');
                        setState(() => _toolsExpanded = false);
                      },
              ),
              GhostButton(
                label: '📑 Break Into Topics',
                onPressed: _loading
                    ? null
                    : () {
                        _requestLearning('breakdown');
                        setState(() => _toolsExpanded = false);
                      },
              ),
            ],
          ),
          if (t != null) ...[
            const SizedBox(height: 10),
            Text('Selected Topic: ${_topicName(t)}',
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textMain)),
            Text('Slides ${t['page_start']}–${t['page_end']}',
                style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                GhostButton(
                  label: 'Study This Topic',
                  onPressed: _loading
                      ? null
                      : () {
                          _requestLearning('plan', t);
                          setState(() => _toolsExpanded = false);
                        },
                ),
                GhostButton(
                  label: 'Explain This Topic',
                  onPressed: _loading
                      ? null
                      : () {
                          _requestLearning('explain', t);
                          setState(() => _toolsExpanded = false);
                        },
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _thinking() => Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary)),
            SizedBox(width: 10),
            Text('Reading your lecture and synthesizing answer…',
                style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
          ],
        ),
      );

  Widget _bubble(Map<String, dynamic> msg) {
    final isUser = msg['sender'] == 'user';
    if (isUser) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 10, left: 48),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: const BoxDecoration(
            color: AppTheme.primary,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(16),
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(4),
            ),
          ),
          child: Text((msg['text'] ?? '').toString(),
              style: TextStyle(color: AppTheme.textMain, fontSize: 13.5)),
        ),
      );
    }

    final citations = (msg['citations'] is List)
        ? (msg['citations'] as List).whereType<Map>().toList()
        : const <Map>[];
    final subLectures = (msg['subLectures'] is List)
        ? (msg['subLectures'] as List).whereType<Map>().toList()
        : const <Map>[];
    final plan = msg['plan'] as Map<String, dynamic>?;
    final action = msg['action']?.toString();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: msg['error'] == true ? tint(AppTheme.error, 0.4) : AppTheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ...FormattedMessage.build(context, (msg['text'] ?? '').toString()),
          if (msg['error'] == true)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: GhostButton(
                label: 'Retry',
                icon: Icons.refresh,
                onPressed: _loading
                    ? null
                    : () {
                        final rl = msg['retryLearning'] as Map?;
                        if (rl != null) {
                          _requestLearning(rl['requestType'] as String,
                              rl['topic'] as Map<String, dynamic>?);
                        } else {
                          _sendMessage((msg['retryText'] ?? '').toString());
                        }
                      },
              ),
            ),
          for (final s in subLectures) _subLecture(Map<String, dynamic>.from(s)),
          if (plan != null) _plan(plan),
          if (citations.isNotEmpty) _citations(citations),
          if (action != null && action.isNotEmpty) _suggestedAction(action),
        ],
      ),
    );
  }

  Widget _subLecture(Map<String, dynamic> section) {
    final topics = (section['topics'] is List) ? section['topics'] as List : const [];
    final sectionSelected =
        _selectedTopic?['id'] == section['id'] && _selectedTopic?['topic'] == null;
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        initiallyExpanded: true,
        tilePadding: EdgeInsets.zero,
        childrenPadding: const EdgeInsets.only(left: 8),
        title: Text(
            '${section['title']} · Slides ${section['page_start']}–${section['page_end']}',
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textMain)),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: _loading ? null : () => setState(() => _selectedTopic = section),
              child: Text(sectionSelected ? '✓ Topic Selected' : 'Select Topic',
                  style: const TextStyle(fontSize: 12, color: AppTheme.primary)),
            ),
          ),
          for (final topic in topics)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: _loading
                    ? null
                    : () => setState(
                        () => _selectedTopic = {...section, 'topic': topic.toString()}),
                child: Text(
                  '• $topic',
                  style: TextStyle(
                    fontSize: 12,
                    color: _selectedTopic?['id'] == section['id'] &&
                            _selectedTopic?['topic'] == topic
                        ? AppTheme.primary
                        : AppTheme.textMain,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _plan(Map<String, dynamic> plan) {
    final sessions = (plan['sessions'] is List) ? plan['sessions'] as List : const [];
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final s in sessions.whereType<Map>())
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(TextSpan(children: [
                    TextSpan(
                        text: 'Session ${s['session_number']}: ${s['title']}',
                        style: TextStyle(
                            fontWeight: FontWeight.w700, color: AppTheme.textMain)),
                    TextSpan(
                        text: ' · ${s['estimated_minutes']} minutes',
                        style: TextStyle(color: AppTheme.textMuted)),
                  ]), style: const TextStyle(fontSize: 13)),
                  for (final task in (s['tasks'] is List ? s['tasks'] as List : const []))
                    Padding(
                      padding: const EdgeInsets.only(left: 12, top: 3),
                      child: Text('• $task',
                          style: TextStyle(fontSize: 12.5, color: AppTheme.textMain)),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _citations(List<Map> citations) {
    final web = citations.any((c) =>
        c['page_number'] == 0 || (c['source_file']?.toString().startsWith('http') ?? false));
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.only(top: 10),
      decoration: BoxDecoration(
          border: Border(top: BorderSide(color: AppTheme.borderSubtle))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
              web
                  ? '🌐 Verified External Web Sources & Citations:'
                  : '📑 Verifiable Slide Citations & Exploration:',
              style: TextStyle(
                  fontSize: 11.5, fontWeight: FontWeight.w700, color: AppTheme.textMuted)),
          const SizedBox(height: 6),
          for (final c in citations) _citation(c),
        ],
      ),
    );
  }

  Widget _citation(Map c) {
    final src = (c['source_file'] ?? '').toString();
    final isWeb = src.startsWith('http');
    final page = toInt(c['page_number']);
    final pct = (toDouble(c['relevance_score']) * 100).round();
    final color = isWeb ? AppTheme.success : AppTheme.primary;
    final label = page > 0
        ? 'Slide $page ($pct% match)'
        : '🌐 ${(c['preview_text'] ?? 'Web Source')} ($pct% match)';
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Wrap(
        spacing: 8,
        runSpacing: 4,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Tooltip(
            message: (c['preview_text'] ?? '').toString(),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: tint(color, 0.12),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: tint(color, 0.3)),
              ),
              child: Text(label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
            ),
          ),
          if (isWeb)
            TextButton(
              onPressed: () => _copyLink(src),
              child: const Text('🔗 Open Source ↗', style: TextStyle(fontSize: 11.5)),
            )
          else
            TextButton(
              onPressed: _loading || (_selectedDeck.isNotEmpty && src != _selectedDeck)
                  ? null
                  : () => _sendMessage(
                      'Can you explain Slide $page in simple terms with a real-world example?'),
              child: Text('🔍 Deep Dive Slide $page', style: const TextStyle(fontSize: 11.5)),
            ),
        ],
      ),
    );
  }

  Widget _suggestedAction(String action) {
    final text = action.replaceAll('Review Slide 0', 'Explore external reference');
    final url = RegExp(r'https?://[^\s)]+').firstMatch(action)?.group(0);
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: tint(AppTheme.secondary, 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.auto_awesome, size: 12, color: AppTheme.secondary),
          const SizedBox(width: 6),
          Expanded(
            child: GestureDetector(
              onTap: url == null ? null : () => _copyLink(url),
              child: Text('Suggested Action: $text${url != null ? ' ↗' : ''}',
                  style: TextStyle(
                      fontSize: 12,
                      color: url != null ? AppTheme.primary : AppTheme.textMain)),
            ),
          ),
        ],
      ),
    );
  }

  void _copyLink(String url) {
    Clipboard.setData(ClipboardData(text: url));
    showPortalMessage(context, 'Link copied to clipboard: $url');
  }

  Widget _suggestions() => SizedBox(
        height: 40,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(vertical: 4),
          itemCount: _prompts.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) => ActionChip(
            onPressed: _loading
                ? null
                : () {
                    _sendMessage(_prompts[i]);
                    setState(() => _showSuggestions = false);
                  },
            label: Text(_prompts[i],
                style: TextStyle(fontSize: 11.5, color: AppTheme.textMain)),
            backgroundColor: AppTheme.bgSurface,
            side: BorderSide(color: AppTheme.borderSubtle),
          ),
        ),
      );

  Widget _inputDock(bool firstRun) {
    final canSend = _input.text.trim().isNotEmpty && !_loading;
    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.fromLTRB(6, 4, 6, 4),
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: Row(
        children: [
          if (!firstRun)
            IconButton(
              tooltip: 'Toggle question suggestion ideas',
              onPressed: () => setState(() => _showSuggestions = !_showSuggestions),
              icon: Text('💡',
                  style: TextStyle(
                      fontSize: 16,
                      color: _showSuggestions ? AppTheme.primary : AppTheme.textMuted)),
            ),
          Expanded(
            child: TextField(
              controller: _input,
              focusNode: _inputFocus,
              enabled: !_loading,
              onChanged: (_) => setState(() {}),
              onSubmitted: _sendMessage,
              textInputAction: TextInputAction.send,
              style: TextStyle(fontSize: 13.5, color: AppTheme.textMain),
              decoration: InputDecoration(
                border: InputBorder.none,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                hintStyle: TextStyle(color: AppTheme.textSubtle, fontSize: 13),
                hintText: _loading
                    ? 'AI Assistant is thinking...'
                    : _selectedDeck.isNotEmpty
                        ? 'Ask a question about this lecture...'
                        : 'Ask anything about your curriculum...',
              ),
            ),
          ),
          IconButton(
            tooltip: 'Send message',
            onPressed: canSend ? () => _sendMessage(_input.text) : null,
            style: IconButton.styleFrom(
              backgroundColor: canSend ? AppTheme.primary : tint(AppTheme.textMuted, 0.12),
            ),
            icon: Icon(Icons.send,
                size: 16, color: canSend ? Colors.white : AppTheme.textMuted),
          ),
        ],
      ),
    );
  }
}

/// ChatGPT-style formatter matching the web renderFormattedMessage:
/// fenced code → copy cards, headers, bullets, **bold**, *italic*, `code`, links.
class FormattedMessage {
  static final _tokenRe = RegExp(
      r'(\[[^\]]+\]\([^)]+\)|https?://[^\s)]+|`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)');
  static final _logicRe =
      RegExp(r'^(?:[A-Za-z0-9_()]+\s*(?:->|→|=>|∧|∨|¬|⊢)\s*[A-Za-z0-9_()]+)$');
  static final _sectionRe = RegExp(
      r'^(Simple Definition|Real[‑-]World Example|Key Breakdown|Key Takeaway|Verified Web Sources)[\s–\-:]*$',
      caseSensitive: false);

  static List<Widget> build(BuildContext context, String text) {
    final clean = text.replaceAll(RegExp(r'【[^】]*】'), '').trim();
    final out = <Widget>[];
    final segments = <String>[];
    final fence = RegExp(r'```[\s\S]*?```');
    var last = 0;
    for (final m in fence.allMatches(clean)) {
      if (m.start > last) segments.add(clean.substring(last, m.start));
      segments.add(m.group(0)!);
      last = m.end;
    }
    if (last < clean.length) segments.add(clean.substring(last));

    for (final seg in segments) {
      if (seg.startsWith('```') && seg.endsWith('```') && seg.length >= 6) {
        final code = seg
            .substring(3, seg.length - 3)
            .replaceFirst(RegExp(r'^[a-zA-Z0-9_-]*\n'), '')
            .trim();
        out.add(CodeSnippetCard(code: code));
        continue;
      }
      for (final line in seg.split('\n')) {
        final t = line.trim();
        if (t.isEmpty) {
          out.add(const SizedBox(height: 6));
          continue;
        }
        if (t.startsWith('🌐')) {
          out.add(Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: tint(AppTheme.success, 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: tint(AppTheme.success, 0.25)),
            ),
            child: Text(t, style: const TextStyle(fontSize: 12, color: AppTheme.success)),
          ));
          continue;
        }
        if (_logicRe.hasMatch(t) && t.length < 50) {
          out.add(CodeSnippetCard(code: t));
          continue;
        }
        final isMd = RegExp(r'^#{1,6}\s+').hasMatch(t);
        final isNum = RegExp(r'^\d+\.\s+[^:]+[:?]?$').hasMatch(t);
        if (isMd || isNum || _sectionRe.hasMatch(t)) {
          final title = t
              .replaceFirst(RegExp(r'^#{1,6}\s+'), '')
              .replaceFirst(RegExp(r'^[–\-]\s*'), '')
              .replaceFirst(RegExp(r'[\s–\-:]+$'), '');
          out.add(Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 4),
            child: Text(title,
                style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textMain)),
          ));
          continue;
        }
        final isBullet = RegExp(r'^[•\-*]\s+').hasMatch(t);
        final content = isBullet ? t.replaceFirst(RegExp(r'^[•\-*]\s+'), '') : line;
        final rich = Text.rich(TextSpan(children: _inline(context, content)),
            style: TextStyle(fontSize: 13.5, color: AppTheme.textMain, height: 1.55));
        out.add(isBullet
            ? Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 2),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('•  ',
                        style: TextStyle(
                            color: AppTheme.primary, fontWeight: FontWeight.bold, height: 1.55)),
                    Expanded(child: rich),
                  ],
                ),
              )
            : rich);
      }
    }
    return out;
  }

  static List<InlineSpan> _inline(BuildContext context, String s) {
    final spans = <InlineSpan>[];
    var last = 0;
    for (final m in _tokenRe.allMatches(s)) {
      if (m.start > last) {
        spans.add(TextSpan(text: s.substring(last, m.start).replaceAll('*', '')));
      }
      spans.add(_token(context, m.group(0)!));
      last = m.end;
    }
    if (last < s.length) spans.add(TextSpan(text: s.substring(last).replaceAll('*', '')));
    return spans;
  }

  static InlineSpan _token(BuildContext context, String tok) {
    final link = RegExp(r'^\[([^\]]+)\]\(([^)]+)\)$').firstMatch(tok);
    if (link != null) return _link(context, '${link.group(1)} ↗', link.group(2)!);
    if (tok.startsWith('http')) return _link(context, '$tok ↗', tok);
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length >= 2) {
      return TextSpan(
        text: tok.substring(1, tok.length - 1),
        style: TextStyle(
          fontFamily: 'monospace',
          fontSize: 12.5,
          color: AppTheme.primaryGlow,
          backgroundColor: tint(AppTheme.primary, 0.1),
        ),
      );
    }
    if (tok.startsWith('***') && tok.endsWith('***') && tok.length >= 6) {
      return TextSpan(
          text: tok.substring(3, tok.length - 3),
          style: const TextStyle(fontWeight: FontWeight.w700, fontStyle: FontStyle.italic));
    }
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length >= 4) {
      return TextSpan(
          text: tok.substring(2, tok.length - 2),
          style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.textMain));
    }
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length >= 2) {
      return TextSpan(
          text: tok.substring(1, tok.length - 1),
          style: const TextStyle(fontStyle: FontStyle.italic, color: AppTheme.secondary));
    }
    return TextSpan(text: tok.replaceAll('*', ''));
  }

  static InlineSpan _link(BuildContext context, String label, String url) => WidgetSpan(
        alignment: PlaceholderAlignment.baseline,
        baseline: TextBaseline.alphabetic,
        child: GestureDetector(
          onTap: () {
            Clipboard.setData(ClipboardData(text: url));
            showPortalMessage(context, 'Link copied to clipboard: $url');
          },
          child: Text(label,
              style: const TextStyle(
                  fontSize: 13.5,
                  color: AppTheme.primary,
                  decoration: TextDecoration.underline)),
        ),
      );
}
