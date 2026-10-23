# Examinations & Results Module: Implementation Plan

Module: School ERP → Academics → Results
Exam types: **Weekly** and **Final**
Core rule: marks can be published only when every student has a mark or is marked Absent. Admin can always publish. Teachers can publish only if their role has the permission.

---

## 1. What I see in the current screen

| Area | Observation | Fix |
|---|---|---|
| Left list | Stuck on "Loading exams…" | Add skeleton loader, empty state ("No exams yet, Create one"), error state with Retry |
| Filters | Only Std + Subject | Add Academic Year, Exam Type (Weekly / Final), Status |
| Right panel | Only an empty state | Turn into a tabbed workspace (Overview, Marks Entry, Results, Publish) |
| Create Exam | Button exists | Make it a 3-step wizard (see UI section) |
| Subject filter | Subject should not filter *exams* | An exam contains many subjects. Move subject selection into the Marks Entry tab |

Keep the master-detail layout (list on the left, workspace on the right). It is a good fit.

---

## 2. Exam lifecycle (status flow)

```
DRAFT → SCHEDULED → MARKS_ENTRY → READY_TO_PUBLISH → PUBLISHED → (LOCKED)
                                        ↑                 |
                                        └──── UNPUBLISH ──┘ (admin only, audit logged)
```

| Status | Meaning |
|---|---|
| Draft | Exam created, schedule incomplete |
| Scheduled | Subjects, dates, max marks set. Visible to teachers |
| Marks Entry | Exam date passed or marks entry opened. Teachers can enter marks |
| Ready to Publish | All students in all subjects have a mark or Absent. Publish button unlocks |
| Published | Visible to students and parents. Marks are read-only unless edit-after-publish is allowed |
| Locked | Academic year closed, nothing can change |

Status should be **computed and stored**. A background check after each marks save moves `MARKS_ENTRY → READY_TO_PUBLISH` automatically.

---

## 3. Weekly vs Final exams

| | Weekly | Final |
|---|---|---|
| Creation | Quick create, can repeat weekly | Full wizard |
| Subjects | Usually 1 or a few | All subjects of the standard |
| Max marks | Small (10, 20, 25) | Large (50, 80, 100) |
| Report card | Shown as a weekly test summary | Full report card |
| Weightage | Optional | Can combine: e.g. 20% weekly average + 80% final |

Optional but strong feature: **"Include weekly in final"**. In the Final exam settings, pick which weekly exams count and their weightage. The result engine computes the combined total.

---

## 4. Database design

```sql
-- Exam (one per type/std/term)
exams
  id, school_id, academic_year_id,
  name,                      -- "Weekly Test 5", "Annual Exam 2026"
  type ENUM('weekly','final'),
  std_id, division_id NULL,  -- NULL = all divisions
  start_date, end_date,
  status ENUM('draft','scheduled','marks_entry','ready','published','locked'),
  allow_teacher_publish BOOLEAN DEFAULT FALSE,   -- set by admin at creation
  published_at, published_by,
  created_by, created_at

-- Subjects inside an exam
exam_subjects
  id, exam_id, subject_id,
  exam_date, start_time, end_time,
  max_marks, pass_marks,
  entry_status ENUM('pending','in_progress','complete'),
  entered_by_teacher_id,
  submitted_at

-- Marks per student per subject
exam_marks
  id, exam_subject_id, student_id,
  marks_obtained DECIMAL(5,2) NULL,
  attendance ENUM('present','absent','exempt') DEFAULT 'present',
  remarks,
  entered_by, updated_at
  UNIQUE (exam_subject_id, student_id)

-- Computed results (cached per student per exam)
exam_results
  id, exam_id, student_id,
  total_marks, max_total, percentage,
  grade, rank, result ENUM('pass','fail','absent','withheld'),
  computed_at

-- Weightage (final including weekly)
exam_weightage
  id, final_exam_id, source_exam_id, weight_percent

-- Audit trail
exam_audit_log
  id, exam_id, exam_subject_id NULL, student_id NULL,
  action,        -- marks_edited, published, unpublished, locked
  old_value, new_value, acted_by, acted_at, reason
```

