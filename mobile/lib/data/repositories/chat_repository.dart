// lib/data/repositories/chat_repository.dart
// Backs the Messages screens (parent and teacher sides) against
// /api/v1/chat. Every method fails soft (empty list / false / null) so a
// flaky connection never crashes the chat UI.

import 'dart:convert';
import '../models/conversation_model.dart';
import '../models/message_model.dart';
import '../../core/network/api_client.dart';

class ChatRepository {
  Future<List<ConversationModel>> getConversations({String? studentId}) async {
    try {
      final query = studentId != null ? '?studentId=$studentId' : '';
      final response = await ApiClient.get('/chat/conversations$query');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items
            .map((e) => ConversationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      print('ChatRepository.getConversations error: $e');
    }
    return [];
  }

  /// Starts (or reuses) a conversation. Pass [staffId] to message a specific
  /// teacher/staff member, or omit it to message "the office". Parents don't
  /// need to pass [parentId] — the backend infers it from their own token.
  Future<ConversationModel?> createConversation({
    String? parentId,
    String? staffId,
    String? studentId,
    String? subject,
  }) async {
    try {
      final response = await ApiClient.post('/chat/conversations', {
        if (parentId != null) 'parentId': parentId,
        if (staffId != null) 'staffId': staffId,
        if (studentId != null) 'studentId': studentId,
        if (subject != null) 'subject': subject,
      });
      if (response.statusCode == 200 || response.statusCode == 201) {
        final json = jsonDecode(response.body);
        return ConversationModel.fromJson(json['data'] as Map<String, dynamic>);
      }
    } catch (e) {
      print('ChatRepository.createConversation error: $e');
    }
    return null;
  }

  Future<List<MessageModel>> getMessages(String conversationId) async {
    try {
      final response = await ApiClient.get('/chat/conversations/$conversationId/messages');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => MessageModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('ChatRepository.getMessages error: $e');
    }
    return [];
  }

  Future<bool> sendMessage(String conversationId, String text) async {
    try {
      final response = await ApiClient.post(
        '/chat/conversations/$conversationId/messages',
        {'text': text},
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print('ChatRepository.sendMessage error: $e');
      return false;
    }
  }

  Future<void> markRead(String conversationId) async {
    try {
      await ApiClient.post('/chat/conversations/$conversationId/read', {});
    } catch (e) {
      print('ChatRepository.markRead error: $e');
    }
  }
}
