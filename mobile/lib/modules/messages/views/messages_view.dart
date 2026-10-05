import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../data/models/conversation_model.dart';
import '../../../data/models/message_model.dart';
import '../../../data/repositories/chat_repository.dart';
import '../../../data/repositories/allocation_repository.dart';
import '../../dashboard/controllers/dashboard_controller.dart';

const _pollInterval = Duration(seconds: 15);

class MessagesView extends StatefulWidget {
  const MessagesView({super.key});

  @override
  State<MessagesView> createState() => _MessagesViewState();
}

class _MessagesViewState extends State<MessagesView> {
  final _repo = ChatRepository();
  List<ConversationModel> _conversations = [];
  bool _loading = true;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(_pollInterval, (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    String? studentId;
    if (Get.isRegistered<DashboardController>()) {
      final ctrl = Get.find<DashboardController>();
      if (ctrl.activeProfile.value != 'teacher') {
        studentId = ctrl.student.value?.id;
      }
    }
    final list = await _repo.getConversations(studentId: studentId);
    if (!mounted) return;
    setState(() {
      _conversations = list;
      _loading = false;
    });
  }

  Future<void> _showNewMessageBottomSheet() async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          padding: const EdgeInsets.all(Space.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('New Message', style: AppTextStyles.h3),
              const SizedBox(height: Space.lg),
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppColors.primaryLight,
                  child: Icon(Icons.business_center_rounded, color: AppColors.primary),
                ),
                title: Text('School Office', style: AppTextStyles.labelLarge),
                subtitle: Text('Admin and Staff', style: AppTextStyles.bodySmall),
                onTap: () {
                  Get.back();
                  _startConversation(staffId: null);
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppColors.tealPale,
                  child: Icon(Icons.person, color: AppColors.teal),
                ),
                title: Text('Class Teacher', style: AppTextStyles.labelLarge),
                subtitle: Text('Message your class teacher', style: AppTextStyles.bodySmall),
                onTap: () async {
                  Get.back();
                  await _startTeacherConversation();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _startTeacherConversation() async {
    if (Get.isRegistered<DashboardController>()) {
      final ctrl = Get.find<DashboardController>();
      if (ctrl.activeProfile.value != 'teacher') {
        final std = ctrl.student.value;
        if (std != null) {
          final allocRepo = AllocationRepository();
          final ay = await allocRepo.getActiveAcademicYearId();
          if (ay != null) {
            final teacher = await allocRepo.getClassTeacherForStudent(ay, std.standard, std.division, std.medium);
            if (teacher != null && teacher['id'] != null) {
              _startConversation(staffId: teacher['id']);
              return;
            }
          }
        }
      }
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("No class teacher assigned.")));
  }

  Future<void> _startConversation({String? staffId}) async {
    String? studentId;
    if (Get.isRegistered<DashboardController>()) {
      final ctrl = Get.find<DashboardController>();
      if (ctrl.activeProfile.value != 'teacher') {
        studentId = ctrl.student.value?.id;
      }
    }
    final convo = await _repo.createConversation(staffId: staffId, studentId: studentId);
    if (convo == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Couldn't start a conversation. Please try again.")),
      );
      return;
    }
    await _load();
    if (!mounted) return;
    Get.to(() => _ThreadView(conversation: convo));
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppPageBar(
        title: 'Messages',
        actions: [
          IconButton(
            icon: Icon(Icons.edit_square, color: AppColors.primary, size: 20),
            onPressed: _showNewMessageBottomSheet,
            tooltip: 'New Message',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _load(),
        color: AppColors.primary,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _conversations.isEmpty
                ? SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: SizedBox(
                      height: MediaQuery.of(context).size.height * 0.7,
                      child: Center(
                        child: EmptyState(
                          icon: Icons.chat_bubble_outline_rounded,
                          title: 'No messages yet',
                          message: 'Start a conversation with the school office or class teacher whenever you have a question.',
                          actionLabel: 'New Message',
                          onAction: _showNewMessageBottomSheet,
                        ),
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: _conversations.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final c = _conversations[i];
                      final unread = c.unreadCountParent;
                      return SurfaceCard(
                        onTap: () async {
                          await Get.to(() => _ThreadView(conversation: c));
                          _load();
                        },
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 22,
                              backgroundColor: AppColors.primaryLight,
                              child: Text(
                                c.counterpartName.trim().split(' ').map((p) => p.isNotEmpty ? p[0] : '').take(2).join(),
                                style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(c.counterpartName, style: AppTextStyles.labelLarge),
                                  if (c.studentName != null)
                                    Text('About ${c.studentName}',
                                        style: AppTextStyles.labelSmall.copyWith(color: AppColors.primaryMid)),
                                  const SizedBox(height: 3),
                                  Text(
                                    c.lastMessagePreview.isEmpty ? 'No messages yet' : c.lastMessagePreview,
                                    style: AppTextStyles.bodySmall,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            if (unread > 0) ...[
                              const SizedBox(width: 8),
                              Container(
                                width: 20,
                                height: 20,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(color: AppColors.accentDeep, shape: BoxShape.circle),
                                child: Text('$unread',
                                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}

class _ThreadView extends StatefulWidget {
  final ConversationModel conversation;
  const _ThreadView({required this.conversation});

  @override
  State<_ThreadView> createState() => _ThreadViewState();
}

class _ThreadViewState extends State<_ThreadView> {
  final _repo = ChatRepository();
  final _controller = TextEditingController();
  List<MessageModel> _messages = [];
  bool _loading = true;
  bool _sending = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    _repo.markRead(widget.conversation.id);
    _poll = Timer.periodic(_pollInterval, (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _poll?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    final messages = await _repo.getMessages(widget.conversation.id);
    if (!mounted) return;
    setState(() {
      _messages = messages;
      _loading = false;
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    final ok = await _repo.sendMessage(widget.conversation.id, text);
    if (ok) {
      _controller.clear();
      await _load();
    }
    if (mounted) setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.conversation;
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppPageBar(
        title: c.counterpartName,
        subtitle: c.studentName != null ? 'About ${c.studentName}' : null,
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Text('Say hello — messages appear here.', style: AppTextStyles.bodyMedium),
                      )
                    : ListView(
                        reverse: true,
                        padding: const EdgeInsets.all(16),
                        children: [
                          for (final m in _messages.reversed) _ChatBubble(message: m),
                        ],
                      ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 4,
                        textCapitalization: TextCapitalization.sentences,
                        style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink),
                        decoration: InputDecoration(
                          hintText: 'Type a message…',
                          hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.inkLight),
                          border: InputBorder.none,
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Pressable(
                    onTap: _sending ? () {} : _send,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                      child: _sending
                          ? Padding(
                              padding: EdgeInsets.all(12),
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                            )
                          : Icon(Icons.send_rounded, color: AppColors.onPrimary, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final MessageModel message;
  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final fromMe = message.senderRole == 'parent';
    final align = fromMe ? Alignment.centerRight : Alignment.centerLeft;
    final bg = fromMe ? AppColors.primary : AppColors.white;
    final fg = fromMe ? AppColors.onPrimary : AppColors.ink;
    final time = TimeOfDay.fromDateTime(message.createdAt.toLocal()).format(context);

    return Align(
      alignment: align,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(12),
            topRight: const Radius.circular(12),
            bottomLeft: Radius.circular(fromMe ? 16 : 4),
            bottomRight: Radius.circular(fromMe ? 4 : 16),
          ),
          border: fromMe ? null : Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(message.text, style: AppTextStyles.bodyMedium.copyWith(color: fg)),
            const SizedBox(height: 4),
            Text(time,
                style: AppTextStyles.labelSmall.copyWith(
                  fontSize: 9,
                  color: fromMe ? AppColors.onPrimary.withValues(alpha: 0.75) : AppColors.inkLight,
                )),
          ],
        ),
      ),
    );
  }
}
