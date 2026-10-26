import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/roadmap_milestone_model.dart';
import '../../core/network/api_client.dart';

class CombinedRoadmapResult {
  final List<RoadmapMilestoneModel> allItems;
  final Map<String, List<RoadmapMilestoneModel>> quarters;

  CombinedRoadmapResult({
    required this.allItems,
    required this.quarters,
  });
}

class CalendarRepository {
  /// Fetches structured combined academic roadmap (exams, vacations, milestones, events, holidays).
  /// Falls back to comprehensive built-in academic roadmap data if server returns 404/empty or is unreachable.
  Future<CombinedRoadmapResult> getRoadmap({String? academicYear}) async {
    try {
      final q = academicYear != null && academicYear.isNotEmpty ? '?academicYear=$academicYear' : '';
      final response = await ApiClient.get('/calendar/roadmap$q');

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final data = json['data'] as Map<String, dynamic>?;
        final quartersJson = data?['quarters'] as Map<String, dynamic>?;
        final rawItems = (data?['items'] as List<dynamic>?) ?? [];

        final quartersMap = <String, List<RoadmapMilestoneModel>>{};

        if (quartersJson != null) {
          quartersJson.forEach((qKey, qVal) {
            if (qVal is Map<String, dynamic>) {
              final items = (qVal['items'] as List<dynamic>?) ?? [];
              quartersMap[qKey] = items
                  .map((item) => RoadmapMilestoneModel.fromJson(item as Map<String, dynamic>))
                  .toList();
            }
          });
        }

        List<RoadmapMilestoneModel> allItems = rawItems
            .map((item) => RoadmapMilestoneModel.fromJson(item as Map<String, dynamic>))
            .toList();

        // If backend returned items via quarters only, flatten them
        if (allItems.isEmpty && quartersMap.isNotEmpty) {
          final flat = <RoadmapMilestoneModel>[];
          quartersMap.forEach((_, list) => flat.addAll(list));
          flat.sort((a, b) => a.startDate.compareTo(b.startDate));
          allItems = flat;
        }

        if (allItems.isNotEmpty) {
          return CombinedRoadmapResult(allItems: allItems, quarters: quartersMap);
        }
      }
    } catch (e) {
      debugPrint('CalendarRepository.getRoadmap network error: $e');
    }

