import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../../../../core/utils/date_labels.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../data/models/leave_request_model.dart';
import '../../../../data/models/staff_leave_request_model.dart';
import '../controllers/teacher_leaves_controller.dart';

int _daysBetween(DateTime start, DateTime end) =>
    dateOnly(end).difference(dateOnly(start)).inDays + 1;

String _range(DateTime start, DateTime end) {
  final s = start.toLocal();
  final e = end.toLocal();
  return dateOnly(s) == dateOnly(e) ? fmtShortDate(s) : '${fmtShortDate(s)} – ${fmtShortDate(e)}';
}

String _daysLabel(int n) => n == 1 ? '1 day' : '$n days';

class TeacherLeavesView extends GetView<TeacherLeavesController> {
  const TeacherLeavesView({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppPageBar(
          title: 'Leaves',
          bottom: TabBar(
            indicatorColor: AppColors.accentDeep,
            indicatorWeight: 3,
            labelColor: AppColors.ink,
            unselectedLabelColor: AppColors.inkLight,
            labelStyle: AppTextStyles.labelLarge.copyWith(fontSize: 13.5),
            unselectedLabelStyle: AppTextStyles.labelLarge.copyWith(fontSize: 13.5, fontWeight: FontWeight.w500),
            dividerColor: Colors.transparent,
            tabs: const [
              Tab(text: 'Class requests'),
              Tab(text: 'My leave'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _ClassRequestsTab(),
            _MyLeaveTab(),
          ],
        ),
      ),
    );
  }
}

// ── Class requests (review your students' leave) ─────────────────────────

class _ClassRequestsTab extends GetView<TeacherLeavesController> {
  const _ClassRequestsTab();

  Widget _scrollable(BuildContext context, Widget child) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.6,
          child: Center(child: child),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: controller.loadLeaves,
      color: AppColors.primary,
      child: Obx(() {
        if (controller.isLoading.value) return const SkeletonList(itemHeight: 150);

        if (!controller.hasClass.value) {
          return _scrollable(
            context,
            const EmptyState(
              icon: Icons.school_outlined,
              title: 'No class assigned',
              message: "You aren't set as a class teacher for any class yet.",
            ),
          );
        }

        final pending = controller.leaves.where((l) => l.status == 'PENDING').toList();
        if (pending.isEmpty) {
          return _scrollable(
            context,
            const EmptyState(
              icon: Icons.check_circle_outline_rounded,
              title: 'All caught up!',
              message: 'There are no pending leave requests to review.',
            ),
          );
        }

        return ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, Space.xl),
          itemCount: pending.length + 1,
          separatorBuilder: (_, __) => const SizedBox(height: Space.sm + 2),
          itemBuilder: (context, i) {
            if (i == 0) {
              return Text(
                '${pending.length} ${pending.length == 1 ? 'request' : 'requests'} waiting for your decision',
                style: AppTextStyles.bodyMedium,
              );
            }
            return _ClassLeaveCard(leave: pending[i - 1]);
          },
        );
      }),
    );
  }
}

class _ClassLeaveCard extends GetView<TeacherLeavesController> {
  final LeaveRequestModel leave;
  const _ClassLeaveCard({required this.leave});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final busy = controller.updatingId.value == leave.id;
      final days = _daysBetween(leave.startDate, leave.endDate);
      return SurfaceCard(
        padding: const EdgeInsets.all(Space.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(leave.studentName ?? 'Student', style: AppTextStyles.h3)),
                if (leave.classLabel.isNotEmpty) StatusPill(leave.classLabel, tone: PillTone.brand),
              ],
            ),
            const SizedBox(height: Space.sm),
            Row(
              children: [
                Icon(Icons.event_rounded, size: 16, color: AppColors.inkLight),
                const SizedBox(width: 6),
                Text(_range(leave.startDate, leave.endDate), style: AppTextStyles.labelLarge),
                const SizedBox(width: 8),
                Text('· ${_daysLabel(days)}', style: AppTextStyles.bodySmall),
              ],
            ),
            const SizedBox(height: Space.sm),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(Space.sm + 2),
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(Radii.sm),
              ),
              child: Text(leave.reason, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink)),
            ),
            const SizedBox(height: Space.md),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.red,
                      side: BorderSide(color: AppColors.red),
                      minimumSize: const Size.fromHeight(46),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: busy ? null : () => controller.updateStatus(leave, 'REJECTED'),
                    child: const Text('Reject'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.teal,
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(46),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: busy ? null : () => controller.updateStatus(leave, 'APPROVED'),
                    child: busy
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    });
  }
}

// ── My leave (apply + track your own leave) ──────────────────────────────

