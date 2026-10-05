import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../data/models/leave_request_model.dart';
import '../../../data/repositories/leave_repository.dart';
import '../../dashboard/controllers/dashboard_controller.dart';

const _months = ['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

class LeaveRequestView extends StatefulWidget {
  const LeaveRequestView({super.key});

  @override
  State<LeaveRequestView> createState() => _LeaveRequestViewState();
}

class _LeaveRequestViewState extends State<LeaveRequestView> {
  final _repo = LeaveRepository();
  DateTime? _from;
  DateTime? _to;
  final _reasonController = TextEditingController();
  bool _submitting = false;
  bool _loading = true;
  List<LeaveRequestModel> _history = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  String? get _studentId => Get.find<DashboardController>().student.value?.id;

  Future<void> _load() async {
    final studentId = _studentId;
    if (studentId == null || studentId.isEmpty) {
      setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    final history = await _repo.getLeaveRequests(studentId);
    if (!mounted) return;
    setState(() {
      _history = history;
      _loading = false;
    });
  }

  Future<void> _pickDate({required bool isFrom}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        _from = picked;
        if (_to != null && _to!.isBefore(picked)) _to = picked;
      } else {
        _to = picked;
      }
    });
  }

  String _fmtDate(DateTime? d) {
    if (d == null) return 'Select date';
    return '${d.day} ${_months[d.month]}';
  }

  Future<void> _submit() async {
    final studentId = _studentId;
    if (studentId == null || studentId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No student selected.')),
      );
      return;
    }
    if (_from == null || _to == null || _reasonController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in the dates and reason.')),
      );
      return;
    }
    setState(() => _submitting = true);
    final ok = await _repo.createLeaveRequest(
      studentId: studentId,
      startDate: _from!,
      endDate: _to!,
      reason: _reasonController.text.trim(),
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (ok) {
      _from = null;
      _to = null;
      _reasonController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Leave request submitted.')),
      );
      _load();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not submit the request. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const AppPageBar(title: 'Leave request'),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primary,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(title: 'New request'),
                  const SizedBox(height: 12),
                  SurfaceCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(child: _DateField(label: 'From', value: _fmtDate(_from), onTap: () => _pickDate(isFrom: true))),
                            const SizedBox(width: 12),
                            Expanded(child: _DateField(label: 'To', value: _fmtDate(_to), onTap: () => _pickDate(isFrom: false))),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text('Reason', style: AppTextStyles.labelLarge),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _reasonController,
                          maxLines: 3,
                          style: AppTextStyles.bodyLarge.copyWith(color: AppColors.ink),
                          decoration: InputDecoration(
                            hintText: 'Briefly describe the reason for leave',
                            hintStyle: AppTextStyles.bodyMedium,
                          ),
                        ),
                        const SizedBox(height: 18),
                        CustomButton(
                          label: _submitting ? 'Submitting…' : 'Submit request',
                          onTap: _submitting ? () {} : _submit,
                          icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 26),
                  const SectionHeader(title: 'My requests'),
                  const SizedBox(height: 12),
                  if (_loading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_history.isEmpty)
                    const EmptyState(
                      icon: Icons.event_available_rounded,
                      title: 'No leave requests yet',
                      message: 'Requests you submit will appear here.',
                    )
                  else
                    for (final h in _history) ...[
                      _LeaveHistoryCard(entry: h),
                      const SizedBox(height: 10),
                    ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;
  const _DateField({required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) =>
      AppPickerField(label: label, value: value, onTap: onTap);
}

class _LeaveHistoryCard extends StatelessWidget {
  final LeaveRequestModel entry;
  const _LeaveHistoryCard({required this.entry});

  String _fmtDate(DateTime d) => '${d.day} ${_months[d.month]}';

  @override
  Widget build(BuildContext context) {
    final (label, tone) = switch (entry.status) {
      'APPROVED' => ('Approved', PillTone.success),
      'REJECTED' => ('Rejected', PillTone.danger),
      _ => ('Pending', PillTone.warning),
    };
    final dateRange = entry.startDate == entry.endDate
        ? _fmtDate(entry.startDate)
        : '${_fmtDate(entry.startDate)} – ${_fmtDate(entry.endDate)}';
    return SurfaceCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(8)),
            child: Icon(Icons.event_busy_rounded, color: AppColors.primary, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Expanded(child: Text(dateRange, style: AppTextStyles.labelLarge)),
                  StatusPill(label, tone: tone),
                ]),
                const SizedBox(height: 3),
                Text(entry.reason, style: AppTextStyles.bodySmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                if (entry.reviewRemarks != null && entry.reviewRemarks!.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text('Note: ${entry.reviewRemarks}',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.inkLight, fontStyle: FontStyle.italic)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
