import 'dart:async';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/storage_keys.dart';
import '../../../data/models/conversation_model.dart';
import '../../../data/models/message_model.dart';
import '../../../data/models/student_model.dart';
import '../../../data/repositories/allocation_repository.dart';
import '../../../data/repositories/chat_repository.dart';
import '../../../data/repositories/student_repository.dart';

const _pollInterval = Duration(seconds: 15);

class TeacherMessagesController extends GetxController {
  final _repo = ChatRepository();
  final _allocationRepo = AllocationRepository();
  final _studentRepo = StudentRepository();

  final isLoading = true.obs;
  final conversations = <ConversationModel>[].obs;

  final activeConversation = Rxn<ConversationModel>();
  final isThreadLoading = false.obs;
  final isSending = false.obs;
  final messages = <MessageModel>[].obs;

  // For "search my students and message their parent"
  final isRosterLoading = false.obs;
  final myStudents = <StudentModel>[].obs;
  bool _rosterLoaded = false;

  Timer? _listPoll;
  Timer? _threadPoll;

  @override
  void onInit() {
    super.onInit();
    loadConversations();
    _listPoll = Timer.periodic(_pollInterval, (_) => loadConversations(silent: true));
  }

  @override
  void onClose() {
    _listPoll?.cancel();
    _threadPoll?.cancel();
    super.onClose();
  }

  Future<void> loadConversations({bool silent = false}) async {
    if (!silent) isLoading.value = true;
    final list = await _repo.getConversations();
    conversations.assignAll(list);
    isLoading.value = false;
  }

  Future<void> openThread(ConversationModel conversation) async {
    activeConversation.value = conversation;
    messages.clear();
    await _loadMessages();
    _repo.markRead(conversation.id);
    _threadPoll?.cancel();
    _threadPoll = Timer.periodic(_pollInterval, (_) => _loadMessages(silent: true));
  }

  void closeThread() {
    _threadPoll?.cancel();
    _threadPoll = null;
    activeConversation.value = null;
    messages.clear();
    loadConversations(silent: true);
  }

  Future<void> _loadMessages({bool silent = false}) async {
    final convo = activeConversation.value;
    if (convo == null) return;
    if (!silent) isThreadLoading.value = true;
    final list = await _repo.getMessages(convo.id);
    messages.assignAll(list);
    isThreadLoading.value = false;
  }

  Future<bool> sendMessage(String text) async {
    final convo = activeConversation.value;
    final trimmed = text.trim();
    if (convo == null || trimmed.isEmpty || isSending.value) return false;
    isSending.value = true;
    final ok = await _repo.sendMessage(convo.id, trimmed);
    if (ok) await _loadMessages();
    isSending.value = false;
    return ok;
  }

  /// The teacher's students across every class they teach (homeroom or
  /// subject), for the "search and message a parent" flow. Cached after
  /// the first load; call with forceRefresh to reload after allocations
  /// might have changed.
  Future<void> loadMyStudents({bool forceRefresh = false}) async {
    if (_rosterLoaded && !forceRefresh) return;
    isRosterLoading.value = true;

    final prefs = await SharedPreferences.getInstance();
    final teacherId = prefs.getString(StorageKeys.staffId);
    if (teacherId == null || teacherId.isEmpty) {
      isRosterLoading.value = false;
      return;
    }

    final academicYearId = await _allocationRepo.getActiveAcademicYearId();
    if (academicYearId == null) {
      isRosterLoading.value = false;
      return;
    }

    // Union of homeroom classes and subject-teaching classes — a teacher
    // may only teach one subject in a class without being its class teacher.
    final classAllocations = await _allocationRepo.getMyClasses(academicYearId, teacherId);
    final subjectAllocations = await _allocationRepo.getMySubjectAllocations(academicYearId, teacherId);

    final seenClasses = <String>{};
    final classes = <(String, String, String)>[];
    for (final c in [...classAllocations.map((c) => (c.standard, c.division, c.medium)), ...subjectAllocations.map((s) => (s.standard, s.division, s.medium))]) {
      final key = '${c.$1}|${c.$2}|${c.$3}';
      if (seenClasses.add(key)) classes.add(c);
    }

    final seenStudents = <String>{};
    final roster = <StudentModel>[];
    for (final c in classes) {
      final students = await _studentRepo.getStudentsForClass(standard: c.$1, division: c.$2, medium: c.$3);
      for (final s in students) {
        if (seenStudents.add(s.id)) roster.add(s);
      }
    }
    roster.sort((a, b) => a.name.compareTo(b.name));

    myStudents.assignAll(roster);
    _rosterLoaded = true;
    isRosterLoading.value = false;
  }

  /// Starts (or reuses) a conversation with [student]'s parent, claiming
  /// this teacher as the assignee. Returns the conversation, or null if the
  /// student has no linked parent or the request failed.
  Future<ConversationModel?> startConversationWithStudent(StudentModel student) async {
    if (student.parentId == null || student.parentId!.isEmpty) return null;
    return _repo.createConversation(parentId: student.parentId, studentId: student.id);
  }
}
