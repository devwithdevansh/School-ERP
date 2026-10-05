import '../../../../core/config/school_brand.dart';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../../../data/models/receipt_model.dart';
import 'receipt_details_controller.dart';

class ReceiptPdfGenerator {
  static String _toIndianWords(double amount) {
    int rupees = amount.truncate();
    int paise = ((amount - rupees) * 100).round();

    String convertPart(int num) {
      if (num == 0) return "";
      const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
      const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

      String below100(int n) => n < 20 ? ones[n] : '${tens[n ~/ 10]}${n % 10 != 0 ? " ${ones[n % 10]}" : ""}';
      String below1000(int n) => n < 100 ? below100(n) : '${ones[n ~/ 100]} Hundred${n % 100 != 0 ? " ${below100(n % 100)}" : ""}';

      String result = "";
      int n = num;
      int crore = n ~/ 10000000;
      n %= 10000000;
      int lakh = n ~/ 100000;
      n %= 100000;
      int thousand = n ~/ 1000;
      n %= 1000;

      if (crore > 0) result += "${below1000(crore)} Crore ";
      if (lakh > 0) result += "${below1000(lakh)} Lakh ";
      if (thousand > 0) result += "${below1000(thousand)} Thousand ";
      if (n > 0) result += below1000(n);

      return result.trim();
    }

    if (rupees == 0 && paise == 0) return "Zero Rupees Only";
    String words = "";
    if (rupees > 0) words += "${convertPart(rupees)} Rupees";
    if (paise > 0) {
      if (rupees > 0) words += " and ";
      words += "${convertPart(paise)} Paise";
    }
    return "$words Only";
  }

