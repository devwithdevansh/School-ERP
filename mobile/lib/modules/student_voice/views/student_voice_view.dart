import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../dashboard/controllers/dashboard_controller.dart';
import '../controllers/student_voice_controller.dart';
import '../models/student_voice_model.dart';

class StudentVoiceView extends StatefulWidget {
  const StudentVoiceView({super.key});

  @override
  State<StudentVoiceView> createState() => _StudentVoiceViewState();
}

class _StudentVoiceViewState extends State<StudentVoiceView>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _ctrl = Get.find<StudentVoiceController>();

  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _category = 'academic';
  bool _isAnonymous = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _ctrl.fetchMySubmissions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'under_review':
        return Colors.blue;
      case 'action_taken':
        return Colors.purple;
      case 'resolved':
        return Colors.green;
      default:
        return Colors.orange;
    }
  }

  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty || _descCtrl.text.trim().isEmpty) {
      Get.snackbar('Required', 'Please enter a title and description');
      return;
    }
    setState(() => _submitting = true);
    String? studentId;
    if (Get.isRegistered<DashboardController>()) {
      studentId = Get.find<DashboardController>().student.value?.id;
    }
    final ok = await _ctrl.submit(
      category: _category,
      title: _titleCtrl.text.trim(),
      description: _descCtrl.text.trim(),
      isAnonymous: _isAnonymous,
      studentId: studentId,
    );
    setState(() => _submitting = false);
    if (ok) {
      _titleCtrl.clear();
      _descCtrl.clear();
      setState(() => _isAnonymous = false);
      _tabController.animateTo(0);
      Get.snackbar('Submitted', 'Your concern has been submitted confidentially.');
    } else {
      Get.snackbar('Error', 'Could not submit concern. Please try again.');
    }
  }

  void _openDetail(StudentVoiceModel item) {
    final replyCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
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
            const SizedBox(height: 16),
            Text('Resolution Thread', style: AppTextStyles.labelLarge),
            const SizedBox(height: 8),
            if (item.thread.isEmpty)
              Text('No replies yet.', style: AppTextStyles.bodySmall)
            else
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 200),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: item.thread.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final t = item.thread[i];
                    return Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t.byRole.toUpperCase(), style: AppTextStyles.labelSmall),
                          const SizedBox(height: 4),
                          Text(t.message, style: AppTextStyles.bodySmall),
                        ],
                      ),
                    );
                  },
                ),
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: replyCtrl,
                    decoration: const InputDecoration(
                      hintText: 'Add a follow-up...',
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
                      _ctrl.fetchMySubmissions();
                    }
                  },
                  child: const Text('Send'),
                ),
              ],
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
        title: const Text('Student Voice'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'My Submissions'),
            Tab(text: 'Submit New'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          Obx(() {
            if (_ctrl.loading.value) {
              return const Center(child: CircularProgressIndicator());
            }
            if (_ctrl.submissions.isEmpty) {
              return RefreshIndicator(
                onRefresh: _ctrl.fetchMySubmissions,
                child: ListView(
                  children: const [
                    SizedBox(height: 120),
                    Center(child: Text('No submissions yet.')),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: _ctrl.fetchMySubmissions,
              child: ListView.separated(
                padding: const EdgeInsets.all(Space.lg),
                itemCount: _ctrl.submissions.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) {
                  final item = _ctrl.submissions[i];
                  final color = _statusColor(item.status);
                  return SurfaceCard(
                    onTap: () => _openDetail(item),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Chip(
                              label: Text(item.category.toUpperCase()),
                              visualDensity: VisualDensity.compact,
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                item.status.replaceAll('_', ' ').toUpperCase(),
                                style: TextStyle(
                                  color: color,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(item.title, style: AppTextStyles.labelLarge),
                        const SizedBox(height: 4),
                        Text(
                          item.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.bodySmall,
                        ),
                      ],
                    ),
                  );
                },
              ),
            );
          }),
          SingleChildScrollView(
            padding: const EdgeInsets.all(Space.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String>(
                  value: _category,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'academic', child: Text('Academic')),
                    DropdownMenuItem(value: 'safety', child: Text('Safety')),
                    DropdownMenuItem(value: 'wellbeing', child: Text('Wellbeing')),
                    DropdownMenuItem(value: 'facility', child: Text('Facility')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (v) => setState(() => _category = v ?? 'academic'),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _titleCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Title',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _descCtrl,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('Submit Anonymously'),
                  subtitle: const Text('Hide your identity from school staff'),
                  value: _isAnonymous,
                  onChanged: (v) => setState(() => _isAnonymous = v),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  child: Text(_submitting ? 'Submitting...' : 'Submit Concern'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
