import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../services/student_portal_service.dart';
import 'portal_widgets.dart';

/// Ratings summary, own review form and review list (web: CourseReviews).
class CourseReviews extends StatefulWidget {
  final String courseId;
  final VoidCallback? onChanged;

  const CourseReviews({super.key, required this.courseId, this.onChanged});

  @override
  State<CourseReviews> createState() => _CourseReviewsState();
}

class _CourseReviewsState extends State<CourseReviews> {
  final _service = StudentCourseService();
  final _comment = TextEditingController();

  List<Map<String, dynamic>> _reviews = [];
  Map<String, dynamic>? _mine;
  bool _loading = true;
  String _loadError = '';
  int _rating = 5;
  bool _editing = false;
  bool _saving = false;
  bool _removing = false;
  String? _notice;
  bool _noticeError = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = '';
    });
    try {
      final list = await _service.listReviews(widget.courseId);
      Map<String, dynamic>? mine;
      try {
        final own = await _service.getMyReview(widget.courseId);
        if (own['hasReview'] == true && own['review'] is Map) {
          mine = Map<String, dynamic>.from(own['review'] as Map);
        }
      } catch (_) {
        mine = null;
      }
      if (!mounted) return;
      setState(() {
        _reviews = list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        _mine = mine;
        if (mine != null && !_editing) {
          _rating = toInt(mine['rating'], 5);
          _comment.text = mine['comment']?.toString() ?? '';
        }
      });
    } catch (_) {
      if (mounted) setState(() => _loadError = 'Could not load reviews.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _errorText(Object e) {
    if (e is DioException && e.response?.statusCode == 403) {
      final d = e.response?.data;
      if (d is Map && d['message'] is String) return d['message'] as String;
      return 'Only students actively enrolled in this course can leave a review.';
    }
    return 'We could not save your review.';
  }

  Future<void> _submit() async {
    if (_saving || _rating < 1) return;
    setState(() {
      _saving = true;
      _notice = null;
    });
    try {
      final result =
          await _service.submitReview(widget.courseId, _rating, _comment.text);
      final saved = result['review'] is Map
          ? Map<String, dynamic>.from(result['review'] as Map)
          : null;
      if (!mounted) return;
      setState(() {
        _mine = saved;
        _editing = false;
        _rating = toInt(saved?['rating'], 5);
        _comment.text = saved?['comment']?.toString() ?? '';
        _noticeError = false;
        _notice = saved?['status'] == 'Pending'
            ? 'Thanks — your review was submitted and is awaiting moderation.'
            : 'Thanks — your rating is now live.';
      });
      await _load();
      widget.onChanged?.call();
    } catch (e) {
      if (mounted) {
        setState(() {
          _noticeError = true;
          _notice = _errorText(e);
        });
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final mine = _mine;
    if (mine == null || _removing) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.bgSurface,
        content: const Text('Delete your review for this course? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() {
      _removing = true;
      _notice = null;
    });
    try {
      await _service.deleteReview(widget.courseId, mine['id'].toString());
      if (!mounted) return;
      setState(() {
        _mine = null;
        _rating = 5;
        _comment.text = '';
        _editing = false;
        _noticeError = false;
        _notice = 'Your review was deleted.';
      });
      await _load();
      widget.onChanged?.call();
    } catch (e) {
      if (mounted) {
        setState(() {
          _noticeError = true;
          _notice = _errorText(e);
        });
      }
    } finally {
      if (mounted) setState(() => _removing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final count = _reviews.length;
    final average = count > 0
        ? _reviews.fold<double>(0, (s, r) => s + toDouble(r['rating'])) / count
        : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PortalCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('RATINGS & REVIEWS',
                  style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: AppTheme.textMuted)),
              const SizedBox(height: 10),
              if (_loading)
                Text('Loading reviews…', style: TextStyle(color: AppTheme.textMuted))
              else if (_loadError.isNotEmpty)
                Text(_loadError, style: const TextStyle(color: AppTheme.error))
              else
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(count > 0 ? average.toStringAsFixed(1) : '–',
                            style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textMain)),
                        StarRating(average: average, count: count, size: 15),
                        const SizedBox(height: 4),
                        Text('$count review${count == 1 ? '' : 's'}',
                            style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                      ],
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        children: [
                          for (final star in [5, 4, 3, 2, 1])
                            _distributionRow(
                                star,
                                _reviews.where((r) => toInt(r['rating']) == star).length,
                                count),
                        ],
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _form(),
        const SizedBox(height: 16),
        if (!_loading && _loadError.isEmpty && _reviews.isEmpty)
          PortalCard(
            child: Column(
              children: [
                Icon(Icons.rate_review_outlined, color: AppTheme.textMuted, size: 20),
                SizedBox(height: 6),
                Text('No reviews yet — be the first enrolled student to rate this course.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12.5, color: AppTheme.textMuted)),
              ],
            ),
          ),
        for (final r in _reviews)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _reviewItem(r),
          ),
      ],
    );
  }

  Widget _distributionRow(int star, int n, int total) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
              width: 22,
              child: Text('$star★',
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted))),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: total > 0 ? n / total : 0,
                minHeight: 6,
                backgroundColor: AppTheme.bgSurface,
                color: AppTheme.warning,
              ),
            ),
          ),
          SizedBox(
              width: 24,
              child: Text('$n',
                  textAlign: TextAlign.right,
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted))),
        ],
      ),
    );
  }

  Widget _form() {
    final mine = _mine;
    return PortalCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(mine != null ? 'Your review' : 'Rate this course',
              style: TextStyle(
                  fontSize: 13.5, fontWeight: FontWeight.w800, color: AppTheme.textMain)),
          const SizedBox(height: 4),
          Text(
            mine != null
                ? 'You can update your rating at any time — only your latest review counts.'
                : 'Only students with a verified (active or completed) enrollment can leave a review.',
            style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
          ),
          if (_notice != null) ...[
            const SizedBox(height: 10),
            StatusPill(
                label: _notice!,
                color: _noticeError ? AppTheme.error : AppTheme.success),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              for (var i = 1; i <= 5; i++)
                GestureDetector(
                  onTap: _saving ? null : () => setState(() => _rating = i),
                  child: Padding(
                    padding: const EdgeInsets.only(right: 4),
                    child: Icon(
                      i <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: AppTheme.warning,
                      size: 28,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text.rich(TextSpan(children: [
            TextSpan(
                text: 'Written review ',
                style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textMain)),
            TextSpan(text: '(optional)', style: TextStyle(color: AppTheme.textSubtle)),
          ]), style: TextStyle(fontSize: 12.5)),
          const SizedBox(height: 6),
          TextField(
            controller: _comment,
            enabled: !_saving,
            maxLines: 3,
            maxLength: 2000,
            decoration: const InputDecoration(
              hintText: 'What did you think of this course?',
              isDense: true,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 8,
            children: [
              PrimaryButton(
                label: _saving
                    ? 'Saving…'
                    : mine != null
                        ? 'Update review'
                        : 'Submit review',
                onPressed: (_saving || _rating < 1) ? null : _submit,
              ),
              if (mine != null)
                GhostButton(
                  label: _removing ? 'Deleting…' : 'Delete',
                  icon: Icons.delete_outline,
                  color: AppTheme.error,
                  onPressed: (_removing || _saving) ? null : _delete,
                ),
              if (mine != null && _editing)
                GhostButton(
                  label: 'Cancel',
                  onPressed: _saving
                      ? null
                      : () => setState(() {
                            _editing = false;
                            _rating = toInt(mine['rating'], 5);
                            _comment.text = mine['comment']?.toString() ?? '';
                          }),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _reviewItem(Map<String, dynamic> r) {
    final name = (r['studentName']?.toString().isNotEmpty ?? false)
        ? r['studentName'].toString()
        : 'Student';
    final isMine = _mine != null && r['id']?.toString() == _mine!['id']?.toString();
    final comment = r['comment']?.toString() ?? '';
    return PortalCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: tint(AppTheme.primary, 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: tint(AppTheme.primary, 0.4)),
                ),
                child: Text(name[0].toUpperCase(),
                    style: TextStyle(
                        fontWeight: FontWeight.w800, color: AppTheme.primaryGlow)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(name,
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textMain)),
                        if (isMine)
                          const StatusPill(label: 'Your review', color: AppTheme.secondary),
                      ],
                    ),
                    Text(formatDate(r['createdAt']),
                        style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                  ],
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (var i = 1; i <= 5; i++)
                    Icon(
                      i <= toInt(r['rating']) ? Icons.star_rounded : Icons.star_outline_rounded,
                      size: 13,
                      color: AppTheme.warning,
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            comment.isNotEmpty ? comment : 'No written comment was left with this rating.',
            style: TextStyle(
              fontSize: 12.5,
              height: 1.6,
              color: comment.isNotEmpty ? AppTheme.textMain : AppTheme.textSubtle,
              fontStyle: comment.isNotEmpty ? FontStyle.normal : FontStyle.italic,
            ),
          ),
          if (isMine && !_editing) ...[
            const SizedBox(height: 8),
            GhostButton(
              label: 'Edit your review',
              icon: Icons.edit_outlined,
              onPressed: () => setState(() {
                _editing = true;
                _rating = toInt(_mine!['rating'], 5);
                _comment.text = _mine!['comment']?.toString() ?? '';
              }),
            ),
          ],
        ],
      ),
    );
  }
}
