import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../services/student_portal_service.dart';
import 'portal_widgets.dart';

const _maxLen = 5000;

/// Opens the Help & Support sheet (web: HelpSupportDialog).
Future<void> showHelpSupportDialog(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: AppTheme.bgSurface,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
    builder: (_) => const FractionallySizedBox(
      heightFactor: 0.92,
      child: HelpSupportDialog(),
    ),
  );
}

class HelpSupportDialog extends StatefulWidget {
  const HelpSupportDialog({super.key});

  @override
  State<HelpSupportDialog> createState() => _HelpSupportDialogState();
}

class _HelpSupportDialogState extends State<HelpSupportDialog> {
  final _service = SupportService();
  final _message = TextEditingController();
  String _view = 'new';
  String _type = '';
  bool _submitting = false;
  String? _error;
  Map<String, dynamic>? _submitted;
  String? _initialTicketId;

  @override
  void initState() {
    super.initState();
    _message.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  bool get _dirty =>
      _submitted == null && (_type.isNotEmpty || _message.text.trim().isNotEmpty);

  Future<void> _close() async {
    if (_submitting) return;
    if (_dirty) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppTheme.bgCard,
          content: Text(
              'You have an unsaved support inquiry draft. Discard this draft and close?',
              style: TextStyle(color: AppTheme.textMain)),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel')),
            TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Discard',
                    style: TextStyle(color: AppTheme.error))),
          ],
        ),
      );
      if (ok != true) return;
    }
    if (mounted) Navigator.of(context).pop();
  }

  void _switchView(String v) => setState(() {
        _view = v;
        _submitted = null;
        if (v == 'new') _initialTicketId = null;
      });

  Future<void> _submit() async {
    final msg = _message.text.trim();
    String? err;
    if (_type.isEmpty) {
      err = 'Please select a ticket category (Bug, Dispute, or Feedback).';
    } else if (msg.isEmpty) {
      err = 'Please describe your issue or inquiry before submitting.';
    } else if (msg.length > _maxLen) {
      err = 'Message cannot exceed 5000 characters.';
    }
    if (err != null) {
      setState(() => _error = err);
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final res = await _service.createTicket(_type, msg);
      if (!mounted) return;
      setState(() {
        _submitted = res;
        _type = '';
        _message.clear();
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _close();
      },
      child: Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Column(
          children: [
            _header(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _tab('New Ticket', 'new', Icons.add_comment_outlined),
                  const SizedBox(width: 8),
                  _tab('Support History', 'history', Icons.history),
                ],
              ),
            ),
            Divider(color: AppTheme.borderSubtle, height: 20),
            Expanded(
              child: _view == 'history'
                  ? SupportHistory(
                      service: _service,
                      initialTicketId: _initialTicketId,
                      onNewTicket: () => _switchView('new'),
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                      child: _submitted != null ? _success() : _form(),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header() => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 8, 12),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: tint(AppTheme.primary, 0.14),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.support_outlined,
                  color: AppTheme.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Help & Support',
                      style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textMain)),
                  Text('Submit private inquiries to EduFlow AI support',
                      style:
                          TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                ],
              ),
            ),
            IconButton(
              onPressed: _submitting ? null : _close,
              icon: Icon(Icons.close, color: AppTheme.textMuted),
              tooltip: 'Close',
            ),
          ],
        ),
      );

  Widget _tab(String label, String value, IconData icon) {
    final active = _view == value;
    return Expanded(
      child: InkWell(
        onTap: () => _switchView(value),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? tint(AppTheme.primary, 0.14) : AppTheme.bgCard,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color: active
                    ? tint(AppTheme.primary, 0.5)
                    : AppTheme.borderSubtle),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 16,
                  color: active ? AppTheme.primary : AppTheme.textMuted),
              const SizedBox(width: 6),
              Text(label,
                  style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: active ? AppTheme.textMain : AppTheme.textMuted)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _form() {
    final len = _message.text.length;
    final canSubmit =
        !_submitting && _type.isNotEmpty && _message.text.trim().isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null) ...[
          ErrorBanner(message: _error!),
          const SizedBox(height: 12),
        ],
        const _Label('Ticket Category *'),
        DropdownButtonFormField<String>(
          initialValue: _type,
          isExpanded: true,
          dropdownColor: AppTheme.bgCard,
          decoration: _inputDecoration(),
          style: TextStyle(color: AppTheme.textMain, fontSize: 13),
          items: const [
            DropdownMenuItem(
                value: '', child: Text('Select ticket category...')),
            DropdownMenuItem(
                value: 'Bug',
                child: Text(
                    'Bug — Technical issue or error encountered on the platform',
                    overflow: TextOverflow.ellipsis)),
            DropdownMenuItem(
                value: 'Dispute',
                child: Text(
                    'Dispute — Contest an evaluation, quiz score, or enrollment decision',
                    overflow: TextOverflow.ellipsis)),
            DropdownMenuItem(
                value: 'Feedback',
                child: Text(
                    'Feedback — Suggestion, general question, or platform feedback',
                    overflow: TextOverflow.ellipsis)),
          ],
          onChanged: _submitting
              ? null
              : (v) => setState(() {
                    _type = v ?? '';
                    _error = null;
                  }),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            const Expanded(child: _Label('Message *')),
            Text('$len / $_maxLen characters',
                style: TextStyle(
                    fontSize: 11.5,
                    color: len >= 4800 ? AppTheme.accent : AppTheme.textMuted)),
          ],
        ),
        TextField(
          controller: _message,
          enabled: !_submitting,
          minLines: 6,
          maxLines: 10,
          inputFormatters: [LengthLimitingTextInputFormatter(_maxLen)],
          style: TextStyle(color: AppTheme.textMain, fontSize: 13),
          decoration: _inputDecoration(
              hint:
                  'Describe your inquiry or issue in detail. For bugs, include steps to reproduce; for disputes, include relevant assessment or course context...'),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: tint(AppTheme.warning, 0.08),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: tint(AppTheme.warning, 0.3)),
          ),
          child: Row(
            children: [
              Icon(Icons.shield_outlined, size: 16, color: AppTheme.warning),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                    'Privacy notice: Do not include passwords, API keys, or private tokens in inquiries.',
                    style: TextStyle(fontSize: 11.5, color: AppTheme.textMuted)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
                child: GhostButton(
                    label: 'Cancel', onPressed: _submitting ? null : _close)),
            const SizedBox(width: 10),
            Expanded(
              child: PrimaryButton(
                label: _submitting ? 'Submitting…' : 'Submit Ticket',
                icon: Icons.send,
                onPressed: canSubmit ? _submit : null,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _success() {
    final id = (_submitted?['id'] ?? '').toString();
    return PortalCard(
      padding: const EdgeInsets.all(24),
      borderColor: tint(AppTheme.success, 0.4),
      color: tint(AppTheme.success, 0.06),
      child: Column(
        children: [
          const Icon(Icons.check_circle_outline,
              size: 44, color: AppTheme.success),
          const SizedBox(height: 10),
          Text('Ticket Submitted Successfully',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textMain)),
          const SizedBox(height: 6),
          Text(
              'Your inquiry has been registered. You can track progress and administrator responses in your Support History.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: AppTheme.textMuted)),
          if (id.isNotEmpty) ...[
            const SizedBox(height: 10),
            SelectableText('Ticket ID: $id',
                style: const TextStyle(
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: AppTheme.secondary)),
          ],
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: [
              PrimaryButton(
                label: 'Open in Support History →',
                onPressed: () => setState(() {
                  _initialTicketId = id.isEmpty ? null : id;
                  _view = 'history';
                  _submitted = null;
                }),
              ),
              GhostButton(
                  label: 'Submit Another',
                  onPressed: () => setState(() => _submitted = null)),
            ],
          ),
        ],
      ),
    );
  }
}

/// Support History list with filters, pagination and ticket detail
/// (web: SupportHistory).
class SupportHistory extends StatefulWidget {
  final SupportService service;
  final String? initialTicketId;
  final VoidCallback onNewTicket;

  const SupportHistory(
      {super.key,
      required this.service,
      this.initialTicketId,
      required this.onNewTicket});

  @override
  State<SupportHistory> createState() => _SupportHistoryState();
}

class _SupportHistoryState extends State<SupportHistory> {
  static const _pageSize = 10;
  String _type = 'All';
  String _status = 'All';
  int _page = 1;
  int _totalPages = 1;
  int _totalCount = 0;
  List<dynamic> _items = const [];
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _detail;
  bool _detailLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
    final id = widget.initialTicketId;
    if (id != null && id.isNotEmpty) _openTicket(id);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.service.listTicketsPage(
          type: _type, status: _status, page: _page, pageSize: _pageSize);
      if (!mounted) return;
      setState(() {
        _items = data['items'] as List<dynamic>;
        _totalPages = toInt(data['totalPages'], 1).clamp(1, 1 << 30);
        _totalCount = toInt(data['totalCount'], _items.length);
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openTicket(String id) async {
    setState(() {
      _detailLoading = true;
      _error = null;
    });
    try {
      final t = await widget.service.getTicket(id);
      if (mounted) setState(() => _detail = t);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _detailLoading = false);
    }
  }

  bool get _filtered => _type != 'All' || _status != 'All';

  @override
  Widget build(BuildContext context) {
    if (_detailLoading) {
      return const Padding(
          padding: EdgeInsets.all(16),
          child: LoadingLine('Loading ticket details'));
    }
    if (_detail != null) {
      return SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        child: TicketDetail(
          ticket: _detail!,
          onBack: () {
            setState(() => _detail = null);
            _load();
          },
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        Row(
          children: [
            Expanded(
              child: _filter(
                value: _type,
                items: const {
                  'All': 'All Categories',
                  'Bug': 'Bug',
                  'Dispute': 'Dispute',
                  'Feedback': 'Feedback',
                },
                onChanged: (v) {
                  _type = v;
                  _page = 1;
                  _load();
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _filter(
                value: _status,
                items: const {
                  'All': 'All Statuses',
                  'Open': 'Open',
                  'InProgress': 'In Progress',
                  'Resolved': 'Resolved',
                },
                onChanged: (v) {
                  _status = v;
                  _page = 1;
                  _load();
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
                child: GhostButton(
                    label: 'Refresh',
                    icon: Icons.refresh,
                    onPressed: _loading ? null : _load)),
            const SizedBox(width: 8),
            Expanded(
                child: PrimaryButton(
                    label: 'New Ticket',
                    icon: Icons.add,
                    onPressed: widget.onNewTicket)),
          ],
        ),
        const SizedBox(height: 14),
        if (_error != null) ...[
          ErrorBanner(
              message: _error!,
              action: TextButton(onPressed: _load, child: const Text('Retry'))),
          const SizedBox(height: 12),
        ],
        if (_loading)
          const LoadingLine('Loading support history')
        else if (_items.isEmpty && _error == null)
          EmptyState(
            icon: Icons.inbox_outlined,
            title: _filtered
                ? 'No tickets match your filters'
                : 'No support tickets yet',
            message: _filtered
                ? 'Try changing or clearing your category and status filters.'
                : 'Have a question, encountered a bug, or need to dispute an evaluation? Submit a ticket to get private assistance from our support team.',
            action: _filtered
                ? null
                : PrimaryButton(
                    label: 'Submit a Ticket', onPressed: widget.onNewTicket),
          )
        else ...[
          for (final t in _items)
            if (t is Map) _ticketRow(Map<String, dynamic>.from(t)),
          if (_totalPages > 1) ...[
            const SizedBox(height: 8),
            Text('Page $_page of $_totalPages ($_totalCount total)',
                textAlign: TextAlign.center,
                style:
                    TextStyle(fontSize: 12, color: AppTheme.textMuted)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: GhostButton(
                    label: 'Previous',
                    icon: Icons.chevron_left,
                    onPressed: _page <= 1 || _loading
                        ? null
                        : () {
                            _page--;
                            _load();
                          },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GhostButton(
                    label: 'Next',
                    icon: Icons.chevron_right,
                    onPressed: _page >= _totalPages || _loading
                        ? null
                        : () {
                            _page++;
                            _load();
                          },
                  ),
                ),
              ],
            ),
          ],
        ],
      ],
    );
  }

  Widget _filter(
      {required String value,
      required Map<String, String> items,
      required ValueChanged<String> onChanged}) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      dropdownColor: AppTheme.bgCard,
      decoration: _inputDecoration(),
      style: TextStyle(color: AppTheme.textMain, fontSize: 12.5),
      items: [
        for (final e in items.entries)
          DropdownMenuItem(value: e.key, child: Text(e.value)),
      ],
      onChanged: _loading ? null : (v) => onChanged(v ?? 'All'),
    );
  }

  Widget _ticketRow(Map<String, dynamic> t) {
    final id = (t['id'] ?? '').toString();
    final shortId = id.length > 8 ? '${id.substring(0, 8)}…' : id;
    final responses = toInt(t['responseCount'],
        t['responses'] is List ? (t['responses'] as List).length : 0);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: PortalCard(
        padding: const EdgeInsets.all(14),
        onTap: id.isEmpty ? null : () => _openTicket(id),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(shortId,
                          style: TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: AppTheme.textMain)),
                      SupportTypeBadge(type: t['type']?.toString()),
                      SupportStatusBadge(status: t['status']?.toString()),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                      '${formatDate(t['createdAt'])} • $responses ${responses == 1 ? 'response' : 'responses'}',
                      style: TextStyle(
                          fontSize: 11.5, color: AppTheme.textMuted)),
                ],
              ),
            ),
            GhostButton(
                label: 'View',
                onPressed: id.isEmpty ? null : () => _openTicket(id)),
          ],
        ),
      ),
    );
  }
}