    // Always fallback to rich academic roadmap data if remote API returns 404, empty, or fails
    debugPrint('CalendarRepository: Using rich built-in academic roadmap fallback.');
    return _buildFallbackRoadmap(academicYear);
  }

  /// Builds a complete 35-item academic roadmap containing all exams, vacations, celebrations, PTMs, and holidays.
  CombinedRoadmapResult _buildFallbackRoadmap(String? academicYear) {
    final now = DateTime.now();
    int startYr = 2026;
    if (academicYear != null) {
      final matches = RegExp(r'(\d{4})')
          .allMatches(academicYear)
          .map((e) => int.tryParse(e.group(0) ?? ''))
          .whereType<int>()
          .toList();
      if (matches.isNotEmpty) startYr = matches[0];
    }
    final endYr = startYr + 1;

    final rawList = [
      // ══════════════════════════════════════════════════════════════
      // 1. EXAMS & ASSESSMENTS
      // ══════════════════════════════════════════════════════════════
      {
        'id': 'fb_exam_1',
        'title': 'Periodic Assessment 1 (Unit Test 1)',
        'description': 'First formal evaluation covering 25% of syllabus across English, Hindi, Mathematics, Science, and Social Studies.',
        'type': 'EXAM',
        'category': 'ACADEMIC_EXAM',
        'startDate': '$startYr-07-20',
        'endDate': '$startYr-07-25',
        'color': '#EA580C',
        'isSchoolClosed': false,
        'quarter': 'Q2',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_exam_2',
        'title': 'Mid-Term / Half-Yearly Examinations',
        'description': 'Comprehensive mid-year theoretical and practical exams covering 50% cumulative curriculum.',
        'type': 'EXAM',
        'category': 'ACADEMIC_EXAM',
        'startDate': '$startYr-09-15',
        'endDate': '$startYr-09-28',
        'color': '#DC2626',
        'isSchoolClosed': false,
        'quarter': 'Q2',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_exam_3',
        'title': 'Periodic Assessment 2 (Unit Test 2)',
        'description': 'Evaluation of post-midterm units and foundational revision for senior and junior standards.',
        'type': 'EXAM',
        'category': 'ACADEMIC_EXAM',
        'startDate': '$startYr-11-23',
        'endDate': '$startYr-11-28',
        'color': '#EA580C',
        'isSchoolClosed': false,
        'quarter': 'Q3',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_exam_4',
        'title': 'Pre-Board / Model Examinations',
        'description': 'Board exam simulation for graduating batches and comprehensive revision test for classes 1-9.',
        'type': 'EXAM',
        'category': 'ACADEMIC_EXAM',
        'startDate': '$endYr-01-18',
        'endDate': '$endYr-01-28',
        'color': '#B91C1C',
        'isSchoolClosed': false,
        'quarter': 'Q4',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_exam_5',
        'title': 'Practical Examinations & Project Vivas',
        'description': 'Internal lab practicals, computer science viva, and annual arts submission assessments.',
        'type': 'EXAM',
        'category': 'ACADEMIC_EXAM',
        'startDate': '$endYr-02-15',
        'endDate': '$endYr-02-22',
        'color': '#C2410C',
        'isSchoolClosed': false,
        'quarter': 'Q4',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_exam_6',
        'title': 'Annual Final Examinations',
        'description': 'Comprehensive end-of-year academic evaluation determining standard promotions and graduation.',
        'type': 'EXAM',
        'category': 'ACADEMIC_EXAM',
        'startDate': '$endYr-03-01',
        'endDate': '$endYr-03-16',
        'color': '#991B1B',
        'isSchoolClosed': false,
        'quarter': 'Q4',
        'term': 'ANNUAL',
      },

      // ══════════════════════════════════════════════════════════════
      // 2. VACATIONS & BREAKS
      // ══════════════════════════════════════════════════════════════
      {
        'id': 'fb_vac_1',
        'title': 'Summer Vacation',
        'description': 'Annual summer break for students and teaching faculty. School administrative office remains open on weekdays.',
        'type': 'VACATION',
        'category': 'VACATION',
        'startDate': '$startYr-05-15',
        'endDate': '$startYr-06-30',
        'color': '#F59E0B',
        'isSchoolClosed': true,
        'quarter': 'Q1',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_vac_2',
        'title': 'Diwali & Autumn Vacation',
        'description': 'Festival vacation covering Dhanteras, Diwali, Govardhan Puja, and Bhai Dooj holidays.',
        'type': 'VACATION',
        'category': 'VACATION',
        'startDate': '$startYr-10-28',
        'endDate': '$startYr-11-06',
        'color': '#D97706',
        'isSchoolClosed': true,
        'quarter': 'Q3',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_vac_3',
        'title': 'Winter Vacation & Christmas Break',
        'description': 'End-of-year winter break and Christmas holidays for student rejuvenation and family time.',
        'type': 'VACATION',
        'category': 'VACATION',
        'startDate': '$startYr-12-24',
        'endDate': '$endYr-01-02',
        'color': '#0284C7',
        'isSchoolClosed': true,
        'quarter': 'Q3',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_vac_4',
        'title': 'Post-Exam Session Break',
        'description': 'Annual transition break before reopening of the next academic year.',
        'type': 'VACATION',
        'category': 'VACATION',
        'startDate': '$endYr-03-20',
        'endDate': '$endYr-03-31',
        'color': '#0D9488',
        'isSchoolClosed': true,
        'quarter': 'Q4',
        'term': 'ANNUAL',
      },

      // ══════════════════════════════════════════════════════════════
      // 3. SCHOOL CELEBRATIONS & EVENTS
      // ══════════════════════════════════════════════════════════════
      {
        'id': 'fb_evt_1',
        'title': 'Independence Day & Investiture Ceremony',
        'description': 'Flag hoisting ceremony, patriotic cultural presentations, and formal badge investiture of student council.',
        'type': 'EVENT',
        'category': 'NATIONAL_HOLIDAY',
        'startDate': '$startYr-08-15',
        'endDate': '$startYr-08-15',
        'color': '#059669',
        'isSchoolClosed': false,
        'quarter': 'Q2',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_evt_2',
        'title': 'Teacher\'s Day Celebration',
        'description': 'Student-led celebration honoring faculty with special tributes and teacher appreciation awards.',
        'type': 'EVENT',
        'category': 'CULTURAL',
        'startDate': '$startYr-09-05',
        'endDate': '$startYr-09-05',
        'color': '#9333EA',
        'isSchoolClosed': false,
        'quarter': 'Q2',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_evt_3',
        'title': 'Children\'s Day Carnival & Fair',
        'description': 'Fun day filled with carnival games, talent stages, and student-curated food stalls.',
        'type': 'EVENT',
        'category': 'CULTURAL',
        'startDate': '$startYr-11-14',
        'endDate': '$startYr-11-14',
        'color': '#DB2777',
        'isSchoolClosed': false,
        'quarter': 'Q3',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_evt_4',
        'title': 'Annual Sports Day & Athletic Meet',
        'description': 'Three-day inter-house sports competitions: track events, relays, football, basketball, and tug-of-war.',
        'type': 'EVENT',
        'category': 'SPORTS',
        'startDate': '$startYr-12-18',
        'endDate': '$startYr-12-21',
        'color': '#E11D48',
        'isSchoolClosed': false,
        'quarter': 'Q3',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_evt_5',
        'title': 'Annual Cultural Day & Drama Fest',
        'description': 'Grand annual showcase featuring classical dances, choir orchestra, and English & regional theatre.',
        'type': 'EVENT',
        'category': 'CULTURAL',
        'startDate': '$endYr-01-08',
        'endDate': '$endYr-01-10',
        'color': '#7C3AED',
        'isSchoolClosed': false,
        'quarter': 'Q4',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_evt_6',
        'title': 'Republic Day Celebration',
        'description': 'Tricolor flag unfurling, national anthem, march-past parade, and distribution of bravery awards.',
        'type': 'EVENT',
        'category': 'NATIONAL_HOLIDAY',
        'startDate': '$endYr-01-26',
        'endDate': '$endYr-01-26',
        'color': '#059669',
        'isSchoolClosed': false,
        'quarter': 'Q4',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_evt_7',
        'title': 'Science, Robotics & Art Expo',
        'description': 'Interactive STEM models, robotics demonstrations, and fine arts exhibition open to parents and visitors.',
        'type': 'EVENT',
        'category': 'OTHER',
        'startDate': '$endYr-02-06',
        'endDate': '$endYr-02-06',
        'color': '#2563EB',
        'isSchoolClosed': false,
        'quarter': 'Q4',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_evt_8',
        'title': 'Annual Results & Graduation Day',
        'description': 'Report card declaration, merit certificates, student promotions to next standard, and valedictory address.',
        'type': 'EVENT',
        'category': 'ACADEMIC_EXAM',
        'startDate': '$endYr-03-28',
        'endDate': '$endYr-03-28',
        'color': '#10B981',
        'isSchoolClosed': false,
        'quarter': 'Q4',
        'term': 'ANNUAL',
      },

      // ══════════════════════════════════════════════════════════════
      // 4. PARENT-TEACHER MEETINGS (PTM) & CHECKPOINTS
      // ══════════════════════════════════════════════════════════════
      {
        'id': 'fb_ptm_1',
        'title': 'Academic Session Kickoff & Orientation',
        'description': 'Commencement of regular classroom schedules, textbook distribution, and orientation for new students.',
        'type': 'ACADEMIC_MILESTONE',
        'category': 'ACADEMIC_EXAM',
        'startDate': '$startYr-04-01',
        'endDate': '$startYr-04-01',
        'color': '#4F46E5',
        'isSchoolClosed': false,
        'quarter': 'Q1',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_ptm_2',
        'title': 'Parent-Teacher Meeting (PTM 1)',
        'description': 'Initial review of student adjustment, homework routines, and syllabus roadmap with parents.',
        'type': 'PTM',
        'category': 'PTM',
        'startDate': '$startYr-05-09',
        'endDate': '$startYr-05-09',
        'color': '#6366F1',
        'isSchoolClosed': false,
        'quarter': 'Q1',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_ptm_3',
        'title': 'Term 1 Progress Report Distribution & PTM',
        'description': 'One-on-one parent feedback sessions discussing mid-term exam performance and academic goals.',
        'type': 'PTM',
        'category': 'PTM',
        'startDate': '$startYr-10-10',
        'endDate': '$startYr-10-10',
        'color': '#6366F1',
        'isSchoolClosed': false,
        'quarter': 'Q3',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_ptm_4',
        'title': 'Pre-Board Result Review & Counselling PTM',
        'description': 'Board examination strategy consultation, subject weakness analysis, and career guidance.',
        'type': 'PTM',
        'category': 'PTM',
        'startDate': '$endYr-02-02',
        'endDate': '$endYr-02-02',
        'color': '#6366F1',
        'isSchoolClosed': false,
        'quarter': 'Q4',
        'term': 'TERM_2',
      },

      // ══════════════════════════════════════════════════════════════
      // 5. MAJOR NATIONAL & FESTIVAL HOLIDAYS
      // ══════════════════════════════════════════════════════════════
      {
        'id': 'fb_hol_1',
        'title': 'Mahavir Jayanti',
        'description': 'Public holiday on the birth anniversary of Lord Mahavira.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$startYr-04-14',
        'endDate': '$startYr-04-14',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q1',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_hol_2',
        'title': 'Good Friday',
        'description': 'Christian observance commemorating the crucifixion of Jesus Christ.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$startYr-04-18',
        'endDate': '$startYr-04-18',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q1',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_hol_3',
        'title': 'Eid-ul-Fitr',
        'description': 'Celebration marking the conclusion of the holy month of Ramadan.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$startYr-05-02',
        'endDate': '$startYr-05-02',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q1',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_hol_4',
        'title': 'Raksha Bandhan',
        'description': 'Traditional festival celebrating sibling bond and family unity.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$startYr-08-28',
        'endDate': '$startYr-08-28',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q2',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_hol_5',
        'title': 'Janmashtami',
        'description': 'Celebration of the birth of Lord Krishna.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$startYr-09-04',
        'endDate': '$startYr-09-04',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q2',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_hol_6',
        'title': 'Mahatma Gandhi Jayanti',
        'description': 'National holiday honoring the Father of the Nation and champion of non-violence.',
        'type': 'HOLIDAY',
        'category': 'NATIONAL_HOLIDAY',
        'startDate': '$startYr-10-02',
        'endDate': '$startYr-10-02',
        'color': '#059669',
        'isSchoolClosed': true,
        'quarter': 'Q3',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_hol_7',
        'title': 'Dussehra (Vijayadashami)',
        'description': 'Festival commemorating the victory of good over evil.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$startYr-10-20',
        'endDate': '$startYr-10-20',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q3',
        'term': 'TERM_1',
      },
      {
        'id': 'fb_hol_8',
        'title': 'Diwali (Deepavali)',
        'description': 'The festival of lights, joy, and prosperity.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$startYr-11-01',
        'endDate': '$startYr-11-01',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q3',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_hol_9',
        'title': 'Guru Nanak Jayanti',
        'description': 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$startYr-11-24',
        'endDate': '$startYr-11-24',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q3',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_hol_10',
        'title': 'Christmas Day',
        'description': 'Celebration of the nativity of Jesus Christ.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$startYr-12-25',
        'endDate': '$startYr-12-25',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q3',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_hol_11',
        'title': 'Makar Sankranti / Pongal',
        'description': 'Traditional harvest festival celebrating transition of the Sun into Capricorn.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$endYr-01-14',
        'endDate': '$endYr-01-14',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q4',
        'term': 'TERM_2',
      },
      {
        'id': 'fb_hol_12',
        'title': 'Maha Shivratri',
        'description': 'Solemn festival dedicated to Lord Shiva.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$endYr-03-06',
        'endDate': '$endYr-03-06',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q4',
        'term': 'ANNUAL',
      },
      {
        'id': 'fb_hol_13',
        'title': 'Holi (Dhulandi)',
        'description': 'Festival of vibrant colors, harmony, and joy.',
        'type': 'HOLIDAY',
        'category': 'FESTIVAL',
        'startDate': '$endYr-03-23',
        'endDate': '$endYr-03-23',
        'color': '#10B981',
        'isSchoolClosed': true,
        'quarter': 'Q4',
        'term': 'ANNUAL',
      },
    ];

    final items = <RoadmapMilestoneModel>[];
    final quartersMap = <String, List<RoadmapMilestoneModel>>{
      'Q1': [],
      'Q2': [],
      'Q3': [],
      'Q4': [],
    };

    for (final raw in rawList) {
      final s = DateTime.parse(raw['startDate'] as String);
      final e = DateTime.parse(raw['endDate'] as String);

      String statusStr = 'PLANNED';
      if (now.isAfter(e)) {
        statusStr = 'COMPLETED';
      } else if (now.isAfter(s) && now.isBefore(e)) {
        statusStr = 'IN_PROGRESS';
      }

      final model = RoadmapMilestoneModel.fromJson({
        ...raw,
        'status': statusStr,
      });

      items.add(model);
      final q = raw['quarter'] as String? ?? 'Q1';
      quartersMap[q]?.add(model);
    }

    items.sort((a, b) => a.startDate.compareTo(b.startDate));
    return CombinedRoadmapResult(allItems: items, quarters: quartersMap);
  }

  /// Fetches calendar events/holidays with optional filters.
  Future<List<RoadmapMilestoneModel>> getEvents({String? academicYear, String? type}) async {
    try {
      final queryParams = <String>[];
      if (academicYear != null && academicYear.isNotEmpty) {
        queryParams.add('academicYear=$academicYear');
      }
      if (type != null && type.isNotEmpty) {
        queryParams.add('type=$type');
      }

      final queryString = queryParams.isNotEmpty ? '?${queryParams.join('&')}' : '';
      final response = await ApiClient.get('/calendar$queryString');

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final List<dynamic> items = json['data'] ?? [];
        return items
            .map((e) => RoadmapMilestoneModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint('CalendarRepository.getEvents error: $e');
    }
    return [];
  }
}
