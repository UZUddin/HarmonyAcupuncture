# Harmony Acupuncture Website — Structure, Deployment & Security

Contact um.uddin2003@gmail.com · (770) 843-8466 for any issues (phone is faster).

## Stack at a glance
- **Frontend:** static HTML/CSS/JS on Netlify (`frontend/`)
- **Backend:** Node/Express on Render (`backend/`)
- **Data store:** none. Her Google Calendar IS the database — no Supabase,
  no separate DB to back up or secure.
- **Calendar auth:** Google Cloud Service Account (not user OAuth) — see
  below for why that matters.

## Repo structure
```
harmony-website/              (one GitHub repo)
├── STRUCTURE.md              (this file)
├── TODO.md
├── MEETING.md
├── HOW-IT-WORKS-FOR-HER.md   (client-facing, plain language — keep separate)
├── frontend/
│   ├── index.html
│   ├── harmony-calendar-helper.html
│   └── netlify.toml
└── backend/
    ├── server.js
    ├── package.json
    ├── routes/
    │   ├── bookings.js
    │   └── admin.js
    ├── middleware/
    │   ├── security.js
    │   └── requireAdminPasscode.js
    └── services/
        └── googleCalendar.js
```

## Google Calendar auth — Service Account
Uses a Service Account, not user OAuth. That means no consent screen flow,
no refresh token, no 7-day expiry, no test-user cap — a simpler,
completely different auth mechanism suited to a single-calendar
integration like this one.

**Setup (done once, inside HER Google Cloud project):**
1. console.cloud.google.com → new project under her account → enable
   "Google Calendar API"
2. IAM & Admin → Service Accounts → Create Service Account (any name,
   e.g. "harmony-booking")
3. That service account → Keys tab → Add Key → Create new key → JSON →
   downloads a `.json` file
4. Copy its full contents, minify to one line, paste as
   `GOOGLE_SERVICE_ACCOUNT_KEY` in Render's environment variables
5. Note the service account's email (in the JSON under `client_email`),
   looks like `harmony-booking@her-project.iam.gserviceaccount.com`

**Her only step, ever:** Google Calendar → Settings → her calendar →
"Share with specific people or groups" → Add people and groups → paste
in the service account email → permission **"Make changes to events"** →
Send. Same action as sharing her calendar with an assistant — nothing
Google-Cloud-flavored, no "Allow" click, nothing that expires.

`googleCalendar.js` validates `GOOGLE_SERVICE_ACCOUNT_KEY` and
`GOOGLE_CALENDAR_ID` at startup and throws a clear error if either is
missing or malformed, instead of failing silently or with a cryptic JSON
parse error in Render's logs.

## Deploying the backend → Render
1. Push the whole repo (both folders) to GitHub.
2. Render → New → **Web Service** (not Blueprint — that expects
   `render.yaml` at the repo root, awkward with two folders in one repo).
3. Connect the repo. Under **Root Directory**, enter `backend`.
4. Build command: `npm install`. Start command: `npm start`.
5. Add env vars manually from `.env.example`: `GOOGLE_SERVICE_ACCOUNT_KEY`,
   `GOOGLE_CALENDAR_ID` (her actual email address, not `"primary"`),
   `ALLOWED_ORIGINS`, `ADMIN_PASSCODE`.
6. Deploy, confirm `https://your-service.onrender.com/health` returns
   `{"ok":true}`.

## Deploying the frontend → Netlify
1. Update `API_BASE` in both `index.html` and
   `harmony-calendar-helper.html` to the real Render URL.
2. Netlify → New site from Git → same repo. **Base directory** and
   **Publish directory**: `frontend`.
3. Deploy to the free `.netlify.app` subdomain first for testing.
4. Once approved, update DNS at wherever hatcm.com is actually
   registered to point at Netlify.
5. Update `ALLOWED_ORIGINS` on Render to the real domain, redeploy.
6. Give her the passcode directly, not over text/email — she reaches the
   Schedule Helper via the small "Staff" link in the site footer.

## Security checklist

**Already built in:**
- No database at all — nothing to secure or back up beyond the calendar
  itself.
- Service account credentials never touch the browser — they live only
  in Render's environment variables.
- Input validation (zod) on the booking endpoint — rejects malformed
  emails, bad dates, wrong appointment types, and (as of the latest
  pass) `<`/`>` characters in `full_name` and `chief_complaint`, closing
  off HTML/script injection at the source before it ever reaches a
  calendar event.
- Output escaping in `harmony-calendar-helper.html` — any text rendered
  from the calendar (e.g. `ev.summary`, which originates from a patient's
  submitted name) is passed through `escapeHtml()` before being inserted
  into the page, so even if something unexpected slipped past validation
  it can't execute as script in the dashboard. Validation and escaping
  are two independent layers — neither depends on the other holding.
- Double-booking guard — re-checks her calendar's free/busy status
  immediately before creating an event.
- Rate limiting: 10/hour on the public booking endpoint, 30/15min on the
  admin endpoint, 100/15min general API-wide.
- CORS locked to her real domain via `ALLOWED_ORIGINS`.
- Helmet security headers; generic error messages to visitors (real
  errors go to Render's logs only).
- `.gitignore` excludes `.env`, `.env.local`, and `node_modules/` — no
  secrets committed. (Rename any `_gitignore` from a zip export to
  `.gitignore` before pushing — zip tools sometimes strip the leading dot.)

**The calendar helper dashboard (Schedule Helper):**
- Linked from a small "Staff" link in the main site's footer — she never
  needs to remember a separate URL.
- Protected by a single shared passcode (`ADMIN_PASSCODE`), not a full
  login system — a deliberate simplicity tradeoff since it only controls
  scheduling, not health records.
- Checked server-side on every request; rate-limited against guessing.
- Stored in her browser's `localStorage` after first entry so she isn't
  retyping it constantly — not encrypted at rest in the browser, so
  don't reuse this passcode anywhere else. This is also exactly why the
  output-escaping fix above matters: without it, a malicious booking
  name could have run script with access to that stored passcode.
- Patient appointments can't be deleted with the same button as her
  personal blocks — cancelling a patient appointment ("Cancel") is a
  separate, clearly-labeled action from removing her own block ("✕"),
  and the server checks which type of event it is before acting.
- If the passcode ever leaks: change `ADMIN_PASSCODE` in Render's env
  vars, takes effect immediately, no accounts to clean up.

**Manual steps for her:**
1. Enable 2FA on her Google account — it's now the single point of
   access for the whole scheduling system, worth insisting on.
2. If she ever changes her Google password or revokes the service
   account's calendar access, bookings will fail until it's reissued —
   worth a heads-up, and worth checking Render's logs occasionally after
   launch.
3. HTTPS is automatic on both Netlify and Render — nothing to configure.

## Business hours
Hardcoded in `backend/services/googleCalendar.js` (`BUSINESS_HOURS`):
Mon–Fri 9–18, Sat 9–13, Sun closed. Changing these is a quick code edit,
not a settings screen — see `MEETING.md` for confirming her real hours
with her directly.