/// Ticket detail: meta, resolved banner, original inquiry and responses
/// (web: TicketDetail).
class TicketDetail extends StatefulWidget {
  final Map<String, dynamic> ticket;
  final VoidCallback? onBack;

  const TicketDetail({super.key, required this.ticket, this.onBack});

  @override
  State<TicketDetail> createState() => _TicketDetailState();
}

class _TicketDetailState extends State<TicketDetail> {
  bool _copied = false;

  Future<void> _copyId() async {
    final id = (widget.ticket['id'] ?? '').toString();
    if (id.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: id));
    if (!mounted) return;
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.ticket;
    final resolved = t['status'] == 'Resolved';
    final responses = t['responses'] is List ? t['responses'] as List : const [];
    final updated = t['updatedAt'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            if (widget.onBack != null)
              TextButton.icon(
                onPressed: widget.onBack,
                icon: const Icon(Icons.arrow_back, size: 16),
                label: const Text('Back to list'),
              ),
            const Spacer(),
            SupportTypeBadge(type: t['type']?.toString()),
            const SizedBox(width: 6),
            SupportStatusBadge(status: t['status']?.toString()),
          ],
        ),
        const SizedBox(height: 12),
        PortalCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text('Ticket ID',
                      style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textMuted)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text((t['id'] ?? '').toString(),
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 12,
                            color: AppTheme.textMain)),
                  ),
                  IconButton(
                    onPressed: _copyId,
                    tooltip: 'Copy Ticket UUID',
                    iconSize: 16,
                    icon: Icon(_copied ? Icons.check : Icons.copy,
                        color: _copied ? AppTheme.success : AppTheme.textMuted),
                  ),
                ],
              ),
              Row(
                children: [
                  Icon(Icons.schedule,
                      size: 13, color: AppTheme.textMuted),
                  const SizedBox(width: 4),
                  Text('Submitted: ${formatDateTime(t['createdAt'])}',
                      style: TextStyle(
                          fontSize: 12, color: AppTheme.textMuted)),
                ],
              ),
              if (updated != null && updated != t['createdAt']) ...[
                const SizedBox(height: 4),
                Text('Updated: ${formatDateTime(updated)}',
                    style: TextStyle(
                        fontSize: 12, color: AppTheme.textMuted)),
              ],
            ],
          ),
        ),
        if (resolved) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: tint(AppTheme.success, 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: tint(AppTheme.success, 0.35)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.check_circle_outline,
                    size: 18, color: AppTheme.success),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'This ticket was marked as resolved${t['resolvedAt'] != null ? ' on ${formatDateTime(t['resolvedAt'])}' : ''}. Resolved tickets remain permanently visible in your support history.',
                    style: TextStyle(
                        fontSize: 12.5, color: AppTheme.textMain),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),
        const _Heading('Original Inquiry'),
        const SizedBox(height: 8),
        PortalCard(
          color: AppTheme.bgMain,
          child: SelectableText((t['message'] ?? '').toString(),
              style: TextStyle(
                  fontSize: 13, color: AppTheme.textMain, height: 1.5)),
        ),
        const SizedBox(height: 16),
        _Heading('Response History (${responses.length})'),
        const SizedBox(height: 8),
        if (responses.isEmpty)
          const EmptyState(
            icon: Icons.chat_bubble_outline,
            title: 'No administrator response yet.',
            message:
                'Your inquiry has been logged and our support team will respond here once reviewed.',
          )
        else
          for (final r in responses)
            if (r is Map)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: PortalCard(
                  borderColor: tint(AppTheme.primary, 0.3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.shield_outlined,
                              size: 14, color: AppTheme.primary),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                                (r['authorLabel'] ?? 'Support team').toString(),
                                style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12.5,
                                    color: AppTheme.textMain)),
                          ),
                          Text(formatDateTime(r['createdAt']),
                              style: TextStyle(
                                  fontSize: 11.5, color: AppTheme.textMuted)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SelectableText((r['message'] ?? '').toString(),
                          style: TextStyle(
                              fontSize: 13,
                              color: AppTheme.textMain,
                              height: 1.5)),
                    ],
                  ),
                ),
              ),
      ],
    );
  }
}

