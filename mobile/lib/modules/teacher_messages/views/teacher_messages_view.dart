import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/ui/ui.dart';
import '../../../data/models/conversation_model.dart';
import '../../../data/models/message_model.dart';
import '../controllers/teacher_messages_controller.dart';

class TeacherMessagesView extends GetView<TeacherMessagesController> {
  const TeacherMessagesView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppPageBar(
        title: 'Messages',
        actions: [
          IconButton(
            icon: const Icon(Icons.person_search_rounded),
            tooltip: 'Message a student\'s parent',
            onPressed: () async {
              final convo = await Get.to<dynamic>(() => const TeacherStudentSearchView());
              if (convo != null) {
                await controller.loadConversations();
                Get.to(() => TeacherThreadView(conversation: convo));
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => controller.loadConversations(),
        color: AppColors.primary,
        child: Obx(() {
          if (controller.isLoading.value) {
            return const Center(child: CircularProgressIndicator());
          }
          final conversations = controller.conversations;
          if (conversations.isEmpty) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.7,
                child: const Center(
                  child: EmptyState(
                    icon: Icons.chat_bubble_outline_rounded,
                    title: 'No messages yet',
                    message: 'Parents will appear here once they message you about their child.',
                  ),
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(Space.lg),
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: conversations.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final c = conversations[i];
              final unread = c.unreadCountStaff;
              return SurfaceCard(
                onTap: () => Get.to(() => TeacherThreadView(conversation: c)),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: AppColors.primaryLight,
                      child: Text(
                        c.parentName.trim().split(' ').map((p) => p.isNotEmpty ? p[0] : '').take(2).join(),
                        style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c.parentName, style: AppTextStyles.labelLarge),
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
          );
        }),
      ),
    );
  }
}

/// Lets a teacher search their own class roster (homeroom + subject
/// classes) and start (or reopen) a conversation with a student's parent.
class TeacherStudentSearchView extends GetView<TeacherMessagesController> {
  const TeacherStudentSearchView({super.key});

  @override
  Widget build(BuildContext context) {
    controller.loadMyStudents();
    final searchController = TextEditingController();
    final query = ''.obs;
    final starting = ''.obs; // studentId currently being started, for a spinner

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const AppPageBar(title: 'Message a parent'),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(Space.lg),
            child: TextField(
              controller: searchController,
              onChanged: (v) => query.value = v.trim().toLowerCase(),
              decoration: const InputDecoration(
                hintText: 'Search your students…',
                prefixIcon: Icon(Icons.search_rounded),
              ),
            ),
          ),
          Expanded(
            child: Obx(() {
              if (controller.isRosterLoading.value) {
                return const Center(child: CircularProgressIndicator());
              }
              final all = controller.myStudents;
              final q = query.value;
              final filtered = q.isEmpty ? all : all.where((s) => s.name.toLowerCase().contains(q)).toList();

              if (all.isEmpty) {
                return const Center(
                  child: EmptyState(
                    icon: Icons.school_outlined,
                    title: 'No students found',
                    message: "You aren't assigned to any class yet.",
                  ),
                );
              }
              if (filtered.isEmpty) {
                return Center(child: Text('No students match "$q"', style: AppTextStyles.bodyMedium));
              }

              return ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: Space.lg),
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, i) {
                  final s = filtered[i];
                  return Obx(() {
                    final isStarting = starting.value == s.id;
                    return SurfaceCard(
                      onTap: isStarting
                          ? null
                          : () async {
                              if (s.parentId == null || s.parentId!.isEmpty) {
                                Get.snackbar('No parent linked', 'This student has no linked parent account yet.');
                                return;
                              }
                              starting.value = s.id;
                              final convo = await controller.startConversationWithStudent(s);
                              starting.value = '';
                              if (convo != null) {
                                Get.back(result: convo);
                              } else {
                                Get.snackbar('Error', 'Could not start the conversation. Please try again.');
                              }
                            },
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.primaryLight,
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: StudentImageWidget(
                              photoUrl: s.photoUrl,
                              width: 40,
                              height: 40,
                              fit: BoxFit.cover,
                              fallback: Center(
                                child: Text(s.initials, style: AppTextStyles.labelSmall.copyWith(color: AppColors.primary)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(s.name, style: AppTextStyles.labelLarge),
                                Text(s.classLabel, style: AppTextStyles.labelSmall.copyWith(color: AppColors.primaryMid)),
                              ],
                            ),
                          ),
                          if (isStarting)
                            const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          else
                            Icon(Icons.chat_bubble_outline_rounded, color: AppColors.inkLight, size: 20),
                        ],
                      ),
                    );
                  });
                },
              );
            }),
          ),
        ],
      ),
    );
  }
}

class TeacherThreadView extends GetView<TeacherMessagesController> {
  final ConversationModel conversation;
  const TeacherThreadView({super.key, required this.conversation});

  @override
  Widget build(BuildContext context) {
    controller.openThread(conversation);
    final textController = TextEditingController();

    return PopScope(
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) controller.closeThread();
      },
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppPageBar(
          title: conversation.parentName,
          subtitle: conversation.studentName != null ? 'About ${conversation.studentName}' : null,
        ),
        body: Column(
          children: [
            Expanded(
              child: Obx(() {
                if (controller.isThreadLoading.value && controller.messages.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (controller.messages.isEmpty) {
                  return Center(
                    child: Text('Say hello — messages appear here.', style: AppTextStyles.bodyMedium),
                  );
                }
                return ListView(
                  reverse: true,
                  padding: const EdgeInsets.all(Space.lg),
                  children: [
                    for (final m in controller.messages.reversed) _ChatBubble(message: m),
                  ],
                );
              }),
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
                          controller: textController,
                          minLines: 1,
                          maxLines: 4,
                          textCapitalization: TextCapitalization.sentences,
                          style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink),
                          decoration: InputDecoration(
                            hintText: 'Type a message…',
                            hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.inkLight),
                            border: InputBorder.none,
                          ),
                          onSubmitted: (text) async {
                            if (await controller.sendMessage(text)) textController.clear();
                          },
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Obx(() => Pressable(
                          onTap: controller.isSending.value
                              ? () {}
                              : () async {
                                  if (await controller.sendMessage(textController.text)) {
                                    textController.clear();
                                  }
                                },
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                            child: controller.isSending.value
                                ? Padding(
                                    padding: EdgeInsets.all(12),
                                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onPrimary),
                                  )
                                : Icon(Icons.send_rounded, color: AppColors.onPrimary, size: 18),
                          ),
                        )),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final MessageModel message;
  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final fromMe = message.senderRole == 'staff';
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
