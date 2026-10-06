import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../services/student_portal_service.dart';

/// Shared building blocks for the student portal (mirrors StudentPortal.jsx).

Color tint(Color c, double alpha) => c.withValues(alpha: alpha);

void showPortalMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// Statuses that unlock course materials (web: canOpenCourseMaterials).
bool canOpenCourseMaterials(String? status) {
  final s = (status == null || status.isEmpty ? 'Active' : status).toUpperCase();
  return const ['ACTIVE', 'COMPLETED', 'APPROVED', 'ACCESS GRANTED'].contains(s);
}

/// Statuses that grant access when loading courses (web: enrollmentGrantsAccess).
bool enrollmentGrantsAccess(String? status) {
  final s = (status == null || status.isEmpty ? 'Active' : status).toUpperCase();
  return const ['ACTIVE', 'COMPLETED', 'APPROVED'].contains(s);
}

String formatDate(dynamic value) {
  if (value == null) return '';
  final d = DateTime.tryParse(value.toString());
  if (d == null) return value.toString();
  final l = d.toLocal();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return '${months[l.month - 1]} ${l.day}, ${l.year}';
}

String formatDateTime(dynamic value) {
  if (value == null) return '';
  final d = DateTime.tryParse(value.toString());
  if (d == null) return value.toString();
  final l = d.toLocal();
  final h = l.hour % 12 == 0 ? 12 : l.hour % 12;
  final m = l.minute.toString().padLeft(2, '0');
  return '${formatDate(value)}, $h:$m ${l.hour < 12 ? 'AM' : 'PM'}';
}

int toInt(dynamic v, [int fallback = 0]) {
  if (v is int) return v;
  if (v is num) return v.round();
  return int.tryParse(v?.toString() ?? '') ?? fallback;
}

double toDouble(dynamic v, [double fallback = 0]) {
  if (v is num) return v.toDouble();
  return double.tryParse(v?.toString() ?? '') ?? fallback;
}

class PortalCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final Color? borderColor;
  final Gradient? gradient;
  final VoidCallback? onTap;

  const PortalCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color,
    this.borderColor,
    this.gradient,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final box = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: gradient == null ? (color ?? AppTheme.bgCard) : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor ?? AppTheme.borderSubtle),
      ),
      child: child,
    );
    if (onTap == null) return box;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: box,
    );
  }
}

