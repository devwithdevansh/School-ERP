import '../../../../core/config/school_brand.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart' hide GetNumUtils;
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/ui/ui.dart';
import '../controllers/receipt_details_controller.dart';

/// Receipts, styled as a run of ticket stubs — a deliberately different
/// look from the rest of the Fees flow, echoing the perforated-edge feel
/// of a real payment receipt.
class ReceiptDetailsView extends GetView<ReceiptDetailsController> {
  const ReceiptDetailsView({super.key});

  String _fmt(double amount) {
    final digits = amount.abs().round().toString();
    if (digits.length <= 3) return '₹$digits';
    final last3 = digits.substring(digits.length - 3);
    var rest    = digits.substring(0, digits.length - 3);
    final parts = <String>[];
    while (rest.length > 2) {
      parts.insert(0, rest.substring(rest.length - 2));
      rest = rest.substring(0, rest.length - 2);
    }
    if (rest.isNotEmpty) parts.insert(0, rest);
    return '₹${parts.join(',')},$last3';
  }

  String _fmtDateTime(DateTime dt) {
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    final h   = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final min = dt.minute.toString().padLeft(2, '0');
    final ap  = dt.hour >= 12 ? 'PM' : 'AM';
    return '${dt.day} ${m[dt.month - 1]} ${dt.year}  ·  $h:$min $ap';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const AppPageBar(title: 'Receipts'),
      body: RefreshIndicator(
        onRefresh: () => controller.loadReceipts(forceRefresh: true),
        color: AppColors.primaryMid,
        child: Obx(() {
          // ── Loading ──────────────────────────────────────────────────────
          if (controller.isLoading.value && controller.receiptGroups.isEmpty) {
            return Center(child: CircularProgressIndicator(color: AppColors.primaryMid));
          }

          // ── Empty ────────────────────────────────────────────────────────
          if (controller.receiptGroups.isEmpty) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.72,
                child: const Center(
                  child: EmptyState(
                    icon: Icons.receipt_long_rounded,
                    title: 'No receipts yet',
                    message: 'Receipts are generated after payments. Pull down to refresh.',
                  ),
                ),
              ),
            );
          }

          final groups = controller.receiptGroups;
          final totalPaid = groups.fold<double>(0, (s, g) => s + g.totalAmount);

          return CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: _ReceiptsHero(count: groups.length, totalPaid: totalPaid)
                      .animate()
                      .fadeIn(duration: 400.ms)
                      .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final group      = groups[index];
                      final isNewMonth = index == 0 || group.monthLabel != groups[index - 1].monthLabel;

                      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        if (isNewMonth) ...[
                          if (index != 0) const SizedBox(height: 8),
                          Padding(
                            padding: const EdgeInsets.only(left: 4, bottom: 10, top: 4),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primaryDark,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Text(group.monthLabel,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                            ),
                          ),
                        ],
                        _TicketCard(
                          group: group,
                          fmt: _fmt,
                          fmtDateTime: _fmtDateTime,
                          onTap: () => _showReceiptModal(context, group),
                        ),
                        const SizedBox(height: 12),
                      ]).animate().fade(delay: (60 * index).ms).slideX(begin: 0.08, curve: Curves.easeOutQuad);
                    },
                    childCount: groups.length,
                  ),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECEIPT MODAL  — full digital receipt with line items
  // ─────────────────────────────────────────────────────────────────────────
  void _showReceiptModal(BuildContext context, ReceiptGroup group) {
    final isMulti = group.activeItems.length > 1;
    final dtStr   = _fmtDateTime(group.paidAt);

    final totalLedgerAmt = group.activeItems.fold<double>(0.0, (s, item) => s + (item.totalAmount > 0 ? item.totalAmount : item.amount + item.concessionAmount));
    final totalConcession = group.activeItems.fold<double>(0.0, (s, item) => s + item.concessionAmount);
    final totalPaid = group.totalAmount;

    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        backgroundColor: Colors.white,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 620),
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                // ── Header ────────────────────────────────────────────────
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('Digital Receipt', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Brand.night)),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Get.back(),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ]),
                const Divider(color: Color(0xFFE4E8F1)),
                const SizedBox(height: 12),

                // ── School info ───────────────────────────────────────────
                Text(SchoolBrand.schoolName.toUpperCase(),
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Brand.deep, letterSpacing: 0.5),
                    textAlign: TextAlign.center),
                const SizedBox(height: 3),
                Text(SchoolBrand.address,
                    style: TextStyle(fontSize: 11, color: Color(0xFF8491A8)),
                    textAlign: TextAlign.center),

                const SizedBox(height: 18),

                // ── Meta rows ─────────────────────────────────────────────
                _row('Receipt No:', group.displayReceiptNumber),
                const SizedBox(height: 8),
                _row('Student Name:', group.studentName),
                const SizedBox(height: 8),
                if (isMulti && group.monthRangeSummary.isNotEmpty) ...[
                  _row('Period:', group.monthRangeSummary),
                  const SizedBox(height: 8),
                ],
                _row('Payment Date:', dtStr),
                const SizedBox(height: 8),
                _row('Payment Mode:', group.paymentMode.toUpperCase()),
                const SizedBox(height: 8),
                _row('Status:', 'PAID', valueColor: AppColors.teal),

                const SizedBox(height: 16),
                const Divider(color: Color(0xFFE4E8F1)),
                const SizedBox(height: 8),

                // ── Line items ────────────────────────────────────────────
                if (isMulti) ...[
                  const Text('Fee Breakdown',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Brand.night)),
                  const SizedBox(height: 10),
                  ...group.activeItems.map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(children: [
                      Container(
                        width: 28, height: 28,
                        decoration: BoxDecoration(color: AppColors.tealPale, borderRadius: BorderRadius.circular(8)),
                        child: Icon(Icons.receipt_outlined, color: AppColors.teal, size: 14),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(item.termName.isNotEmpty ? item.termName : item.categoryLabel,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Brand.night)),
                        Row(
                          children: [
                            if (item.termName.isNotEmpty)
                              Text(item.categoryLabel,
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF8491A8))),
                            if (item.concessionAmount > 0) ...[
                              if (item.termName.isNotEmpty) const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE6F5EE),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text('Concession: -₹${item.concessionAmount.toInt()}',
                                    style: const TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF2E9E6E))),
                              ),
                            ],
                          ],
                        ),
                      ])),
                      Text(_fmt(item.amount),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Brand.night)),
                    ]),
                  )),
                  const Divider(color: Color(0xFFE4E8F1)),
                ] else ...[
                  _row('Category:', group.categoryLabel),
                  const SizedBox(height: 8),
                  if (group.termSummary.isNotEmpty) ...[
                    _row('Term / Month:', group.termSummary),
                    const SizedBox(height: 8),
                  ],
                  if (totalConcession > 0) ...[
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      const Text('Concession:', style: TextStyle(fontSize: 13, color: Color(0xFF45526B))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F5EE),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('ALLOWED',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF2E9E6E))),
                      ),
                    ]),
                    const SizedBox(height: 8),
                  ],
                  const Divider(color: Color(0xFFE4E8F1)),
                ],

                // ── Concession Summary ────────────────────────────────────
                if (totalConcession > 0) ...[
                  const SizedBox(height: 8),
                  _row('Original Due:', _fmt(totalLedgerAmt)),
                  const SizedBox(height: 6),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Concession Deducted:', style: TextStyle(fontSize: 13, color: Color(0xFF45526B))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE6F5EE),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('-${_fmt(totalConcession)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF2E9E6E))),
                    ),
                  ]),
                  const SizedBox(height: 10),
                  const Divider(color: Color(0xFFE4E8F1)),
                ],

                // ── Total Paid ────────────────────────────────────────────
                const SizedBox(height: 12),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('Total Paid', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Brand.night)),
                  Text(_fmt(totalPaid),
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.teal, letterSpacing: -0.3)),
                ]),

                const SizedBox(height: 20),

                 // ── Download button ───────────────────────────────────────
                ElevatedButton.icon(
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    Get.back();
                    controller.downloadReceiptPdf(group);
                  },
                  icon: const Icon(Icons.download_rounded, color: Colors.white),
                  label: const Text('Download PDF', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Brand.accent,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                  ),
                ),
              ]),
            ),
          ),
        ),
      ).animate().scale(curve: Curves.easeOutBack, duration: 400.ms).fadeIn(duration: 200.ms),
    );
  }

  Widget _row(String label, String value, {Color? valueColor}) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF45526B))),
      Flexible(child: Text(value,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: valueColor ?? Brand.night),
          textAlign: TextAlign.right, overflow: TextOverflow.ellipsis)),
    ]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO — total receipts at a glance
