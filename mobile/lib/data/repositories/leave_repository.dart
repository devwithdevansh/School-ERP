import 'dart:convert';
import '../models/leave_request_model.dart';
import '../models/staff_leave_request_model.dart';
import '../../core/network/api_client.dart';

class LeaveRepository {
  Future<List<LeaveRequestModel>> getLeaveRequests(String studentId) async {
    try {
      final response = await ApiClient.get('/erp/leave?studentId=$studentId');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => LeaveRequestModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('LeaveRepository.getLeaveRequests error: $e');
    }
    return [];
  }

  Future<bool> createLeaveRequest({
    required String studentId,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
  }) async {
    try {
      final response = await ApiClient.post('/erp/leave', {
        'studentId': studentId,
        'startDate': startDate.toIso8601String(),
        'endDate': endDate.toIso8601String(),
        'reason': reason,
      });
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print('LeaveRepository.createLeaveRequest error: $e');
      return false;
    }
  }

  /// Teacher/class-teacher view: leave requests for one class, optionally
  /// filtered by status ('PENDING' | 'APPROVED' | 'REJECTED').
  Future<List<LeaveRequestModel>> getClassLeaveRequests({
    required String standard,
    required String division,
    required String medium,
    String? status,
  }) async {
    try {
      final qs = StringBuffer('?standard=$standard&division=$division&medium=$medium');
      if (status != null) qs.write('&status=$status');
      final response = await ApiClient.get('/erp/leave$qs');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => LeaveRequestModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('LeaveRepository.getClassLeaveRequests error: $e');
    }
    return [];
  }

  Future<bool> updateLeaveStatus(String leaveId, String status, {String? reviewRemarks}) async {
    try {
      final response = await ApiClient.patch('/erp/leave/$leaveId/status', {
        'status': status,
        if (reviewRemarks != null) 'reviewRemarks': reviewRemarks,
      });
      return response.statusCode == 200;
    } catch (e) {
      print('LeaveRepository.updateLeaveStatus error: $e');
      return false;
    }
  }

  /// A teacher/staff member's own leave application (sick/casual/etc.),
  /// separate from the student leave requests they review as a class teacher.
  Future<bool> createStaffLeave({
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    required String type,
  }) async {
    try {
      final response = await ApiClient.post('/erp/leave/staff', {
        'startDate': startDate.toIso8601String(),
        'endDate': endDate.toIso8601String(),
        'reason': reason,
        'type': type,
      });
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print('LeaveRepository.createStaffLeave error: $e');
      return false;
    }
  }

  /// The backend scopes this to the caller's own requests for any non-admin role.
  Future<List<StaffLeaveRequestModel>> getMyStaffLeaves() async {
    try {
      final response = await ApiClient.get('/erp/leave/staff');
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items.map((e) => StaffLeaveRequestModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      print('LeaveRepository.getMyStaffLeaves error: $e');
    }
    return [];
  }
}
