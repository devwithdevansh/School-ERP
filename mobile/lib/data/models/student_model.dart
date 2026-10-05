class StudentModel {
  final String id;
  final String name;
  final String phone;
  final String standard;
  final String division;
  final String medium;
  final String photoUrl;
  final String studentCode;
  final String transportType;
  final bool isRTE;

  final String parentName;
  final String? parentId;

  const StudentModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.standard,
    required this.division,
    required this.medium,
    required this.photoUrl,
    required this.studentCode,
    required this.transportType,
    this.isRTE = false,
    this.parentName = '',
    this.parentId,
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    String pName = '';
    String? pId;
    final rawParentId = json['parentId'];
    if (rawParentId is Map) {
      pId = (rawParentId['_id'] ?? '').toString();
    } else if (rawParentId != null) {
      pId = rawParentId.toString();
    }
    if (json['parentName'] != null) {
      pName = json['parentName'].toString();
    } else if (rawParentId is Map) {
      pName = rawParentId['parentName']?.toString() ?? '';
    }

    final rawPhoto = json['photoUrl'] ?? json['photo'] ?? json['profileImage'] ?? json['avatarUrl'] ?? json['avatar'];
    final photoStr = (rawPhoto is String && rawPhoto != 'assets/images/student.png') ? rawPhoto.trim() : '';

    return StudentModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: json['name'] as String? ?? json['studentName'] as String? ?? '',
      phone: (rawParentId is Map ? rawParentId['primaryMobileNumber'] : null)?.toString() ?? (json['phone'] ?? json['primaryMobileNumber'] ?? '').toString(),
      standard: (json['standard'] ?? '').toString(),
      division: json['division'] as String? ?? '',
      medium: json['medium'] as String? ?? 'English',
      photoUrl: photoStr,
      studentCode: json['studentCode'] as String? ?? '',
      transportType: json['transportType'] as String? ?? 'None',
      isRTE: json['isRTE'] == true,
      parentName: pName,
      parentId: pId,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'phone': phone,
        'standard': standard,
        'division': division,
        'medium': medium,
        'photoUrl': photoUrl,
        'studentCode': studentCode,
        'transportType': transportType,
        'isRTE': isRTE,
        'parentName': parentName,
      };

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  String get classLabel => 'Std $standard · $division · $medium Medium';

  bool get hasTransport =>
      transportType.isNotEmpty &&
      transportType.toLowerCase() != 'none';
}