class _MyLeaveTab extends GetView<TeacherLeavesController> {
  const _MyLeaveTab();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: controller.loadMyLeaves,
          color: AppColors.primary,
          child: Obx(() {
            if (controller.isLoadingMyLeaves.value) return const SkeletonList(itemHeight: 120);
            if (controller.myLeaves.isEmpty) {
              return SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: SizedBox(
                  height: MediaQuery.of(context).size.height * 0.6,
                  child: const Center(
                    child: EmptyState(
                      icon: Icons.event_available_outlined,
                      title: 'No leave applications yet',
                      message: 'Apply for leave and track its approval here.',
                    ),
                  ),
                ),
              );
            }
            return ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(Space.md, Space.md, Space.md, 104),
              itemCount: controller.myLeaves.length,
              separatorBuilder: (_, __) => const SizedBox(height: Space.sm + 2),
              itemBuilder: (context, i) => _MyLeaveCard(leave: controller.myLeaves[i]),
            );
          }),
        ),
        Positioned(
          left: Space.md,
          right: Space.md,
          bottom: Space.md,
          child: SafeArea(
            top: false,
            child: CustomButton(
              label: 'Apply for leave',
              icon: Icon(Icons.add_rounded, color: AppColors.white, size: 20),
              onTap: () => showAppSheet(
                context: context,
                title: 'Apply for leave',
                subtitle: 'Your request goes to the school admin for approval.',
                child: _ApplyLeaveForm(controller: controller),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MyLeaveCard extends StatelessWidget {
  final StaffLeaveRequestModel leave;
  const _MyLeaveCard({required this.leave});

  @override
  Widget build(BuildContext context) {
    final (label, tone) = switch (leave.status) {
      'APPROVED' => ('Approved', PillTone.success),
      'REJECTED' => ('Rejected', PillTone.danger),
      _ => ('Pending', PillTone.warning),
    };
    final days = _daysBetween(leave.startDate, leave.endDate);

    return SurfaceCard(
      padding: const EdgeInsets.all(Space.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${leave.type[0]}${leave.type.substring(1).toLowerCase()} leave',
                  style: AppTextStyles.h3,
                ),
              ),
              StatusPill(label, tone: tone),
            ],
          ),
          const SizedBox(height: Space.sm),
          Row(
            children: [
              Icon(Icons.event_rounded, size: 16, color: AppColors.inkLight),
              const SizedBox(width: 6),
              Text(_range(leave.startDate, leave.endDate), style: AppTextStyles.labelLarge),
              const SizedBox(width: 8),
              Text('· ${_daysLabel(days)}', style: AppTextStyles.bodySmall),
            ],
          ),
          if (leave.reason.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(leave.reason, style: AppTextStyles.bodyMedium, maxLines: 3, overflow: TextOverflow.ellipsis),
          ],
          if (leave.status == 'REJECTED' && (leave.rejectionReason ?? '').isNotEmpty) ...[
            const SizedBox(height: Space.sm),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(Space.sm),
              decoration: BoxDecoration(
                color: AppColors.redPale,
                borderRadius: BorderRadius.circular(Radii.sm),
              ),
              child: Text(
                'Reason: ${leave.rejectionReason}',
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.red),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ApplyLeaveForm extends StatefulWidget {
  final TeacherLeavesController controller;
  const _ApplyLeaveForm({required this.controller});

  @override
  State<_ApplyLeaveForm> createState() => _ApplyLeaveFormState();
}

class _ApplyLeaveFormState extends State<_ApplyLeaveForm> {
  static const _types = ['CASUAL', 'SICK', 'UNPAID', 'OTHER'];

  final _reason = TextEditingController();
  String _type = 'CASUAL';
  DateTime _start = dateOnly(DateTime.now());
  DateTime _end = dateOnly(DateTime.now());
  String? _reasonErr;
  String? _formErr;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _pick(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _start : _end,
      firstDate: isStart ? DateTime.now().subtract(const Duration(days: 30)) : _start,
      lastDate: DateTime.now().add(const Duration(days: 180)),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _start = dateOnly(picked);
        if (_end.isBefore(_start)) _end = _start;
      } else {
        _end = dateOnly(picked);
      }
    });
  }

  Future<void> _submit() async {
    final reason = _reason.text.trim();
    setState(() {
      _reasonErr = reason.isEmpty ? 'Please give a reason' : null;
      _formErr = null;
    });
    if (_reasonErr != null) return;

    final ok = await widget.controller.submitMyLeave(
      startDate: _start,
      endDate: _end,
      reason: reason,
      type: _type,
    );
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pop();
      Get.snackbar('Submitted', 'Your leave application was sent for approval.');
    } else {
      setState(() => _formErr = 'Could not submit your application. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final days = _daysBetween(_start, _end);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppDropdownField<String>(
          label: 'Leave type',
          value: _type,
          items: _types,
          itemLabel: (t) => '${t[0]}${t.substring(1).toLowerCase()}',
          onChanged: (t) => setState(() => _type = t ?? 'CASUAL'),
        ),
        const SizedBox(height: Space.md),
        Row(
          children: [
            Expanded(
              child: AppPickerField(label: 'From', value: fmtShortDate(_start), onTap: () => _pick(true)),
            ),
            const SizedBox(width: Space.sm),
            Expanded(
              child: AppPickerField(label: 'To', value: fmtShortDate(_end), onTap: () => _pick(false)),
            ),
          ],
        ),
        const SizedBox(height: Space.xs + 2),
        Text('Total: ${_daysLabel(days)}', style: AppTextStyles.bodySmall),
        const SizedBox(height: Space.md),
        AppTextField(
          label: 'Reason',
          required: true,
          hint: 'Why do you need leave?',
          controller: _reason,
          minLines: 3,
          maxLines: 5,
          maxLength: 300,
          errorText: _reasonErr,
          onChanged: (_) {
            if (_reasonErr != null) setState(() => _reasonErr = null);
          },
        ),
        if (_formErr != null) ...[
          const SizedBox(height: Space.sm),
          Text(_formErr!, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.red)),
        ],
        const SizedBox(height: Space.lg),
        Obx(() => CustomButton(
              label: 'Submit application',
              loading: widget.controller.isSubmittingMyLeave.value,
              onTap: widget.controller.isSubmittingMyLeave.value ? null : _submit,
            )),
      ],
    );
  }
}
