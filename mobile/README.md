# School Connect (mobile)

White-label **parent & teacher app** for School ERP — Flutter (GetX). One build can be branded for any school
and works against either backend (`backend-mongo` or `backend-supabase`; the mobile endpoints — parent/teacher
login, attendance, homework, chat… — are Mongo-only today, see `docs/API_CONTRACT.md`).

Parents: fees & receipts, pay online, school updates, homework, attendance, results, timetable, leave, messages.
Teachers: classes, attendance, marks, homework, leave, messages.

## Run

```bash
cd mobile
flutter pub get
flutter run                     # Android emulator -> http://10.0.2.2:3000, iOS sim / web -> http://localhost:3000
flutter run -d chrome           # web preview
```

Start a backend first (`npm run dev:mongo` in the repo root). On a physical device set `BACKEND_URL` to your
machine's LAN address.

## Configure & brand it — no code changes

Everything lives in [`assets/config/app.env`](assets/config/app.env) (bundled with the app, **no secrets**):

| Key | Meaning |
|---|---|
| `BACKEND_URL` | Backend root **without** `/api/v1`. Empty = local dev default |
| `APP_NAME`, `SCHOOL_NAME`, `SCHOOL_TAGLINE` | Shown on login / splash / receipts. Leave `SCHOOL_NAME` empty to use the name the backend reports at login |
| `SCHOOL_WORDMARK`, `SCHOOL_WORDMARK_SUB` | The big word on the splash screen (e.g. `GREENFIELD` / `CONNECT`) |
| `SCHOOL_ADDRESS`, `SCHOOL_PHONE`, `SCHOOL_EMAIL`, `SCHOOL_WEBSITE` | Printed on PDF receipts |
| `RAZORPAY_KEY_ID` | Enables online payments (public key id only — never the secret) |

Any key can be overridden per build without editing the file:

```bash
flutter build apk --dart-define=BACKEND_URL=https://api.myschool.com --dart-define=SCHOOL_NAME="Greenfield Public School"
```

**Colours**: [`lib/core/design/tokens.dart`](lib/core/design/tokens.dart) (brand) → [`lib/core/theme/app_colors.dart`](lib/core/theme/app_colors.dart)
(light/dark roles). Same indigo/violet palette as the web admin. **Logo / icons**: replace `assets/images/logo.png`,
`app_icon.png`, `app_icon_fg.png`, then `dart run flutter_launcher_icons`. **Package id / label**: `android/app/build.gradle.kts`
(`applicationId`), `AndroidManifest.xml` (`android:label`), `ios/Runner/Info.plist`.

## Multi-school (organization admin) integration

Parent/teacher logins return the school (`client: {name, enabledModules}`) and the app keeps it in
[`ClientContext`](lib/core/config/client_context.dart): the school name is shown automatically, and the dashboard hides
what the organization has not licensed (Fees → fee card, receipts, updates; Academics/ERP → homework, attendance, results,
timetable, leave, messages). Backends that do not send it keep everything visible.

## Push notifications (optional)

Off by default — the app runs fine without it and never shows a notification prompt. To enable:

1. Create a Firebase project, then `dart pub global activate flutterfire_cli && flutterfire configure` (run in `mobile/`).
   This replaces the placeholder `lib/firebase_options.dart` and adds `google-services.json` / `GoogleService-Info.plist`.
2. Android: add the Google services Gradle plugin — `id("com.google.gms.google-services") version "4.4.2" apply false` in
   `android/settings.gradle.kts` and `id("com.google.gms.google-services")` in `android/app/build.gradle.kts`.
3. The backend needs its Firebase service account (see `backend-mongo/.env.example`).

Do **not** commit `google-services.json`, signing keys (`*.jks`, `key.properties`) or service-account files.

## Release signing

Create a keystore, put its details in `android/key.properties` (gitignored) and add a `signingConfigs` block to
`android/app/build.gradle.kts`; until then release builds are signed with the debug key.

## What changed from the original Sunrise Connect app

This is a clean, generic clone: no school names, logos, URLs, Firebase project, signing keys or staff credentials are
included, and the old "staff token" workaround is gone (the backend now lets parents call their own student / ledger /
payment routes). New: configurable branding, original emblem + animated mark, indigo/violet theme with tighter corners,
animated gradient headers, gradient buttons, `--dart-define` overrides, per-school module gating.

## Tests

```bash
flutter test
```