**A mark is "filled" when** `marks_obtained IS NOT NULL` **or** `attendance IN ('absent','exempt')`.

---

## 5. Permissions (RBAC)

You already have a Roles & Permissions screen, so just add these permission keys:

| Permission | Who by default |
|---|---|
| `exam.create` | Admin, Exam coordinator |
| `exam.edit` | Admin, Exam coordinator |
| `marks.enter` | Subject teacher (only for allocated subjects) |
| `marks.edit_any` | Admin |
| `results.publish` | **Admin only** (always) |
| *(per-exam flag)* `allow_teacher_publish` | Set by admin when creating the exam. Lets allocated teachers publish that exam |
| `results.unpublish` | Admin only |
| `results.edit_after_publish` | Admin only (reason required) |
| `results.view_all` | Admin, Principal |

### Publish decision logic (decided)

We can't label an exam as "small" or "big" in code, so **admin decides per exam**. When creating an exam, admin answers one question: **"Allow teacher to publish marks?"** (Yes / No, default No).

- Admin can always publish any exam.
- A teacher can publish only if that exam has `allow_teacher_publish = true` **and** the teacher is allocated to that exam's class/subject.
- Same rule for weekly and final. No type check.

```js
function canPublish(user, exam) {
  if (exam.status === 'locked') return false;
  if (getMissingMarks(exam).length > 0) return false;   // every student has marks or Absent

  if (user.isAdmin) return true;

  return exam.allowTeacherPublish                        // admin switched it on at creation
      && isAllocatedTo(user, exam);                      // via Teacher Allocation
}
```

Admin can flip the toggle later from the exam's Overview tab (until it is published). Log the change in `exam_audit_log`.

### Recommended: two levels of publishing

1. **Subject-level submit.** A subject teacher finishes entry, then clicks **Submit Marks** (locks their subject).
2. **Exam-level publish.** Someone with `results.publish` pushes the entire exam live.

If you want a simple version first: skip step 1 and let a permitted teacher publish directly.

---

## 6. API endpoints

```
GET    /exams?year=&type=&std=&status=          list with progress counts
POST   /exams                                   create
GET    /exams/:id                               details + subjects
PATCH  /exams/:id                               edit
DELETE /exams/:id                               only if draft

POST   /exams/:id/subjects                      add subject schedule
PATCH  /exam-subjects/:id

GET    /exam-subjects/:id/marks                 student list with marks
PUT    /exam-subjects/:id/marks                 bulk save (autosave)
POST   /exam-subjects/:id/submit                teacher submits subject

GET    /exams/:id/readiness                     { total, filled, missing: [...] }
POST   /exams/:id/publish                       validates permission + readiness
POST   /exams/:id/unpublish                     admin only

GET    /exams/:id/results                       ranks, grades, totals
GET    /results/student/:id                     student-wise history
GET    /exams/:id/report-cards.pdf              bulk PDF
```

`/readiness` is the key endpoint. It drives the progress bars and the Publish button.

```json
{
  "totalStudents": 40,
  "subjects": [
    { "subject": "English", "filled": 40, "absent": 2, "missing": 0 },
    { "subject": "Maths",   "filled": 37, "absent": 0, "missing": 3 }
  ],
  "canPublish": false,
  "blockers": ["Maths: 3 students have no marks"]
}
```

---

## 7. UI plan

### 7.1 Left panel: exam list

- **Type tabs** at the top: `All | Weekly | Final`
- Filters: Academic Year, Std, Status (a dropdown is enough)
- Each exam is a **card**:

```
┌────────────────────────────────┐
│ Annual Exam 2026       [FINAL] │
│ Std 8 · 12 Mar – 24 Mar        │
│ ▓▓▓▓▓▓▓▓░░ 80% marks entered   │
│ ● Marks Entry                  │
└────────────────────────────────┘
```