  static Future<pw.Document> generatePdf(ReceiptGroup group) async {
    final pdf = pw.Document();

    pw.MemoryImage? logoImage;
    try {
      final ByteData data = await rootBundle.load(SchoolBrand.logoAsset);
      final Uint8List bytes = data.buffer.asUint8List();
      logoImage = pw.MemoryImage(bytes);
    } catch (e) {
      // ignore
    }

    String feeType = "Fee Collection";
    if (group.activeItems.isNotEmpty) {
      final types = group.activeItems.map((e) => e.categoryLabel).toSet().toList();
      feeType = types.join(' & ');
    }

    // Grouping
    final List<Map<String, dynamic>> groupedRows = [];
    if (group.activeItems.length == 1) {
      final item = group.activeItems.first;
      String desc = item.termName.isNotEmpty ? item.termName : item.categoryLabel;
      if (item.termName.isNotEmpty && !item.termName.contains('-')) {
        desc = '${item.categoryLabel} - ${item.termName}';
      }
      groupedRows.add({
        'desc': desc,
        'concession': item.concessionAmount,
        'mode': group.paymentMode,
        'amount': item.amount,
      });
    } else {
      final Map<String, Map<String, dynamic>> buckets = {};
      const monthOrder = ['April','May','June','July','August','September','October','November','December','January','February','March'];
      
      for (final item in group.activeItems) {
        String desc = item.termName.isNotEmpty ? item.termName : item.categoryLabel;
        if (item.termName.isNotEmpty && !item.termName.contains('-')) {
          desc = '${item.categoryLabel} - ${item.termName}';
        }
        
        final match = RegExp(r'^(.+?)\s*-\s*(January|February|March|April|May|June|July|August|September|October|November|December)$', caseSensitive: false).firstMatch(desc);
        
        if (match != null) {
          final prefix = match.group(1)!.trim();
          final month = match.group(2)!;
          final properMonth = month[0].toUpperCase() + month.substring(1).toLowerCase();
          
          if (!buckets.containsKey(prefix)) {
            buckets[prefix] = {'items': <ReceiptModel>[], 'months': <String>[]};
          }
          buckets[prefix]!['items'].add(item);
          buckets[prefix]!['months'].add(properMonth);
        } else {
          if (!buckets.containsKey(desc)) {
            buckets[desc] = {'items': <ReceiptModel>[], 'months': <String>[]};
          }
          buckets[desc]!['items'].add(item);
        }
      }
      
      for (final entry in buckets.entries) {
        final prefix = entry.key;
        final b = entry.value;
        final months = b['months'] as List<String>;
        final items = b['items'] as List<ReceiptModel>;
        
        if (months.isNotEmpty) {
          months.sort((a, b) => monthOrder.indexOf(a).compareTo(monthOrder.indexOf(b)));
          final start = months.first;
          final end = months.last;
          final finalDesc = start == end ? '$prefix - $start' : '$prefix - $start to $end';
          
          groupedRows.add({
            'desc': finalDesc,
            'concession': items.fold<double>(0, (s, i) => s + i.concessionAmount),
            'mode': group.paymentMode,
            'amount': items.fold<double>(0, (s, i) => s + i.amount),
          });
        } else {
          if (items.length == 1) {
            groupedRows.add({
              'desc': prefix,
              'concession': items.first.concessionAmount,
              'mode': group.paymentMode,
              'amount': items.first.amount,
            });
          } else {
            groupedRows.add({
              'desc': prefix,
              'concession': items.fold<double>(0, (s, i) => s + i.concessionAmount),
              'mode': group.paymentMode,
              'amount': items.fold<double>(0, (s, i) => s + i.amount),
            });
          }
        }
      }
    }

    final totalAmount = group.totalAmount;
    final totalConcession = group.activeItems.fold<double>(0.0, (s, item) => s + item.concessionAmount);
    final words = _toIndianWords(totalAmount);
    final receiptNo = group.displayReceiptNumber.toUpperCase();
    final academicYear = group.activeItems.isNotEmpty && group.activeItems.first.academicYear.isNotEmpty 
        ? group.activeItems.first.academicYear 
        : '${group.paidAt.year} - ${group.paidAt.year + 1}';
    final dateStr = '${group.paidAt.day.toString().padLeft(2, '0')} ${['January','February','March','April','May','June','July','August','September','October','November','December'][group.paidAt.month-1]} ${group.paidAt.year}';
    final h = group.paidAt.hour > 12 ? group.paidAt.hour - 12 : (group.paidAt.hour == 0 ? 12 : group.paidAt.hour);
    final ap = group.paidAt.hour >= 12 ? 'PM' : 'AM';
    final timeStr = '${h.toString().padLeft(2, '0')}:${group.paidAt.minute.toString().padLeft(2, '0')} $ap';

    final primaryColor = PdfColor.fromHex('#312e81');
    final secondaryColor = PdfColor.fromHex('#4f46e5');
    final accentColor = PdfColor.fromHex('#f59e0b');
    final textColor = PdfColor.fromHex('#1e293b');
    
    // We will use standard fonts because downloading google fonts can take time and fail.
    // However, if the user wants exact copy, they might want exact fonts, but native PDF fonts are fast.
    
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a5.landscape.copyWith(
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          marginRight: 0,
        ),
        build: (pw.Context context) {
          return pw.Container(
            color: PdfColors.white,
            child: pw.Stack(
              children: [
                // === HEADER ===
                pw.Positioned(
                  top: 0, left: 0, right: 0,
                  child: pw.Container(
                    height: 110,
                    child: pw.Stack(
                      children: [
                        // Right Gold Block
                        pw.Positioned(
                          top: 0, right: 0,
                          child: pw.Container(
                            width: 300,
                            height: 80,
                            color: accentColor,
                            padding: const pw.EdgeInsets.only(right: 28, top: 15),
                            child: pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.end,
                              children: [
                                pw.Text('RECEIPT', style: pw.TextStyle(color: PdfColors.white, fontSize: 24, fontWeight: pw.FontWeight.bold, letterSpacing: 3)),
                                pw.SizedBox(height: 5),
                                pw.Container(
                                  padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: pw.BoxDecoration(
                                    color: PdfColors.white,
                                    borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                                  ),
                                  child: pw.Row(
                                    mainAxisSize: pw.MainAxisSize.min,
                                    children: [
                                      pw.Text('NO: ', style: pw.TextStyle(color: primaryColor, fontSize: 8, fontWeight: pw.FontWeight.bold)),
                                      pw.Container(
                                        constraints: const pw.BoxConstraints(maxWidth: 120),
                                        child: pw.FittedBox(
                                          fit: pw.BoxFit.scaleDown,
                                          alignment: pw.Alignment.centerLeft,
                                          child: pw.Text(receiptNo, style: pw.TextStyle(color: primaryColor, fontSize: 10, fontWeight: pw.FontWeight.bold)),
                                        )
                                      ),
                                    ]
                                  ),
                                )
                              ]
                            )
                          ),
                        ),
                        // Left Navy Block
                        pw.Positioned(
                          top: 0, left: 0,
                          child: pw.Container(
                            width: 400,
                            height: 110,
                            padding: const pw.EdgeInsets.only(left: 28, top: 20),
                            decoration: pw.BoxDecoration(
                              color: primaryColor,
                              borderRadius: const pw.BorderRadius.only(bottomRight: pw.Radius.circular(40)),
                            ),
                            child: pw.Row(
                              crossAxisAlignment: pw.CrossAxisAlignment.center,
                              children: [
                                if (logoImage != null)
                                  pw.Container(
                                    width: 60,
                                    height: 60,
                                    margin: const pw.EdgeInsets.only(right: 15),
                                    padding: const pw.EdgeInsets.all(6),
                                    decoration: const pw.BoxDecoration(
                                      color: PdfColors.white,
                                      shape: pw.BoxShape.circle,
                                    ),
                                    child: pw.Align(
                                      alignment: pw.Alignment.center,
                                      child: pw.SizedBox(
                                        width: 48,
                                        height: 48,
                                        child: pw.Image(
                                          logoImage,
                                          fit: pw.BoxFit.contain,
                                          alignment: pw.Alignment.center,
                                        ),
                                      ),
                                    ),
                                  ),
                                pw.Column(
                                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                                  mainAxisAlignment: pw.MainAxisAlignment.center,
                                  children: [
                                    pw.Text(SchoolBrand.schoolName.toUpperCase(), style: pw.TextStyle(color: PdfColors.white, fontSize: 16, fontWeight: pw.FontWeight.bold)),
                                    pw.SizedBox(height: 3),
                                    pw.Text(SchoolBrand.tagline, style: pw.TextStyle(color: PdfColor.fromHex('#fcd34d'), fontSize: 9, fontWeight: pw.FontWeight.bold)),
                                    pw.SizedBox(height: 5),
                                    pw.Text(SchoolBrand.address, style: pw.TextStyle(color: PdfColor.fromHex('#e2e8f0'), fontSize: 7)),
                                    pw.SizedBox(height: 2),
                                    pw.Text(SchoolBrand.contactLine, style: pw.TextStyle(color: PdfColor.fromHex('#e2e8f0'), fontSize: 7)),
                                  ]
                                )
                              ]
                            )
                          ),
                        ),
                      ]
                    )
                  )
                ),

                // === FOOTER ===
                pw.Positioned(
                  bottom: 0, left: 0, right: 0,
                  child: pw.Container(
                    height: 35,
                    child: pw.Stack(
                      children: [
                        // Left Gold Block
                        pw.Positioned(
                          bottom: 0, left: 0,
                          child: pw.Container(
                            width: 250,
                            height: 25,
                            color: accentColor,
                            padding: const pw.EdgeInsets.only(left: 20, top: 6),
                            child: pw.Text('THANK YOU', style: pw.TextStyle(color: primaryColor, fontSize: 10, fontWeight: pw.FontWeight.bold, letterSpacing: 1)),
                          ),
                        ),
                        // Right Navy Block
                        pw.Positioned(
                          bottom: 0, right: 0,
                          child: pw.Container(
                            width: 400,
                            height: 35,
                            padding: const pw.EdgeInsets.only(left: 45, right: 25, top: 12),
                            decoration: pw.BoxDecoration(
                              color: primaryColor,
                              borderRadius: const pw.BorderRadius.only(topLeft: pw.Radius.circular(18)),
                            ),
                            child: pw.Row(
                              mainAxisAlignment: pw.MainAxisAlignment.end,
                              children: [
                                pw.Text(SchoolBrand.contactLine, style: pw.TextStyle(color: PdfColors.white, fontSize: 8)),
                              ]
                            )
                          )
                        )
                      ]
                    )
                  )
                ),

                // === CONTENT ===
                pw.Positioned(
                  top: 125, left: 30, right: 30, bottom: 45,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      // Info Grid
                      pw.Row(
                        children: [
                          pw.Expanded(
                            child: pw.Container(
                              padding: const pw.EdgeInsets.all(6),
                              decoration: pw.BoxDecoration(
                                color: PdfColor.fromHex('#f8fafd'),
                                border: pw.Border.all(color: PdfColor.fromHex('#e2e8f0')),
                                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                              ),
                              child: pw.Column(
                                crossAxisAlignment: pw.CrossAxisAlignment.start,
                                children: [
                                  pw.Container(
                                    padding: const pw.EdgeInsets.only(bottom: 3),
                                    margin: const pw.EdgeInsets.only(bottom: 5),
                                    decoration: pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: accentColor, width: 1.5))),
                                    child: pw.Text('STUDENT INFORMATION', style: pw.TextStyle(color: primaryColor, fontSize: 8, fontWeight: pw.FontWeight.bold, letterSpacing: 1)),
                                  ),
                                  pw.Row(children: [
                                    pw.SizedBox(width: 50, child: pw.Text('NAME', style: pw.TextStyle(color: PdfColor.fromHex('#64748b'), fontSize: 7, fontWeight: pw.FontWeight.bold))),
                                    pw.Expanded(child: pw.Text(group.studentName.toUpperCase(), style: pw.TextStyle(color: primaryColor, fontSize: 10, fontWeight: pw.FontWeight.bold))),
                                  ]),
                                  pw.SizedBox(height: 3),
                                  pw.Row(children: [
                                    pw.SizedBox(width: 50, child: pw.Text('PERIOD', style: pw.TextStyle(color: PdfColor.fromHex('#64748b'), fontSize: 7, fontWeight: pw.FontWeight.bold))),
                                    pw.Expanded(child: pw.Text(academicYear, style: pw.TextStyle(color: textColor, fontSize: 8))),
                                  ]),
                                  pw.SizedBox(height: 3),
                                  pw.Row(children: [
                                    pw.SizedBox(width: 50, child: pw.Text('FEE TYPE', style: pw.TextStyle(color: PdfColor.fromHex('#64748b'), fontSize: 7, fontWeight: pw.FontWeight.bold))),
                                    pw.Expanded(child: pw.Text(feeType.toUpperCase(), style: pw.TextStyle(color: textColor, fontSize: 8))),
                                  ]),
                                ]
                              )
                            )
                          ),
                          pw.SizedBox(width: 8),
                          pw.Expanded(
                            child: pw.Container(
                              padding: const pw.EdgeInsets.all(6),
                              decoration: pw.BoxDecoration(
                                color: PdfColors.white,
                                border: pw.Border.all(color: PdfColor.fromHex('#e2e8f0')),
                                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                              ),
                              child: pw.Column(
                                crossAxisAlignment: pw.CrossAxisAlignment.start,
                                children: [
                                  pw.Container(
                                    padding: const pw.EdgeInsets.only(bottom: 3),
                                    margin: const pw.EdgeInsets.only(bottom: 5),
                                    decoration: pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: accentColor, width: 1.5))),
                                    child: pw.Text('PAYMENT INFORMATION', style: pw.TextStyle(color: primaryColor, fontSize: 8, fontWeight: pw.FontWeight.bold, letterSpacing: 1)),
                                  ),
                                  pw.Row(children: [
                                    pw.SizedBox(width: 50, child: pw.Text('DATE', style: pw.TextStyle(color: PdfColor.fromHex('#64748b'), fontSize: 7, fontWeight: pw.FontWeight.bold))),
                                    pw.Expanded(child: pw.Text(dateStr, style: pw.TextStyle(color: textColor, fontSize: 8))),
                                  ]),
                                  pw.SizedBox(height: 3),
                                  pw.Row(children: [
                                    pw.SizedBox(width: 50, child: pw.Text('TIME', style: pw.TextStyle(color: PdfColor.fromHex('#64748b'), fontSize: 7, fontWeight: pw.FontWeight.bold))),
                                    pw.Expanded(child: pw.Text(timeStr, style: pw.TextStyle(color: textColor, fontSize: 8))),
                                  ]),
                                  pw.SizedBox(height: 3),
                                  pw.Row(children: [
                                    pw.SizedBox(width: 50, child: pw.Text('STATUS', style: pw.TextStyle(color: PdfColor.fromHex('#64748b'), fontSize: 7, fontWeight: pw.FontWeight.bold))),
                                    pw.Expanded(child: pw.Text('Payment Received', style: pw.TextStyle(color: PdfColor.fromHex('#16a34a'), fontSize: 8, fontWeight: pw.FontWeight.bold))),
                                  ]),
                                ]
                              )
                            )
                          ),
                        ]
                      ),
                      
                      pw.SizedBox(height: 6),

                      // Section Header
                      pw.Row(
                        children: [
                          pw.Container(width: 3, height: 10, color: accentColor),
                          pw.SizedBox(width: 6),
                          pw.Text('PAYMENT DETAILS', style: pw.TextStyle(color: primaryColor, fontSize: 9, fontWeight: pw.FontWeight.bold, letterSpacing: 0.8)),
                        ]
                      ),
                      pw.SizedBox(height: 4),

                      // Table
                      pw.Container(
                        decoration: pw.BoxDecoration(
                          border: pw.Border.all(color: PdfColor.fromHex('#e2e8f0')),
                          borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                        ),
                        child: pw.Column(
                          children: [
                            // Table Header
                            pw.Container(
                              decoration: pw.BoxDecoration(
                                gradient: pw.LinearGradient(
                                  colors: [primaryColor, secondaryColor],
                                  begin: pw.Alignment.topLeft,
                                  end: pw.Alignment.bottomRight,
                                ),
                                borderRadius: const pw.BorderRadius.vertical(top: pw.Radius.circular(5)),
                              ),
                              padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                              child: pw.Row(
                                children: [
                                  pw.SizedBox(width: 25, child: pw.Text('#', textAlign: pw.TextAlign.center, style: pw.TextStyle(color: PdfColors.white, fontSize: 8, fontWeight: pw.FontWeight.bold))),
                                  pw.Expanded(child: pw.Text('DESCRIPTION', style: pw.TextStyle(color: PdfColors.white, fontSize: 8, fontWeight: pw.FontWeight.bold))),
                                  pw.SizedBox(width: 80, child: pw.Text('MODE', textAlign: pw.TextAlign.center, style: pw.TextStyle(color: PdfColors.white, fontSize: 8, fontWeight: pw.FontWeight.bold))),
                                  pw.SizedBox(width: 80, child: pw.Text('AMOUNT (Rs.)', textAlign: pw.TextAlign.right, style: pw.TextStyle(color: PdfColors.white, fontSize: 8, fontWeight: pw.FontWeight.bold))),
                                ]
                              )
                            ),
                            
                            // Table Rows
                            ...groupedRows.asMap().entries.map((e) {
                              final i = e.key;
                              final row = e.value;
                              final isEven = i % 2 == 0;
                              return pw.Container(
                                padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                                decoration: pw.BoxDecoration(
                                  color: isEven ? PdfColor.fromHex('#f8fafc') : PdfColor.fromHex('#ffffff'),
                                  border: pw.Border(bottom: pw.BorderSide(color: PdfColor.fromHex('#e8edf8'), width: 1))
                                ),
                                child: pw.Row(
                                  children: [
                                    pw.SizedBox(width: 25, child: pw.Text('${i + 1}', textAlign: pw.TextAlign.center, style: pw.TextStyle(color: PdfColor.fromHex('#64748b'), fontSize: 8))),
                                    pw.Expanded(child: pw.Row(children: [
                                      pw.Text(row['desc'], style: pw.TextStyle(color: textColor, fontSize: 8, fontWeight: pw.FontWeight.bold)),
                                      if (row['concession'] > 0)
                                        pw.Container(
                                          margin: const pw.EdgeInsets.only(left: 6),
                                          padding: const pw.EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                          decoration: pw.BoxDecoration(
                                            color: PdfColor.fromHex('#fef3c7'),
                                            border: pw.Border.all(color: PdfColor.fromHex('#fcd34d')),
                                            borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                                          ),
                                          child: pw.Text('-${row['concession'].toInt()} Rs. off', style: pw.TextStyle(color: PdfColor.fromHex('#b45309'), fontSize: 6, fontWeight: pw.FontWeight.bold))
                                        )
                                    ])),
                                    pw.SizedBox(width: 80, child: pw.Text(row['mode'].toString().toUpperCase(), textAlign: pw.TextAlign.center, style: pw.TextStyle(color: PdfColor.fromHex('#475569'), fontSize: 8))),
                                    pw.SizedBox(width: 80, child: pw.Text('${row['amount'].toInt()} Rs.', textAlign: pw.TextAlign.right, style: pw.TextStyle(color: primaryColor, fontSize: 8, fontWeight: pw.FontWeight.bold))),
                                  ]
                                )
                              );
                            }),

                            if (groupedRows.isEmpty && group.activeItems.isEmpty)
                              pw.Container(
                                padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                                decoration: pw.BoxDecoration(
                                  color: PdfColor.fromHex('#f8fafc'),
                                  border: pw.Border(bottom: pw.BorderSide(color: PdfColor.fromHex('#e8edf8'), width: 1))
                                ),
                                child: pw.Row(
                                  children: [
                                    pw.SizedBox(width: 25, child: pw.Text('1', textAlign: pw.TextAlign.center, style: pw.TextStyle(color: PdfColor.fromHex('#64748b'), fontSize: 8))),
                                    pw.Expanded(child: pw.Text('Fee Collection', style: pw.TextStyle(color: textColor, fontSize: 8, fontWeight: pw.FontWeight.bold))),
                                    pw.SizedBox(width: 80, child: pw.Text(group.paymentMode.toUpperCase(), textAlign: pw.TextAlign.center, style: pw.TextStyle(color: PdfColor.fromHex('#475569'), fontSize: 8))),
                                    pw.SizedBox(width: 80, child: pw.Text('${totalAmount.toInt()} Rs.', textAlign: pw.TextAlign.right, style: pw.TextStyle(color: primaryColor, fontSize: 8, fontWeight: pw.FontWeight.bold))),
                                  ]
                                )
                              ),

                            if (totalConcession > 0 && groupedRows.isEmpty)
                              pw.Container(
                                padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                                decoration: pw.BoxDecoration(
                                  color: PdfColor.fromHex('#fffbeb'),
                                  border: pw.Border(bottom: pw.BorderSide(color: PdfColor.fromHex('#e8edf8'), width: 1))
                                ),
                                child: pw.Row(
                                  children: [
                                    pw.SizedBox(width: 25),
                                    pw.Expanded(child: pw.Text('✦ Concession Applied', style: pw.TextStyle(color: PdfColor.fromHex('#b45309'), fontSize: 8, fontStyle: pw.FontStyle.italic, fontWeight: pw.FontWeight.bold))),
                                    pw.SizedBox(width: 80),
                                    pw.SizedBox(width: 80, child: pw.Text('-${totalConcession.toInt()} Rs.', textAlign: pw.TextAlign.right, style: pw.TextStyle(color: PdfColor.fromHex('#b45309'), fontSize: 8, fontWeight: pw.FontWeight.bold))),
                                  ]
                                )
                              ),

                            // Table Footer
                            pw.Container(
                              decoration: pw.BoxDecoration(
                                gradient: pw.LinearGradient(
                                  colors: [accentColor, PdfColor.fromHex('#d97706')],
                                  begin: pw.Alignment.topCenter,
                                  end: pw.Alignment.bottomCenter,
                                ),
                                borderRadius: const pw.BorderRadius.vertical(bottom: pw.Radius.circular(5)),
                              ),
                              padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                              child: pw.Row(
                                children: [
                                  pw.Expanded(child: pw.Text('TOTAL PAID', style: pw.TextStyle(color: primaryColor, fontSize: 9, fontWeight: pw.FontWeight.bold, letterSpacing: 1.5))),
                                  pw.Text('${totalAmount.toInt()} Rs.', style: pw.TextStyle(color: primaryColor, fontSize: 11, fontWeight: pw.FontWeight.bold)),
                                ]
                              )
                            )
                          ]
                        )
                      ),

                      // Words Box
                      pw.Container(
                        margin: const pw.EdgeInsets.only(top: 8),
                        padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 10),
                        decoration: pw.BoxDecoration(
                          border: pw.Border(
                            left: pw.BorderSide(color: accentColor, width: 3),
                            top: pw.BorderSide(color: PdfColor.fromHex('#e2e8f0'), width: 1),
                            right: pw.BorderSide(color: PdfColor.fromHex('#e2e8f0'), width: 1),
                            bottom: pw.BorderSide(color: PdfColor.fromHex('#e2e8f0'), width: 1),
                          ),
                          gradient: pw.LinearGradient(
                            colors: [PdfColor.fromHex('#fffbf0'), PdfColors.white],
                            begin: pw.Alignment.centerLeft,
                            end: pw.Alignment.centerRight,
                          ),
                        ),
                        child: pw.Row(
                          children: [
                            pw.Text('Amount in Words: ', style: pw.TextStyle(color: PdfColor.fromHex('#334155'), fontSize: 8, fontWeight: pw.FontWeight.bold)),
                            pw.Text(words, style: pw.TextStyle(color: PdfColor.fromHex('#334155'), fontSize: 8, fontStyle: pw.FontStyle.italic)),
                          ]
                        )
                      ),

                      pw.Spacer(),

                      // Signature
                      pw.Align(
                        alignment: pw.Alignment.bottomRight,
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.center,
                          children: [
                            pw.Text('AUTHORISED SIGNATORY', style: pw.TextStyle(color: primaryColor, fontSize: 8, fontWeight: pw.FontWeight.bold, letterSpacing: 0.5)),
                            pw.SizedBox(height: 15),
                            pw.Container(
                              width: 120,
                              decoration: pw.BoxDecoration(border: pw.Border(top: pw.BorderSide(color: PdfColor.fromHex('#94a3b8'), width: 1.5))),
                              padding: const pw.EdgeInsets.only(top: 4),
                              child: pw.Text('Authorised Signatory', textAlign: pw.TextAlign.center, style: pw.TextStyle(color: PdfColor.fromHex('#94a3b8'), fontSize: 7, fontWeight: pw.FontWeight.bold, letterSpacing: 0.5)),
                            )
                          ]
                        )
                      ),
                    ]
                  )
                )
              ]
            )
          );
        },
      ),
    );

    return pdf;
  }
}
