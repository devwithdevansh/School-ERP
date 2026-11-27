import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../controllers/student_voice_controller.dart';
import '../models/student_voice_model.dart';

class StudentVoiceStaffView extends StatefulWidget {
  const StudentVoiceStaffView({super.key});

  @override
  State<StudentVoiceStaffView> createState() => _StudentVoiceStaffViewState();
}

class _StudentVoiceStaffViewState extends State<StudentVoiceStaffView> {
  final _ctrl = Get.find<StudentVoiceController>();
  String _statusFilter = 'all';

  @override
  void initState() {
    super.initState();
    _ctrl.fetchQueue();
  }

  void _openDetail(StudentVoiceModel item) {
    final replyCtrl = TextEditingController();
    String nextStatus = item.status;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.title, style: AppTextStyles.h3),
              const SizedBox(height: 6),
              Text(item.description, style: AppTextStyles.bodyMedium),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: nextStatus,
                decoration: const InputDecoration(
                  labelText: 'Update Status',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: const [
                  DropdownMenuItem(value: 'submitted', child: Text('Submitted')),
                  DropdownMenuItem(value: 'under_review', child: Text('Under Review')),
                  DropdownMenuItem(value: 'action_taken', child: Text('Action Taken')),
                  DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                ],
                onChanged: (v) async {
                  if (v == null) return;
                  setSheetState(() => nextStatus = v);
                  await _ctrl.updateStatus(item.id, v);
                  _ctrl.fetchQueue(status: _statusFilter);
                },
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: replyCtrl,
                      decoration: const InputDecoration(
                        hintText: 'Reply to concern...',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () async {
                      if (replyCtrl.text.trim().isEmpty) return;
                      final ok = await _ctrl.addThread(item.id, replyCtrl.text.trim());
                      if (ok) {
                        Navigator.pop(ctx);
                        _ctrl.fetchQueue(status: _statusFilter);
                      }
                    },
                    child: const Text('Send'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Student Voice Queue')),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: Space.lg, vertical: 8),
            child: Row(
              children: ['all', 'submitted', 'under_review', 'action_taken', 'resolved']
                  .map((s) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(s.replaceAll('_', ' ').toUpperCase()),
                          selected: _statusFilter == s,
                          onSelected: (_) {
                            setState(() => _statusFilter = s);
                            _ctrl.fetchQueue(status: s);
                          },
                        ),
                      ))
                  .toList(),
            ),
          ),
          Expanded(
            child: Obx(() {
              if (_ctrl.loading.value) {
                return const Center(child: CircularProgressIndicator());
              }
              if (_ctrl.queue.isEmpty) {
                return const Center(child: Text('No concerns in queue.'));
              }
              return RefreshIndicator(
                onRefresh: () => _ctrl.fetchQueue(status: _statusFilter),
                child: ListView.separated(
                  padding: const EdgeInsets.all(Space.lg),
                  itemCount: _ctrl.queue.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) {
                    final item = _ctrl.queue[i];
                    return SurfaceCard(
                      onTap: () => _openDetail(item),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.title, style: AppTextStyles.labelLarge),
                          const SizedBox(height: 4),
                          Text(
                            item.isAnonymous
                                ? 'Anonymous'
                                : (item.studentName ?? 'Student'),
                            style: AppTextStyles.bodySmall,
                          ),
                          const SizedBox(height: 6),
                          Text(item.description, maxLines: 2, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    );
                  },
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
