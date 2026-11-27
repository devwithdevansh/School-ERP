import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';

import '../../dashboard/controllers/dashboard_controller.dart';
import '../controllers/academic_intelligence_controller.dart';
import '../models/mastery_model.dart';

// ─── Color Helpers ────────────────────────────────────────────────────────────

Color masteryColor(double pct) {
  if (pct < 40) return Colors.red;
  if (pct < 60) return Colors.orange;
  if (pct < 80) return Colors.amber;
  return Colors.green;
}

// ─── Main View ────────────────────────────────────────────────────────────────

class AcademicIntelligenceView extends GetView<AcademicIntelligenceController> {
  final String studentId;

  const AcademicIntelligenceView({super.key, this.studentId = ''});

  String get _resolvedStudentId {
    if (studentId.isNotEmpty) return studentId;
    if (Get.arguments is Map && Get.arguments['studentId'] != null) {
      return Get.arguments['studentId'].toString();
    }
    if (Get.isRegistered<DashboardController>()) {
      return Get.find<DashboardController>().student.value?.id ?? '';
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final sid = _resolvedStudentId;
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Academic Intelligence'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Mastery'),
              Tab(text: 'Gaps'),
              Tab(text: 'Plans'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _MasteryTab(studentId: sid),
            _GapsTab(studentId: sid),
            _PlansTab(studentId: sid),
          ],
        ),
      ),
    );
  }
}

// ─── Mastery Tab ──────────────────────────────────────────────────────────────

class _MasteryTab extends StatefulWidget {
  final String studentId;
  const _MasteryTab({required this.studentId});

  @override
  State<_MasteryTab> createState() => _MasteryTabState();
}

class _MasteryTabState extends State<_MasteryTab> {
  final ctrl = Get.find<AcademicIntelligenceController>();
  String? selectedSubjectId;

  final List<Map<String, String>> _subjectOptions = [];

  @override
  void initState() {
    super.initState();
    ctrl.fetchMastery(widget.studentId);
  }