class SupportStatusBadge extends StatelessWidget {
  final String? status;
  const SupportStatusBadge({super.key, this.status});

  @override
  Widget build(BuildContext context) {
    if (status == 'InProgress') {
      return const StatusPill(label: 'In Progress', color: AppTheme.primary);
    }
    if (status == 'Resolved') {
      return const StatusPill(label: 'Resolved', color: AppTheme.success);
    }
    return const StatusPill(label: 'Open', color: AppTheme.warning);
  }
}

class SupportTypeBadge extends StatelessWidget {
  final String? type;
  const SupportTypeBadge({super.key, this.type});

  @override
  Widget build(BuildContext context) {
    final color = switch (type) {
      'Bug' => AppTheme.error,
      'Dispute' => AppTheme.accent,
      'Feedback' => AppTheme.secondary,
      _ => AppTheme.textMuted,
    };
    return StatusPill(
        label: (type == null || type!.isEmpty) ? 'General' : type!,
        color: color);
  }
}

class ErrorBanner extends StatelessWidget {
  final String message;
  final Widget? action;
  const ErrorBanner({super.key, required this.message, this.action});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: tint(AppTheme.error, 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: tint(AppTheme.error, 0.35)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded,
              size: 18, color: AppTheme.error),
          const SizedBox(width: 8),
          Expanded(
              child: Text(message,
                  style: TextStyle(
                      fontSize: 12.5, color: AppTheme.textMain))),
          if (action != null) action!,
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text,
            style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: AppTheme.textMain)),
      );
}

class _Heading extends StatelessWidget {
  final String text;
  const _Heading(this.text);

  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(),
      style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: AppTheme.textMuted,
          letterSpacing: 0.5));
}

InputDecoration _inputDecoration({String? hint}) => InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: AppTheme.textSubtle, fontSize: 12.5),
      filled: true,
      fillColor: AppTheme.bgMain,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: AppTheme.borderSubtle),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: AppTheme.borderSubtle),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppTheme.primary),
      ),
    );
