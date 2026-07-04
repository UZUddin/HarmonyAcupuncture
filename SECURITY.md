# Security Checklist — Harmony Acupuncture (Website Only)

Scope: public site + booking form, backed live by Google Calendar. No
database, no dashboard, no login system — which also means a much smaller
security surface than a typical booking app.

## Already built in
- **No database at all** — nothing to secure, back up, or lock down beyond
  the calendar itself. Her Google Calendar is the only place appointment
  data lives.
- **Google OAuth credentials never touch the browser** — client secret and
  refresh token live only in Render's environment variables.
- **Input validation (zod)** on the booking endpoint — rejects malformed
  emails, bad dates, wrong appointment types before anything reaches
  Google Calendar.
- **Double-booking guard** — re-checks her calendar's free/busy status
  immediately before creating the event, closing the gap where two people
  might grab the same slot seconds apart.
- **Rate limiting** on the booking endpoint (10/hour) plus a general
  API-wide limit, to blunt spam.
- **CORS locked to her real domain** — no other website can call this API.
- **Helmet security headers**, generic error messages to visitors (real
  errors go to Render's logs only).

## The calendar helper dashboard
- Linked from a small "Staff" link in the main site's footer, so she
  never has to remember or save a separate URL — just go to her own
  website and scroll down. This does mean the login *screen* is
  technically reachable by anyone who scrolls to the bottom of the site,
  but that's fine: the passcode still gates everything past that screen,
  and it's rate-limited against guessing.
- Protected by a **single shared passcode**, not a full login system —
  a deliberate simplicity tradeoff since it only controls calendar
  scheduling, not health records.
- The passcode is checked on every request server-side; rate-limited to
  slow down guessing.
- It's stored in her browser's local storage after first entry so she
  doesn't have to retype it constantly — reasonable for something this
  low-stakes, but worth knowing it's not encrypted at rest in the
  browser. Don't reuse this passcode anywhere else.
- **Patient appointments can't be deleted with the same button as her
  personal blocks** — cancelling a patient appointment is a separate,
  clearly-labeled action ("Cancel") from removing her own block ("✕"),
  and the server checks which type of event it actually is before acting,
  so a misclick can't cancel a patient by accident.
- If the passcode ever leaks, just change `ADMIN_PASSCODE` in Render's
  environment variables and it takes effect immediately — no accounts to
  clean up.

## Manual steps for later
1. Keep the Google **client secret** and **refresh token** only in
   Render's environment variables — never in the frontend, never
   committed to git.
2. **Enable 2FA on her Google account** — since that account is now the
   single point of access for the whole scheduling system, this is the
   one security step worth insisting on.
3. HTTPS is automatic on both Netlify and Render — nothing to configure.
4. If she ever changes her Google password or revokes app access, the
   refresh token stops working and bookings will fail until it's
   reissued — worth a quick heads-up to her, and worth you keeping an eye
   on Render's logs occasionally after launch.