  Future<void> _refresh() async {
    await ctrl.fetchMastery(widget.studentId, subjectId: selectedSubjectId);
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: Obx(() {
        if (ctrl.loading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        return Column(
          children: [
            // Subject selector
            Padding(
              padding: const EdgeInsets.all(12),
              child: DropdownButtonFormField<String>(
                value: selectedSubjectId,
                decoration: const InputDecoration(
                  labelText: 'Filter by Subject',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('All Subjects')),
                  ..._subjectOptions.map((s) => DropdownMenuItem(
                        value: s['id'],
                        child: Text(s['name']!),
                      )),
                ],
                onChanged: (val) {
                  setState(() => selectedSubjectId = val);
                  ctrl.fetchMastery(widget.studentId, subjectId: val);
                },
              ),
            ),

            // Concept list
            Expanded(
              child: ctrl.masteryData.isEmpty
                  ? const Center(child: Text('No mastery data available.', style: TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: ctrl.masteryData.length,
                      itemBuilder: (_, i) {
                        final m = ctrl.masteryData[i];
                        final pct = m.avgMasteryPct;
                        final color = masteryColor(pct);

                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  m.conceptTag.conceptName,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                Text(
                                  'Ch. ${m.conceptTag.chapterNumber} · ${m.conceptTag.chapterName}',
                                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(999),
                                        child: LinearProgressIndicator(
                                          value: pct / 100,
                                          backgroundColor: Colors.grey[200],
                                          valueColor: AlwaysStoppedAnimation<Color>(color),
                                          minHeight: 8,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      '${pct.toStringAsFixed(1)}%',
                                      style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 13),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      }),
    );
  }
}

// ─── Gaps Tab ─────────────────────────────────────────────────────────────────

class _GapsTab extends StatefulWidget {
  final String studentId;
  const _GapsTab({required this.studentId});

  @override
  State<_GapsTab> createState() => _GapsTabState();
}

class _GapsTabState extends State<_GapsTab> {
  final ctrl = Get.find<AcademicIntelligenceController>();

  @override
  void initState() {
    super.initState();
    ctrl.fetchGaps(widget.studentId);
  }

  Future<void> _refresh() async {
    await ctrl.fetchGaps(widget.studentId);
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: Obx(() {
        if (ctrl.loading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        if (ctrl.gaps.isEmpty) {
          return ListView(
            children: const [
              Padding(
                padding: EdgeInsets.all(32),
                child: Center(
                  child: Text('🎉 No learning gaps found!', style: TextStyle(fontSize: 16, color: Colors.green)),
                ),
              ),
            ],
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: ctrl.gaps.length,
          itemBuilder: (_, i) {
            final g = ctrl.gaps[i];
            final pct = g.avgMasteryPct;
            final color = masteryColor(pct);

            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(g.conceptTag.conceptName,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              Text(
                                'Ch. ${g.conceptTag.chapterNumber} · ${g.conceptTag.chapterName}',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: color),
                          ),
                          child: Text(
                            '${pct.toStringAsFixed(1)}%',
                            style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: pct / 100,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation<Color>(color),
                        minHeight: 8,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: OutlinedButton.icon(
                        onPressed: () {
                          // Navigate to plans tab or show plan details
                          Get.snackbar(
                            'View Plan',
                            'Navigate to Improvement Plans tab for "${g.conceptTag.conceptName}"',
                            snackPosition: SnackPosition.BOTTOM,
                          );
                        },
                        icon: const Icon(Icons.assignment_outlined, size: 16),
                        label: const Text('View Plan'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          textStyle: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      }),
    );
  }
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

class _PlansTab extends StatefulWidget {
  final String studentId;
  const _PlansTab({required this.studentId});

  @override
  State<_PlansTab> createState() => _PlansTabState();
}

class _PlansTabState extends State<_PlansTab> {
  final ctrl = Get.find<AcademicIntelligenceController>();

  @override
  void initState() {
    super.initState();
    ctrl.fetchPlans(widget.studentId);
  }

  Future<void> _refresh() async {
    await ctrl.fetchPlans(widget.studentId);
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'active':
        return Colors.blue;
      case 'completed':
        return Colors.green;
      case 'cancelled':
        return Colors.grey;
      default:
        return Colors.blue;
    }
  }

  Future<void> _openUrl(String url) async {
    await Clipboard.setData(ClipboardData(text: url));
    Get.snackbar('Link Copied', url, snackPosition: SnackPosition.BOTTOM);
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _refresh,
      child: Obx(() {
        if (ctrl.loading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        if (ctrl.plans.isEmpty) {
          return ListView(
            children: const [
              Padding(
                padding: EdgeInsets.all(32),
                child: Center(
                  child: Text('No active improvement plans.', style: TextStyle(color: Colors.grey)),
                ),
              ),
            ],
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: ctrl.plans.length,
          itemBuilder: (_, i) {
            final p = ctrl.plans[i];
            final statusColor = _statusColor(p.status);
            final targetDate = DateTime.tryParse(p.targetDate);
            final dateStr = targetDate != null
                ? '${targetDate.day}/${targetDate.month}/${targetDate.year}'
                : p.targetDate;

            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            p.conceptTagId?.conceptName ?? 'Concept',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusColor,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            p.status.toUpperCase(),
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    if (p.conceptTagId != null)
                      Text(
                        'Ch. ${p.conceptTagId!.chapterNumber} · ${p.conceptTagId!.chapterName}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    const SizedBox(height: 8),

                    // Description
                    Text(p.description, style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 8),

                    // Target date chip
                    Wrap(
                      spacing: 8,
                      children: [
                        Chip(
                          avatar: const Icon(Icons.calendar_today, size: 14),
                          label: Text('Target: $dateStr', style: const TextStyle(fontSize: 12)),
                          padding: EdgeInsets.zero,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ],
                    ),

                    // Resources
                    if (p.resources.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      const Text('Resources:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(height: 4),
                      ...p.resources.map((r) => InkWell(
                            onTap: () => _openUrl(r.url),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 3),
                              child: Row(
                                children: [
                                  Icon(
                                    r.type == 'link'
                                        ? Icons.link
                                        : r.type == 'note'
                                            ? Icons.note_outlined
                                            : Icons.fitness_center,
                                    size: 14,
                                    color: Colors.blue,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      r.title,
                                      style: const TextStyle(color: Colors.blue, fontSize: 13, decoration: TextDecoration.underline),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text(' [${r.type}]', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ],
                              ),
                            ),
                          )),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      }),
    );
  }
}
