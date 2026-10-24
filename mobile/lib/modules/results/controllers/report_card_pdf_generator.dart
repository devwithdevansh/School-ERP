import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../../../core/config/school_brand.dart';
import '../../../../core/utils/pdf_download_helper.dart';
import '../../../../data/models/exam_result_model.dart';

class ReportCardPdfGenerator {
  static Future<pw.Document> generatePdf({
    required String examName,
    required List<ExamResultModel> subjects,
    required String studentName,
    required String classLabel,
    String? rollNo,
    required num totalMarks,
    required num maxMarks,
    required double percentage,
    required String overallGrade,
    required bool passed,
  }) async {
    final pdf = pw.Document();

    pw.MemoryImage? logoImage;
    try {
      final ByteData data = await rootBundle.load(SchoolBrand.logoAsset);
      final Uint8List bytes = data.buffer.asUint8List();
      logoImage = pw.MemoryImage(bytes);
    } catch (_) {
      // Optional asset fallback
    }

    final primaryColor = PdfColor.fromHex('#1B365D');
    final secondaryColor = PdfColor.fromHex('#2E9E6E');
    final failColor = PdfColor.fromHex('#D9534F');
    final slateDark = PdfColor.fromHex('#1E293B');
    final slateLight = PdfColor.fromHex('#64748B');
    final borderGray = PdfColor.fromHex('#E2E8F0');
    final bgLight = PdfColor.fromHex('#F8FAFC');

    final dateStr = DateFormat('dd MMMM yyyy').format(DateTime.now());

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Container(
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: primaryColor, width: 2),
              borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
            ),
            padding: const pw.EdgeInsets.all(24),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                // 1. Header with optional logo and school info
                pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    if (logoImage != null) ...[
                      pw.Container(
                        width: 58,
                        height: 58,
                        child: pw.Image(logoImage),
                      ),
                      pw.SizedBox(width: 16),
                    ],
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.center,
                        children: [
                          pw.Text(
                            SchoolBrand.schoolName.toUpperCase(),
                            style: pw.TextStyle(
                              color: primaryColor,
                              fontSize: 18,
                              fontWeight: pw.FontWeight.bold,
                              letterSpacing: 1.2,
                            ),
                            textAlign: pw.TextAlign.center,
                          ),
                          if (SchoolBrand.tagline.isNotEmpty) ...[
                            pw.SizedBox(height: 2),
                            pw.Text(
                              SchoolBrand.tagline,
                              style: pw.TextStyle(
                                color: slateLight,
                                fontSize: 9,
                                fontStyle: pw.FontStyle.italic,
                              ),
                              textAlign: pw.TextAlign.center,
                            ),
                          ],
                          if (SchoolBrand.contactLine.isNotEmpty) ...[
                            pw.SizedBox(height: 3),
                            pw.Text(
                              SchoolBrand.contactLine,
                              style: pw.TextStyle(color: slateLight, fontSize: 8),
                              textAlign: pw.TextAlign.center,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),

                pw.SizedBox(height: 14),
                pw.Divider(color: primaryColor, thickness: 1.5),
                pw.SizedBox(height: 8),

                // 2. Exam Title Badge
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                  decoration: pw.BoxDecoration(
                    color: primaryColor,
                    borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                  ),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        'ACADEMIC PERFORMANCE REPORT CARD',
                        style: pw.TextStyle(
                          color: PdfColors.white,
                          fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                          letterSpacing: 1.0,
                        ),
                      ),
                      pw.Text(
                        examName.toUpperCase(),
                        style: pw.TextStyle(
                          color: PdfColors.white,
                          fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),

                pw.SizedBox(height: 14),

                // 3. Student Profile Info Box
                pw.Container(
                  padding: const pw.EdgeInsets.all(12),
                  decoration: pw.BoxDecoration(
                    color: bgLight,
                    border: pw.Border.all(color: borderGray),
                    borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                  ),
                  child: pw.Row(
                    children: [
                      pw.Expanded(
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            _infoRow('Student Name', studentName, slateDark),
                            pw.SizedBox(height: 4),
                            _infoRow('Class & Medium', classLabel, slateDark),
                          ],
                        ),
                      ),
                      pw.SizedBox(width: 20),
                      pw.Expanded(
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            if (rollNo != null && rollNo.isNotEmpty) ...[
                              _infoRow('Roll / Adm No', rollNo, slateDark),
                              pw.SizedBox(height: 4),
                            ],
                            _infoRow('Date Issued', dateStr, slateDark),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                pw.SizedBox(height: 14),

                // 4. Subject Marks Table
                pw.Container(
                  decoration: pw.BoxDecoration(
                    border: pw.Border.all(color: borderGray),
                    borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                  ),
                  child: pw.Column(
                    children: [
                      // Table Header
                      pw.Container(
                        padding: const pw.EdgeInsets.symmetric(vertical: 7, horizontal: 10),
                        decoration: pw.BoxDecoration(
                          color: PdfColor.fromHex('#EAEFF8'),
                          borderRadius: const pw.BorderRadius.only(
                            topLeft: pw.Radius.circular(5),
                            topRight: pw.Radius.circular(5),
                          ),
                        ),
                        child: pw.Row(
                          children: [
                            pw.SizedBox(width: 24, child: pw.Text('#', style: _headerStyle)),
                            pw.Expanded(flex: 4, child: pw.Text('SUBJECT', style: _headerStyle)),
                            pw.Expanded(flex: 2, child: pw.Text('MAX MARKS', textAlign: pw.TextAlign.center, style: _headerStyle)),
                            pw.Expanded(flex: 2, child: pw.Text('PASS MARKS', textAlign: pw.TextAlign.center, style: _headerStyle)),
                            pw.Expanded(flex: 2, child: pw.Text('OBTAINED', textAlign: pw.TextAlign.right, style: _headerStyle)),
                            pw.Expanded(flex: 2, child: pw.Text('STATUS', textAlign: pw.TextAlign.center, style: _headerStyle)),
                          ],
                        ),
                      ),

                      // Rows
                      ...subjects.asMap().entries.map((entry) {
                        final i = entry.key;
                        final sub = entry.value;
                        final isEven = i % 2 == 0;
                        final isPass = sub.isPass;
                        final hasMarks = sub.marksObtained != null;

                        return pw.Container(
                          padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 10),
                          decoration: pw.BoxDecoration(
                            color: isEven ? bgLight : PdfColors.white,
                            border: pw.Border(top: pw.BorderSide(color: borderGray, width: 0.8)),
                          ),
                          child: pw.Row(
                            children: [
                              pw.SizedBox(
                                width: 24,
                                child: pw.Text('${i + 1}', style: pw.TextStyle(color: slateLight, fontSize: 8.5)),
                              ),
                              pw.Expanded(
                                flex: 4,
                                child: pw.Text(
                                  sub.subjectName,
                                  style: pw.TextStyle(color: slateDark, fontSize: 9, fontWeight: pw.FontWeight.bold),
                                ),
                              ),
                              pw.Expanded(
                                flex: 2,
                                child: pw.Text(
                                  sub.isGradeBased ? '—' : '${sub.maxMarks}',
                                  textAlign: pw.TextAlign.center,
                                  style: pw.TextStyle(color: slateDark, fontSize: 8.5),
                                ),
                              ),
                              pw.Expanded(
                                flex: 2,
                                child: pw.Text(
                                  sub.isGradeBased ? '—' : '${sub.passingMarks}',
                                  textAlign: pw.TextAlign.center,
                                  style: pw.TextStyle(color: slateDark, fontSize: 8.5),
                                ),
                              ),
                              pw.Expanded(
                                flex: 2,
                                child: pw.Text(
                                  sub.isGradeBased
                                      ? (sub.gradeObtained ?? '—')
                                      : (hasMarks ? '${sub.marksObtained}' : '—'),
                                  textAlign: pw.TextAlign.right,
                                  style: pw.TextStyle(
                                    color: (hasMarks && !isPass && !sub.isGradeBased) ? failColor : slateDark,
                                    fontSize: 9,
                                    fontWeight: pw.FontWeight.bold,
                                  ),
                                ),
                              ),
                              pw.Expanded(
                                flex: 2,
                                child: pw.Text(
                                  sub.isGradeBased
                                      ? 'GRADED'
                                      : (!hasMarks ? 'PENDING' : (isPass ? 'PASS' : 'FAIL')),
                                  textAlign: pw.TextAlign.center,
                                  style: pw.TextStyle(
                                    color: isPass ? secondaryColor : failColor,
                                    fontSize: 8,
                                    fontWeight: pw.FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),

                pw.SizedBox(height: 14),

                // 5. Aggregate Summary Card
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                  decoration: pw.BoxDecoration(
                    color: bgLight,
                    border: pw.Border.all(color: borderGray),
                    borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                  ),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('TOTAL AGGREGATE', style: pw.TextStyle(color: slateLight, fontSize: 8, letterSpacing: 0.8)),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            '$totalMarks / $maxMarks',
                            style: pw.TextStyle(color: primaryColor, fontSize: 13, fontWeight: pw.FontWeight.bold),
                          ),
                        ],
                      ),
                      pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.center,
                        children: [
                          pw.Text('PERCENTAGE', style: pw.TextStyle(color: slateLight, fontSize: 8, letterSpacing: 0.8)),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            '${percentage.toStringAsFixed(1)}%',
                            style: pw.TextStyle(color: primaryColor, fontSize: 13, fontWeight: pw.FontWeight.bold),
                          ),
                        ],
                      ),
                      pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.center,
                        children: [
                          pw.Text('FINAL GRADE', style: pw.TextStyle(color: slateLight, fontSize: 8, letterSpacing: 0.8)),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            overallGrade,
                            style: pw.TextStyle(
                              color: passed ? secondaryColor : failColor,
                              fontSize: 13,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.end,
                        children: [
                          pw.Text('RESULT STATUS', style: pw.TextStyle(color: slateLight, fontSize: 8, letterSpacing: 0.8)),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            passed ? 'PASSED' : 'NEEDS IMPROVEMENT',
                            style: pw.TextStyle(
                              color: passed ? secondaryColor : failColor,
                              fontSize: 11,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                pw.Spacer(),

                // 6. Signatures & Authenticity Footer
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.center,
                      children: [
                        pw.Container(width: 140, height: 1, color: slateLight),
                        pw.SizedBox(height: 4),
                        pw.Text('Class Teacher Signature', style: pw.TextStyle(color: slateDark, fontSize: 8.5)),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.center,
                      children: [
                        pw.Container(width: 140, height: 1, color: slateLight),
                        pw.SizedBox(height: 4),
                        pw.Text('Principal / Headmaster', style: pw.TextStyle(color: slateDark, fontSize: 8.5, fontWeight: pw.FontWeight.bold)),
                      ],
                    ),
                  ],
                ),

                pw.SizedBox(height: 10),
                pw.Center(
                  child: pw.Text(
                    'This is an official computer-generated student performance report card.',
                    style: pw.TextStyle(color: slateLight, fontSize: 7, fontStyle: pw.FontStyle.italic),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );

    return pdf;
  }

  static pw.Row _infoRow(String label, String value, PdfColor textColor) {
    return pw.Row(
      children: [
        pw.Text('$label: ', style: pw.TextStyle(color: PdfColor.fromHex('#64748B'), fontSize: 8.5)),
        pw.Text(value, style: pw.TextStyle(color: textColor, fontSize: 8.5, fontWeight: pw.FontWeight.bold)),
      ],
    );
  }

  static pw.TextStyle get _headerStyle => pw.TextStyle(
        color: PdfColor.fromHex('#1B365D'),
        fontSize: 8,
        fontWeight: pw.FontWeight.bold,
        letterSpacing: 0.6,
      );

  static Future<void> downloadReportCard({
    required String examName,
    required List<ExamResultModel> subjects,
    required String studentName,
    required String classLabel,
    String? rollNo,
    required num totalMarks,
    required num maxMarks,
    required double percentage,
    required String overallGrade,
    required bool passed,
  }) async {
    try {
      Get.snackbar(
        'Generating Report Card',
        'Please wait while the PDF document is being prepared...',
        snackPosition: SnackPosition.TOP,
        backgroundColor: const Color(0xFFEFF6FF),
        colorText: const Color(0xFF1D4ED8),
        margin: const EdgeInsets.all(16),
        borderRadius: 14,
        duration: const Duration(seconds: 2),
      );

      final pdf = await generatePdf(
        examName: examName,
        subjects: subjects,
        studentName: studentName,
        classLabel: classLabel,
        rollNo: rollNo,
        totalMarks: totalMarks,
        maxMarks: maxMarks,
        percentage: percentage,
        overallGrade: overallGrade,
        passed: passed,
      );

      final pdfBytes = await pdf.save();
      final safeExamName = examName.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
      final fileName = "report_card_${safeExamName}_${DateTime.now().millisecondsSinceEpoch}.pdf";

      await saveAndOpenPdf(pdfBytes, fileName);

      Get.snackbar(
        'Report Card Downloaded!',
        'The report card PDF is ready and opened for viewing and saving.',
        snackPosition: SnackPosition.TOP,
        backgroundColor: const Color(0xFFE8FAF5),
        colorText: const Color(0xFF0FB893),
        margin: const EdgeInsets.all(16),
        borderRadius: 14,
      );
    } catch (e) {
      debugPrint('Error generating report card PDF: $e');
      Get.snackbar(
        'Could Not Download',
        'Something went wrong while creating the report card PDF. Please try again.',
        snackPosition: SnackPosition.TOP,
        backgroundColor: const Color(0xFFFFF0F0),
        colorText: const Color(0xFFDC2626),
        margin: const EdgeInsets.all(16),
        borderRadius: 14,
      );
    }
  }
}