- Status colors: Draft = grey, Marks Entry = amber, Ready = blue, Published = green
- Search box by exam name
- Proper empty and loading states

### 7.2 Right panel: tabbed workspace

| Tab | Content |
|---|---|
| **Overview** | Exam info, subject schedule table (date, time, max, pass), per-subject entry progress, assigned teacher |
| **Marks Entry** | Subject switcher plus the marks grid (below) |
| **Results** | Student table with total, %, grade, rank, pass/fail. Class stats (average, topper, pass %) |
| **Publish** | Readiness checklist, blockers, Publish button, publish history |

### 7.3 Marks entry grid (most important screen)

```
Subject: [ Maths ▾ ]   Max: 50   Pass: 18        Saved ✓ 2s ago
──────────────────────────────────────────────────────────────
Roll  Student           Marks        Absent   Remarks
 1    Aarav Shah        [ 42 ]        ☐
 2    Diya Patel        [ -- ]        ☑       (disabled input)
 3    Kabir Mehta       [ 51 ]  ⚠ exceeds max 50
──────────────────────────────────────────────────────────────
Filled 38/40 · Absent 1 · Missing 1       [Submit Marks]
```

Features to include:
- **Keyboard flow:** Enter or Tab or ↓ moves to the next student, like a spreadsheet
- **Absent toggle** greys out the marks input
- **Inline validation:** more than max marks gets a red highlight, negative values blocked
- **Autosave** (debounced 1 to 2 s) with a "Saved" indicator, so teachers never lose data
- **Filter chips:** All / Missing / Absent, to find pending students fast
- **Paste from Excel** (bulk paste a column of marks)
- **Excel import/export** template (you already have document generation tooling)
- Rows with missing marks get a subtle amber left border
- Failed students (below pass marks) shown with red text

### 7.4 Publish tab

```
Ready to publish?                          Overall 92%
────────────────────────────────────────────────────
✅ English     40/40 entered
✅ Science     40/40 entered
❌ Maths       37/40: 3 students pending  [View]
✅ Hindi       40/40 entered
────────────────────────────────────────────────────
[ Publish Results ]   ← disabled until all green
Tooltip: "Complete Maths marks to publish"
```

- Publish button **disabled with a clear reason** when blockers exist
- Confirm dialog: "This will make results visible to 40 students/parents. Notify via SMS/WhatsApp?" with a toggle
- If the user lacks permission, show "You don't have publish rights. Ask admin" instead of hiding the button
- After publish: success state, **Unpublish** (admin only), **Download report cards**, **Share**
- Publish history: who, when

### 7.5 Create Exam wizard (3 steps)

1. **Basics:** Name, Type (Weekly / Final), Academic Year, Std, Division(s)
2. **Subjects & Schedule:** Table to add subjects with date, time, max marks, pass marks. **Copy from previous exam** and **Apply same max marks to all** buttons
3. **Settings:** Grading scheme, weightage (final only), teacher assignment (auto from Teacher Allocation), notify teachers toggle, and **"Allow teacher to publish marks"** toggle (default Off, with helper text: "If On, allocated teachers can publish results once all marks are filled")

Weekly shortcut: a **Quick Weekly Test** drawer with only Std, Subject, Date, Max marks. Done in 10 seconds.

### 7.6 Extra UI ideas

- Dashboard cards at the top of the Results page: *Exams in progress · Pending marks · Ready to publish · Published this month*
- Teacher view: "My pending marks" shows only the subjects allocated to them
- Result view for a student: subject-wise bars, rank, trend across weekly exams (line chart)
- Class analytics: subject-wise average, pass %, topper list, bottom performers needing attention
- Color rule: use the existing purple/indigo theme, with green = done, amber = pending, red = blocker

---

## 8. Result calculation engine

On each marks save (or on publish), compute per student:

1. `total = sum(marks)` over present subjects
2. `percentage = total / max_total × 100`
3. `grade` from the grading scale table (A1, A2, B1 ... or A+, A, B...)
4. `result = fail` if any subject is below pass marks (configurable: overall vs per-subject)
5. `rank` by total, with ties sharing a rank
6. Absent students: excluded from rank, result = `absent` (or `withheld`)

Make the grading scale **configurable per school** (`grading_scales` table with min%, max%, grade, grade point).

---

## 9. Edge cases to handle

| Case | Handling |
|---|---|
| New student admitted mid-exam | Appears in the marks list automatically; blocks publish until filled or marked Absent |
| Student left or TC issued | Excluded from the list |
| Absent vs Exempt vs Medical | Use the `attendance` enum. All count as "filled" |
| Teacher changes after submit | Admin reopens the subject, which is audit logged |
| Marks edited after publish | Admin only, reason required, auto-notify, audit log |
| Two teachers editing at once | Row-level `updated_at` check, or "last write wins" with a warning |
| Decimal marks (e.g. 7.5) | Allow with 0.5 step (configurable) |
| Teacher without allocation tries to enter | API returns 403 (check against Teacher Allocation) |
| Exam deleted | Only in Draft. Otherwise archive |

---

## 10. Build phases

### Phase 1: Foundation (3 to 4 days)
- [ ] DB tables: `exams`, `exam_subjects`, `exam_marks`
- [ ] Exam CRUD APIs
- [ ] Fix list loading, empty and error states
- [ ] Create Exam wizard (Final type first)
- [ ] Exam cards plus type tabs and filters

### Phase 2: Marks entry (3 to 4 days)
- [ ] Marks grid with Absent toggle, validation, keyboard nav
- [ ] Autosave plus bulk save API
- [ ] Teacher access scoped via Teacher Allocation
- [ ] Progress calculation (`/readiness`)
- [ ] Excel import/export

### Phase 3: Publish workflow (2 to 3 days)
- [ ] Add permissions to Roles & Permissions
- [ ] Publish tab with readiness checklist and blockers
- [ ] Publish and Unpublish APIs with permission checks
- [ ] Status auto-transitions
- [ ] Audit log

### Phase 4: Results engine (3 days)
- [ ] Grading scale config
- [ ] Result computation plus ranks
- [ ] Results tab (table plus class stats)
- [ ] Weekly exams plus weightage into final

### Phase 5: Output and polish (3 days)
- [ ] Report card PDF (single and bulk)
- [ ] Parent and student portal visibility on publish
- [ ] Notifications (WhatsApp, SMS, in-app)
- [ ] Analytics charts
- [ ] Teacher "My Pending Marks" dashboard

**MVP = Phases 1 to 3.** That gives you create exam, enter marks, and publish with rules. Everything else can ship after.

---

## 11. Suggested folder structure (frontend)

```
modules/exams/
  pages/
    ExamsPage.jsx            // master-detail shell
  components/
    ExamList.jsx
    ExamCard.jsx
    ExamFilters.jsx
    CreateExamWizard/
      StepBasics.jsx
      StepSubjects.jsx
      StepSettings.jsx
    workspace/
      OverviewTab.jsx
      MarksEntryTab.jsx
      MarksGrid.jsx
      ResultsTab.jsx
      PublishTab.jsx
      ReadinessChecklist.jsx
  hooks/
    useExams.js
    useMarksAutosave.js
    usePublishPermission.js
  api/
    exams.api.js
```

---

## 12. Quick decisions to confirm

1. ~~Who can publish?~~ **Decided:** admin by default. Per-exam toggle "Allow teacher to publish marks" set at creation. Still open: when a teacher publishes, is it the whole exam or only their own subject?
2. Should **weekly marks count** towards the final result?
3. Is the grading system marks %, grades, or both?
4. Should a failed or absent student's result be **withheld** or shown as-is?
5. Notify parents on publish via **WhatsApp**, SMS, or only in-app?

Once these are fixed, the schema above will not need big changes.
