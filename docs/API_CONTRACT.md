# API contract (frontend ⇄ backend)

Base path `/api/v1`. JSON envelope: `{ "success": true, "data": …, "message"?: "…" }`
(academic-years / fee-categories / expenses use `{ "status": "success", "data": … }` – the frontend reads `.data` from both).
Auth: `Authorization: Bearer <accessToken>`; roles `ORG_ADMIN | ADMIN | STAFF | TEACHER`. JWT payload `{id, role, clientId}` (`clientId` absent for ORG_ADMIN); every school record is scoped to its client (see README, "Organization admin, clients and module licences").
Every entity has `_id` (string) and camelCase fields. Timestamps are ISO strings.

## Minimum a backend must implement for the admin portal to work

| Method & path | Notes |
|---|---|
| `POST /auth/portal/login` | body `{email, password}` (email **or** phone) → `{accessToken, refreshToken, user:{name, role}}`. JWT payload `{id, role}`. |
| `GET /auth/context` | `{user:{name,email,role}, client:{id,name,code,status,enabledModules} or null}` — refreshes the menu / detects suspension (403). Login responses also include `client`. |
| `POST /auth/refresh` | body `{domain:'user', userId, refreshToken}` → new `{accessToken, refreshToken}` (rotating) |
| `POST /auth/logout`, `/auth/logout-all` | |
| `GET /dashboard/init` | bundle: `students` (with `parentId` populated: `{_id,parentName,primaryMobileNumber,secondaryMobileNumber,allowOtpReset}`), `ledgers`, `transactions` (payments + `feePeriod, feeType, studentName, academicYear, totalAmount, isReversed`), `feeStructures`, `transportStructures`, `auditLogs` (`performedBy` populated), `academicYears`, `feeCategories`, `users` |
| `GET /dashboard/sync-state` → `{timestamp}` (ms of latest audit log); `GET /dashboard/metrics?date=` | |
| `GET /reports/unpaid` | `[ {_id: studentId, studentName, standard, division, rollNumber, totalPendingAmount, pendingLedgers:[{_id,status,feePeriod,feeType,academicYear,remainingAmount,totalAmount}], lastPaidDate} ]` |
| `GET/POST/PUT/DELETE /academic-years`, `/fee-categories` | |
| `GET/POST/PUT/DELETE /fee-structures`, `/fee-structures/transport`, `POST /fee-structures/copy` | |
| `GET/POST/PATCH/DELETE /students`, `POST /students/:id/restore|regenerate-ledgers|custom-fee`, `GET /parents/check-mobile` | |
| `GET /ledgers?studentId=`, `POST /ledgers/:id/concession` | |
| `GET /payments?studentId=`, `POST /payments/batch`, `POST /payments/:id/reverse` | payments must be applied atomically and receipt numbers issued per academic year |
| `GET/POST /users`, `PATCH /users/:id/toggle-status|reset-password`, `PUT /users/:id/teacher-profile`, `DELETE /users/:id` | |
| `GET/POST /expenses`, `POST /expenses/:id/reverse`, `DELETE /expenses/:id` | |
| `GET /academic-master/subjects|curriculum` | may return `[]` |

## Organization API (ORG_ADMIN only, `/api/v1/organization`)

| Method & path | Notes |
|---|---|
| `GET /modules` | module catalogue `[{id,label,description}]` |
| `GET /clients`, `GET /clients/:id` | `{_id,name,code,status,enabledModules,contactName,contactEmail,contactPhone,address,notes,createdAt,userCount,studentCount}` (+ `admins` on `:id`) |
| `POST /clients` | `{name, code?, enabledModules[], contact*, admin:{name,email,password}}` → creates the client, its first school ADMIN, default academic year + fee categories |
| `PATCH /clients/:id` | any of `name, status (ACTIVE or SUSPENDED), enabledModules, contact*, address, notes` |
| `POST /clients/:id/reset-admin-password` | `{password, adminId?}` |

Route families are licensed per module — **FEES**: ledgers, payments, fee-structures, fee-categories, reports, expenses, notifications, whatsapp, migration. **ERP**: `/erp/*`, attendance, chat. Core (students, parents, users, academic-years, academic-master, dashboard, audit, upload) only needs an ACTIVE client. A blocked call answers 403.

Everything under `/erp/*`, `/attendance`, `/chat`, `/notifications`, `/whatsapp`, `/upload/*` is only needed by the
matching ERP screens; a backend that has not ported them should answer `501` (backend-supabase does).

Reference implementation: `backend-mongo`. Field-level shapes: see its `models/`, or the SQL in
`backend-supabase/supabase/migrations/0001_core.sql` (snake_case there; `utils/case.js` converts).