class StatusPill extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;

  const StatusPill({super.key, required this.label, required this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: tint(color, 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tint(color, 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
          ],
          Text(label,
              style: TextStyle(
                  color: color, fontSize: 11, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class EnrollmentStatusPill extends StatelessWidget {
  final String? status;
  final String? label;

  const EnrollmentStatusPill({super.key, this.status, this.label});

  @override
  Widget build(BuildContext context) {
    final key = (status ?? '').toUpperCase();
    String text;
    Color color;
    switch (key) {
      case 'PENDING':
        text = 'Pending approval';
        color = AppTheme.warning;
        break;
      case 'APPROVED':
      case 'ACTIVE':
        text = 'Approved';
        color = AppTheme.success;
        break;
      case 'COMPLETED':
        text = 'Completed';
        color = AppTheme.success;
        break;
      case 'REJECTED':
        text = 'Declined';
        color = AppTheme.error;
        break;
      case 'CANCELLED':
        text = 'Cancelled';
        color = AppTheme.textMuted;
        break;
      case 'DROPPED':
        text = 'Withdrawn';
        color = AppTheme.textMuted;
        break;
      default:
        text = (status == null || status!.isEmpty) ? 'Unknown' : status!;
        color = AppTheme.textMuted;
    }
    return StatusPill(label: text, color: color);
  }
}

class StarRating extends StatelessWidget {
  final double? average;
  final int? count;
  final double size;

  const StarRating({super.key, this.average, this.count, this.size = 13});

  @override
  Widget build(BuildContext context) {
    final avg = average ?? 0;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Icon(
            avg >= i
                ? Icons.star_rounded
                : (avg >= i - 0.5 ? Icons.star_half_rounded : Icons.star_outline_rounded),
            size: size,
            color: AppTheme.warning,
          ),
        const SizedBox(width: 4),
        Text(
          (average == null || (count ?? 0) == 0)
              ? 'No ratings'
              : '${avg.toStringAsFixed(1)} (${count ?? 0})',
          style: TextStyle(color: AppTheme.textMuted, fontSize: size - 1),
        ),
      ],
    );
  }
}

class BackToCoursesButton extends StatelessWidget {
  final VoidCallback onTap;
  const BackToCoursesButton({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: TextButton.icon(
        onPressed: onTap,
        icon: const Icon(Icons.arrow_back, size: 16),
        label: const Text('Back to My Courses'),
        style: TextButton.styleFrom(foregroundColor: AppTheme.textMuted),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color color;

  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.color = AppTheme.primary,
  });

  @override
  Widget build(BuildContext context) {
    final style = ElevatedButton.styleFrom(
      backgroundColor: color,
      foregroundColor: Colors.white,
      disabledBackgroundColor: tint(color, 0.4),
      disabledForegroundColor: Colors.white70,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
    );
    if (icon == null) {
      return ElevatedButton(onPressed: onPressed, style: style, child: Text(label));
    }
    return ElevatedButton.icon(
      onPressed: onPressed,
      style: style,
      icon: Icon(icon, size: 16),
      label: Text(label),
    );
  }
}

class GhostButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color? color;

  const GhostButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final style = OutlinedButton.styleFrom(
      foregroundColor: color ?? AppTheme.textMain,
      side: BorderSide(color: AppTheme.borderSubtle),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
    );
    if (icon == null) {
      return OutlinedButton(onPressed: onPressed, style: style, child: Text(label));
    }
    return OutlinedButton.icon(
      onPressed: onPressed,
      style: style,
      icon: Icon(icon, size: 16),
      label: Text(label),
    );
  }
}

/// PDF viewer modal. Flutter has no embedded PDF viewer in this project, so it
/// shows the resolved document URL with copy actions (web: pdfDoc modal).
Future<void> showPdfDialog(BuildContext context,
    {required String title, required String? url, String? fileName}) {
  final resolved = resolveServerUrl(url);
  final name = (fileName == null || fileName.isEmpty) ? 'Document.pdf' : fileName;
  return showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppTheme.bgSurface,
      titlePadding: const EdgeInsets.fromLTRB(20, 16, 8, 0),
      title: Row(
        children: [
          const Icon(Icons.picture_as_pdf, color: AppTheme.accent),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.textMain)),
                Text('$name • Document Viewer',
                    style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: () => Navigator.of(ctx).pop(),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.bgMain,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.borderSubtle),
            ),
            child: SelectableText(
              resolved.isEmpty ? 'No document is attached to this item.' : resolved,
              style: const TextStyle(fontSize: 12, color: AppTheme.secondary),
            ),
          ),
          const SizedBox(height: 8),
          Text('Open this link in your browser to view or save the PDF.',
              style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        ],
      ),
      actions: [
        if (resolved.isNotEmpty)
          TextButton.icon(
            icon: const Icon(Icons.download, size: 16),
            label: const Text('Download'),
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: resolved));
              if (ctx.mounted) {
                Navigator.of(ctx).pop();
                showPortalMessage(context, 'Download link for $name copied to clipboard.');
              }
            },
          ),
      ],
    ),
  );
}

/// Code block with copy action (web: CodeSnippetCard).
class CodeSnippetCard extends StatefulWidget {
  final String code;
  const CodeSnippetCard({super.key, required this.code});

  @override
  State<CodeSnippetCard> createState() => _CodeSnippetCardState();
}

class _CodeSnippetCardState extends State<CodeSnippetCard> {
  bool _copied = false;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.code));
    if (!mounted) return;
    setState(() => _copied = true);
    _timer?.cancel();
    _timer = Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF0D1117),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: AppTheme.borderSubtle)),
            ),
            child: Row(
              children: [
                Text('code',
                    style: TextStyle(fontSize: 11, color: AppTheme.textSubtle)),
                const Spacer(),
                TextButton.icon(
                  onPressed: _copy,
                  style: TextButton.styleFrom(
                    foregroundColor: _copied ? AppTheme.success : AppTheme.textMuted,
                    visualDensity: VisualDensity.compact,
                  ),
                  icon: Icon(_copied ? Icons.check : Icons.copy, size: 13),
                  label: Text(_copied ? 'Copied' : 'Copy',
                      style: const TextStyle(fontSize: 11)),
                ),
              ],
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(12),
            child: SelectableText(
              widget.code,
              style: const TextStyle(
                  fontFamily: 'monospace', fontSize: 12.5, color: Color(0xFFE6EDF3)),
            ),
          ),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;

  const SectionHeader({super.key, required this.title, this.subtitle, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textMain)),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(subtitle!,
                      style: TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4)),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 8), trailing!],
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;

  const EmptyState(
      {super.key, required this.icon, required this.title, this.message, this.action});

  @override
  Widget build(BuildContext context) {
    return PortalCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Column(
        children: [
          Icon(icon, size: 36, color: AppTheme.textSubtle),
          const SizedBox(height: 10),
          Text(title,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textMain)),
          if (message != null) ...[
            const SizedBox(height: 6),
            Text(message!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4)),
          ],
          if (action != null) ...[const SizedBox(height: 14), action!],
        ],
      ),
    );
  }
}

class LoadingLine extends StatelessWidget {
  final String text;
  const LoadingLine(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
              width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
          const SizedBox(width: 10),
          Flexible(
              child: Text(text, style: TextStyle(color: AppTheme.textMuted))),
        ],
      ),
    );
  }
}