// ─────────────────────────────────────────────────────────────────────────────
class _ReceiptsHero extends StatelessWidget {
  final int count;
  final double totalPaid;
  const _ReceiptsHero({required this.count, required this.totalPaid});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(Radii.lg),
        boxShadow: Elevation.of(SurfaceLevel.floating),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Radii.lg),
        child: Stack(
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Paid this year',
                          style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
                      const SizedBox(height: 6),
                      AmountText(
                        totalPaid,
                        style: AppTextStyles.monoLarge.copyWith(color: Colors.white, fontSize: 26),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                  ),
                  child: Column(
                    children: [
                      Text('$count', style: AppTextStyles.h1.copyWith(color: Colors.white)),
                      Text(count == 1 ? 'receipt' : 'receipts',
                          style: AppTextStyles.labelSmall.copyWith(color: Colors.white70)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKET CARD — a perforated stub instead of a plain list row
// ─────────────────────────────────────────────────────────────────────────────

class _TicketCard extends StatelessWidget {
  const _TicketCard({
    required this.group,
    required this.fmt,
    required this.fmtDateTime,
    required this.onTap,
  });
  final ReceiptGroup group;
  final String Function(double)   fmt;
  final String Function(DateTime) fmtDateTime;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isMulti = group.activeItems.length > 1;
    final subtitleText = isMulti ? group.categoriesSummary : group.termSummary;

    return Pressable(
      onTap: onTap,
      pressedScale: 0.985,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(Radii.lg),
          border: Border.all(color: AppColors.border),
          boxShadow: Elevation.of(SurfaceLevel.raised),
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(children: [
                    Container(
                      width: 42, height: 42,
                      decoration: BoxDecoration(color: AppColors.purplePale, shape: BoxShape.circle),
                      child: Icon(Icons.receipt_rounded, color: AppColors.purple, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(
                        group.monthRangeSummary.isNotEmpty
                            ? group.monthRangeSummary
                            : (isMulti ? 'Multiple Fees' : group.categoryLabel),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.labelLarge,
                      ),
                      if (subtitleText.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitleText,
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.primaryMid,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 2),
                      Text(fmtDateTime(group.paidAt), style: AppTextStyles.bodySmall),
                      if (group.receiptNumber.isNotEmpty)
                        Text('#${group.displayReceiptNumber}',
                            style: AppTextStyles.bodySmall.copyWith(color: AppColors.inkLight)),
                    ])),
                  ]),
                ),
              ),
              const _PerforationDivider(),
              SizedBox(
                width: 92,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(fmt(group.totalAmount),
                            style: AppTextStyles.labelLarge.copyWith(color: AppColors.primaryMid, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 6),
                        Icon(Icons.visibility_outlined, size: 15, color: AppColors.purple),
                        const SizedBox(height: 2),
                        Text('View', style: AppTextStyles.labelSmall.copyWith(color: AppColors.purple, fontSize: 9.5)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A dashed vertical line flanked by two "punched hole" circles — the
/// perforation between a ticket's info stub and its amount stub.
class _PerforationDivider extends StatelessWidget {
  const _PerforationDivider();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 18,
      child: Column(
        children: [
          // Container asserts on negative margins (that crashed this whole
          // screen in debug builds), so nudge the punched holes out past the
          // card edge with a paint-only translate instead.
          Transform.translate(
            offset: const Offset(0, -5.5),
            child: Container(
              width: 11, height: 11,
              decoration: BoxDecoration(
                color: AppColors.bg,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
            ),
          ),
          Expanded(
            child: CustomPaint(painter: _DashPainter(color: AppColors.border)),
          ),
          Transform.translate(
            offset: const Offset(0, 5.5),
            child: Container(
              width: 11, height: 11,
              decoration: BoxDecoration(
                color: AppColors.bg,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DashPainter extends CustomPainter {
  final Color color;
  const _DashPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.4;
    const dashHeight = 4.0, gap = 3.5;
    var y = 0.0;
    final x = size.width / 2;
    while (y < size.height) {
      canvas.drawLine(Offset(x, y), Offset(x, (y + dashHeight).clamp(0, size.height)), paint);
      y += dashHeight + gap;
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.color != color;
}
