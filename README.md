# School ERP

A generic, white-label school ERP cloned from Sunrise Connect: fees + academics in one admin portal.
The backend uses **MongoDB**.

```
School-ERP/
├─ frontend/          React 19 + Vite + Tailwind 4 admin portal (teal theme, dual-sidebar layout)
├─ backend-mongo/     Express + Mongoose (full port of the Sunrise backend, all modules) :3000
├─ mobile/            Flutter parent & teacher app (white-label; see mobile/README.md)
└─ package.json       convenience scripts
```

## Quick start

```bash
npm run install:all

cp backend-mongo/.env.example    backend-mongo/.env      # set MONGODB_URI, JWT_SECRET
npm run seed:mongo && npm run dev:mongo

cp frontend/.env.example frontend/.env
#   VITE_API_PROXY_TARGET=http://127.0.0.1:3000
npm run dev:frontend        # http://localhost:5173
```

Seeded logins (change them; override with `SEED_*` env vars):

| Who | Login | Sees |
|---|---|---|
| Organization admin (platform owner) | `org@platform.local` / `ChangeMe@123` | the **Organization** console only: clients + module licences |
| School admin of the seeded client | `admin@school.local` / `ChangeMe@123` | that school's Fees / ERP modules |

Existing single-school Mongo data: run `node backend-mongo/src/scripts/migrate-tenancy.js` once (assigns everything to a default client and rebuilds indexes).

## Frontend

| Concern | Where |
|---|---|
| School branding (name, logo, address, phone…) | [frontend/src/config/brand.ts](frontend/src/config/brand.ts) + `VITE_SCHOOL_*` env vars |
| Colours / fonts | [frontend/src/index.css](frontend/src/index.css) `@theme` block. Legacy `blue-*`/`indigo-*` Tailwind classes are remapped to the brand palette, so old screens re-theme automatically. |
| Menu structure (modules, groups, items, visibility) | [frontend/src/config/navigation.ts](frontend/src/config/navigation.ts) |
| Layout | [frontend/src/layout/](frontend/src/layout/) |

**Two layouts, one nav registry** (toggle with the panel icon at the bottom of the sidebar, remembered in localStorage):

* **Split** – slim icon rail switches module (ERP / Fees); a second sidebar lists that module's menu.
* **Merged** – one sidebar, each module is a collapsible dropdown.

Both collapse to a slide-over drawer below `lg`.

### Organization admin, clients and module licences (multi-tenant)
One deployment hosts many schools.

* **ORG_ADMIN** – the platform owner. Has no school; signs in to the **Organization** module (`components/org/`) to create clients, switch each client's modules on/off (**Module Licences**), suspend/reactivate a client and reset its admin password. Cannot read any school data (the API answers 403).
* **Client** = one school. Has `enabledModules` (`FEES`, `ERP`, …) and a status (`ACTIVE` / `SUSPENDED`). Its users (ADMIN / STAFF / TEACHER) only ever see its own data.
* To add a licensable module: add it to `constants/modules.js` in the backend, to `LICENSABLE_MODULES` plus a `NAV_MODULES` entry in `navigation.ts`, and gate its routes with `moduleGate('ID')` in the backend's `app.js`.

How it is enforced:

| Layer | Mechanism |
|---|---|
| Login | JWT carries `clientId`; the response carries `client.enabledModules`. Suspended clients cannot sign in or refresh. |
| Data isolation (mongo) | `plugins/tenant.plugin.js` (global Mongoose plugin): adds `clientId`, scopes every find/update/delete/count/aggregate, stamps new docs and makes all unique indexes per-client. Request scope via AsyncLocalStorage. |
| Module access | `moduleGate('FEES' or 'ERP')` in `app.js` blocks a route family when the client lacks the module (or is suspended); changes apply within ~10 s. |
| Frontend menu | `getVisibleModules()` uses `enabledModules` from the login response; the store re-checks `GET /auth/context` every minute, so a revoked module or a suspension reaches signed-in users. |

Known limits: the parent/teacher **mobile** logins look users up by mobile number across all schools (a number used by two schools' parents is ambiguous), and `GET /dashboard/init` still returns fee data to an ERP-only school (route families are gated per module; that bundle is core).

## Backend

Same JSON envelope (`{ success, data, message? }`), same field names (`_id` + camelCase).

| Module | Status |
|---|---|
| Auth (login, refresh, logout), users/staff | ✅ |
| Academic years, fee categories, fee & transport structures | ✅ |
| Students + parents, ledger generation, custom fees | ✅ |
| Collect fee (batch payments, reversals, concessions), receipts | ✅ |
| Unpaid / collection reports, dashboard, audit log, expenses | ✅ |
| Student import (Excel), promotion, transport fix | ✅ |
| Attendance, timetable, exams/results, homework, leave, allocations, chat | ✅ |
| WhatsApp, push notifications, Razorpay, photo upload | ✅ (need keys) |
| Parent / teacher mobile-app login | ✅ |

## Cleanup you should do once

These were copied from the old project before I noticed they should not be, and could not be deleted automatically:

* `backend-mongo/config/` – contains Firebase service-account **secrets** (git-ignored, but delete it and re-add only if you use push notifications).
* `frontend/src/assets/` – Sunrise logos/brand guide (git-ignored, unused).
* `backend-mongo/src/*.bak`, `backend-mongo/src/routes/*.backup`, `frontend/src/components/Sidebar.tsx` (now an empty stub), `frontend/src/main.ts`, `counter.ts`, `style.css` (Vite template leftovers).
