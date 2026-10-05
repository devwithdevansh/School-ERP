class MessageModel {
  final String id;
  final String senderRole; // 'parent' | 'staff'
  final String text;
  final DateTime createdAt;

  const MessageModel({
    required this.id,
    required this.senderRole,
    required this.text,
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) => MessageModel(
        id: (json['_id'] ?? '').toString(),
        senderRole: json['senderRole'] as String? ?? 'parent',
        text: json['text'] as String? ?? '',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      );
}
