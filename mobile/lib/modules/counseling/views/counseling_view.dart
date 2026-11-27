import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../controllers/counseling_controller.dart';
import '../models/counseling_model.dart';

class CounselingView extends GetView<CounselingController> {
  const CounselingView({super.key});

  @override
  Widget build(BuildContext context) {
    // Determine role; in real app read from auth controller / secure storage
    final String role = Get.arguments?['role'] ?? 'teacher';
    final String? studentId = Get.arguments?['studentId'];
    final bool isParent = role == 'parent';

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (isParent && studentId != null) {
        controller.fetchForStudent(studentId);
      } else {
        controller.fetchMine();
      }
    });

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        elevation: 0,
        title: Text(
          'Counseling & Support',
          style: AppTextStyles.h3.copyWith(fontSize: 18),
        ),
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.ink),
      ),
      body: Obx(() {
        if (controller.loading.value && controller.records.isEmpty) {
          return _buildShimmer();
        }
        if (controller.error.value.isNotEmpty && controller.records.isEmpty) {
          return Center(
            child: Text(
              controller.error.value,
              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.red),
            ),
          );
        }
        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            if (isParent && studentId != null) {
              await controller.fetchForStudent(studentId);
            } else {
              await controller.fetchMine();
            }
          },
          child: controller.records.isEmpty
              ? _buildEmpty(isParent)
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: controller.records.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final record = controller.records[index];
                    return isParent
                        ? _ParentRecordCard(record: record)
                        : _StaffRecordCard(
                            record: record,
                            controller: controller,
                          );
                  },
                ),
        );
      }),
    );
  }

  Widget _buildEmpty(bool isParent) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isParent ? Icons.support_agent_outlined : Icons.assignment_outlined,
            size: 56,
            color: AppColors.inkLight.withOpacity(0.4),
          ),
          const SizedBox(height: 12),
          Text(
            isParent
                ? "No support plans available yet."
                : "No counseling records found.",
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.inkLight),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmer() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => Container(
        height: 100,
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const _ShimmerBox(),
      ),
    );
  }
}

// ---- Parent Record Card ----
class _ParentRecordCard extends StatelessWidget {
  final CounselingRecord record;
  const _ParentRecordCard({required this.record});

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _TypeBadge(type: record.type),
              const SizedBox(width: 8),
              _StatusBadge(status: record.status),
              const Spacer(),
              Text(
                _formatDate(record.createdAt),
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.inkLight),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(record.summary, style: AppTextStyles.bodyMedium, maxLines: 3, overflow: TextOverflow.ellipsis),
          if (record.supportPlan.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Text(
                  '${record.achievedMilestones}/${record.supportPlan.length} milestones',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.inkLight),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: record.milestoneProgress,
                backgroundColor: AppColors.inkLight.withOpacity(0.1),
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.teal),
                minHeight: 8,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ---- Staff / Teacher Record Card ----
class _StaffRecordCard extends StatefulWidget {
  final CounselingRecord record;
  final CounselingController controller;
  const _StaffRecordCard({required this.record, required this.controller});

