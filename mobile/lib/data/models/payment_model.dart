class PaymentModel {
  final String id;
  final String feeId;          // ledgerId
  final double amount;
  final String paymentDate;
  final String paymentMode;
  final String transactionId;
  final String receiptNumber;
  final String termName;       // feePeriod from ledger e.g. "June", "Term 1"
  final String feeType;        // feeType from ledger e.g. "TRANSPORT", "TERM", "EDUCATION"
  final String studentName;    // snapshot.studentName from ledger
  final bool isReversal;
  final double concessionAmount;
  final double totalAmount;
  final bool isReversed;
  final String? reversalOf;

  const PaymentModel({
    required this.id,
    required this.feeId,
    required this.amount,
    required this.paymentDate,
    required this.paymentMode,
    required this.transactionId,
    this.receiptNumber = '',
    this.termName = '',
    this.feeType = 'EDUCATION',
    this.studentName = '',
    this.isReversal = false,
    this.concessionAmount = 0.0,
    this.totalAmount = 0.0,
    this.isReversed = false,
    this.reversalOf,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) => PaymentModel(
        id: (json['id'] ?? json['_id'] ?? '').toString(),
        feeId: (json['feeId'] ?? json['ledgerId'] ?? '').toString(),
        amount: ((json['amount'] ?? 0) as num).toDouble(),
        paymentDate: json['paymentDate'] as String? ?? json['createdAt'] as String? ?? '',
        paymentMode: json['paymentMode'] as String? ?? json['method'] as String? ?? 'UPI',
        transactionId: _extractTxnId(json),
        receiptNumber: json['receiptNumber']?.toString() ?? '',
        termName: json['termName'] as String? ?? json['feePeriod'] as String? ?? '',
        feeType: json['feeType'] as String? ?? 'EDUCATION',
        studentName: json['studentName'] as String? ?? '',
        isReversal: json['isReversal'] as bool? ?? false,
        concessionAmount: ((json['concessionAmount'] ?? 0) as num).toDouble(),
        totalAmount: ((json['totalAmount'] ?? 0) as num).toDouble(),
        isReversed: json['isReversed'] as bool? ?? false,
        reversalOf: json['reversalOf'] as String?,
      );

  static String _extractTxnId(Map<String, dynamic> json) {
    if (json['transactionId'] != null) return json['transactionId'].toString();
    final details = json['details'];
    if (details is Map && details['transactionId'] != null) {
      return details['transactionId'].toString();
    }
    return '';
  }

  /// Whether this is a TRANSPORT fee
  bool get isTransport => feeType == 'TRANSPORT';

  /// Human-readable category label
  String get categoryLabel {
    switch (feeType) {
      case 'TRANSPORT': return 'Transport';
      case 'TERM':
      case 'EDUCATION': return 'Education';
      case 'ADMISSION': return 'Admission';
      case 'BAG_KIT': return 'Bag / Kit';
      default: return 'General';
    }
  }

  /// Month name parsed from paymentDate ISO string
  String get monthLabel {
    final dt = DateTime.tryParse(paymentDate);
    if (dt == null) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[dt.month - 1]} ${dt.year}';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'feeId': feeId,
        'amount': amount,
        'paymentDate': paymentDate,
        'paymentMode': paymentMode,
        'transactionId': transactionId,
        'receiptNumber': receiptNumber,
        'termName': termName,
        'feeType': feeType,
        'studentName': studentName,
        'isReversal': isReversal,
        'concessionAmount': concessionAmount,
        'totalAmount': totalAmount,
        'isReversed': isReversed,
        'reversalOf': reversalOf,
      };
}
