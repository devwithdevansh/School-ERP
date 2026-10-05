import '../../core/constants/fee_status.dart';

class FeeModel {
  final String id;
  final String studentId;
  final String termName;
  final String feeType;
  final double amount;
  final double paidAmount;
  final double concessionAmount;
  final double remainingAmount;
  final String dueDate;
  final String status;
  final String academicYear;

  const FeeModel({
    required this.id,
    required this.studentId,
    required this.termName,
    required this.feeType,
    required this.amount,
    required this.paidAmount,
    required this.concessionAmount,
    required this.remainingAmount,
    required this.dueDate,
    required this.status,
    required this.academicYear,
  });

  factory FeeModel.fromJson(Map<String, dynamic> json) => FeeModel(
        id: (json['id'] ?? json['_id'] ?? '').toString(),
        studentId: (json['studentId'] ?? '').toString(),
        termName: (json['termName'] ?? json['feePeriod'] ?? '').toString(),
        feeType: (json['feeType'] ?? '').toString(),
        amount: ((json['amount'] ?? json['totalAmount'] ?? 0) as num).toDouble(),
        paidAmount: ((json['paidAmount'] ?? 0) as num).toDouble(),
        concessionAmount: ((json['concessionAmount'] ?? 0) as num).toDouble(),
        remainingAmount: ((json['remainingAmount'] ?? 0) as num).toDouble(),
        dueDate: json['dueDate'] as String? ?? '',
        status: json['status'] as String? ?? 'PENDING',
        academicYear: json['academicYear'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'studentId': studentId,
        'termName': termName,
        'feeType': feeType,
        'amount': amount,
        'paidAmount': paidAmount,
        'concessionAmount': concessionAmount,
        'remainingAmount': remainingAmount,
        'dueDate': dueDate,
        'status': status,
        'academicYear': academicYear,
      };

  bool get isPaid      => status == FeeStatus.paid || status == 'WAIVED';
  bool get isPending   => status == FeeStatus.pending;
  bool get isPartial   => status == FeeStatus.partial;
  bool get isOverdue {
    if (isPaid || status == 'CANCELLED') return false;
    if (dueDate.isEmpty) return false;
    final parsed = DateTime.tryParse(dueDate);
    if (parsed == null) return false;
    return parsed.isBefore(DateTime.now());
  }

  /// Effective paid includes concession (relevant for RTE students)
  double get effectivePaid => paidAmount + concessionAmount;
  double get progressRatio => amount > 0 ? effectivePaid / amount : 0;

  bool get isEducation  => feeType == 'EDUCATION';
  bool get isTransport  => feeType == 'TRANSPORT';
  bool get isTerm       => feeType == 'TERM';
  bool get isAdmission  => feeType == 'ADMISSION';
  bool get isBagKit     => feeType == 'BAG_KIT' || feeType == 'OTHER';
}