  @override
  State<_StaffRecordCard> createState() => _StaffRecordCardState();
}

class _StaffRecordCardState extends State<_StaffRecordCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final record = widget.record;
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: BorderRadius.circular(12),
            child: Row(
              children: [
                _TypeBadge(type: record.type),
                const SizedBox(width: 8),
                _StatusBadge(status: record.status),
                const Spacer(),
                Icon(
                  _expanded ? Icons.expand_less : Icons.expand_more,
                  color: AppColors.inkLight,
                  size: 20,
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(record.summary, style: AppTextStyles.bodyMedium, maxLines: _expanded ? null : 2, overflow: _expanded ? TextOverflow.visible : TextOverflow.ellipsis),
          if (record.supportPlan.isNotEmpty) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: record.milestoneProgress,
                backgroundColor: AppColors.inkLight.withOpacity(0.1),
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.teal),
                minHeight: 6,
              ),
            ),
          ],
          if (_expanded) ...[
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 12),
            if (record.supportPlan.isNotEmpty) ...[
              Text('Milestones', style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...record.supportPlan.asMap().entries.map((entry) {
                final idx = entry.key;
                final m = entry.value;
                return _MilestoneRow(
                  milestone: m,
                  idx: idx,
                  recordId: record.id,
                  controller: widget.controller,
                );
              }),
              const SizedBox(height: 10),
            ],
            if (record.status != 'closed')
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () async {
                    final confirmed = await _confirmClose(context);
                    if (confirmed == true) {
                      await widget.controller.closeRecord(record.id);
                    }
                  },
                  icon: const Icon(Icons.lock_outline, size: 16),
                  label: const Text('Close Record'),
                  style: TextButton.styleFrom(foregroundColor: AppColors.red),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Future<bool?> _confirmClose(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Close Record'),
        content: const Text('Are you sure you want to close this counseling record?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Close')),
        ],
      ),
    );
  }
}

class _MilestoneRow extends StatelessWidget {
  final Milestone milestone;
  final int idx;
  final String recordId;
  final CounselingController controller;

  const _MilestoneRow({
    required this.milestone,
    required this.idx,
    required this.recordId,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    final achieved = milestone.status == 'achieved';
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Checkbox(
            value: achieved,
            activeColor: AppColors.teal,
            onChanged: (val) {
              final newStatus = (val == true) ? 'achieved' : 'in_progress';
              controller.updateMilestoneStatus(recordId, idx, newStatus);
            },
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  milestone.milestone,
                  style: AppTextStyles.bodyMedium.copyWith(
                    decoration: achieved ? TextDecoration.lineThrough : null,
                    color: achieved ? AppColors.inkLight : AppColors.ink,
                  ),
                ),
                Text(
                  'Target: ${_formatDate(milestone.targetDate)}',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.inkLight),
                ),
              ],
            ),
          ),
          _MilestoneStatusChip(status: milestone.status),
        ],
      ),
    );
  }
}

// ---- Helper Widgets ----
class _TypeBadge extends StatelessWidget {
  final String type;
  const _TypeBadge({required this.type});

  Color _color() {
    switch (type) {
      case 'academic': return const Color(0xFF3B82F6);
      case 'behavioural': return const Color(0xFFF97316);
      case 'social': return const Color(0xFF22C55E);
      case 'emotional': return const Color(0xFFA855F7);
      default: return AppColors.inkLight;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: _color().withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _color().withOpacity(0.3)),
      ),
      child: Text(
        type[0].toUpperCase() + type.substring(1),
        style: AppTextStyles.bodySmall.copyWith(color: _color(), fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  Color _color() {
    switch (status) {
      case 'open': return const Color(0xFF3B82F6);
      case 'in_progress': return const Color(0xFFEAB308);
      case 'closed': return AppColors.inkLight;
      default: return AppColors.inkLight;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: _color().withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: AppTextStyles.bodySmall.copyWith(color: _color(), fontWeight: FontWeight.w500),
      ),
    );
  }
}

class _MilestoneStatusChip extends StatelessWidget {
  final String status;
  const _MilestoneStatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final Color color;
    switch (status) {
      case 'achieved': color = AppColors.teal; break;
      case 'in_progress': color = const Color(0xFFEAB308); break;
      default: color = AppColors.inkLight;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: AppTextStyles.bodySmall.copyWith(color: color, fontSize: 10),
      ),
    );
  }
}

class _ShimmerBox extends StatelessWidget {
  const _ShimmerBox();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            AppColors.inkLight.withOpacity(0.05),
            AppColors.inkLight.withOpacity(0.12),
            AppColors.inkLight.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
    );
  }
}

String _formatDate(String iso) {
  if (iso.isEmpty) return '';
  try {
    final d = DateTime.parse(iso);
    return '${d.day}/${d.month}/${d.year}';
  } catch (_) {
    return iso;
  }
}
