# TODO

## Done
- [x] Backend deployed to Render, `/health` passing
- [x] Frontend deployed to Netlify, loading correctly at root
- [x] Single repo, `frontend`/`backend` folders, both platforms pointed
      at the right subdirectories
- [x] `API_BASE` updated in both `index.html` and
      `harmony-calendar-helper.html`
- [x] Switched calendar auth from OAuth to a Service Account — no expiry,
      no consent screen, no test user cap (see `STRUCTURE.md`)
- [x] Startup validation added for `GOOGLE_SERVICE_ACCOUNT_KEY` /
      `GOOGLE_CALENDAR_ID` — fails with a clear error instead of a
      cryptic crash if either is missing or malformed
- [x] Fixed stored-XSS gap: patient-submitted names are now blocked from
      containing `<`/`>` server-side (`bookings.js`), and
      `harmony-calendar-helper.html` escapes all calendar-derived text
      before rendering it
- [x] Cleaned up `netlify.toml` — removed stale reference to the scrapped
      Supabase-auth dashboard, `noindex` header now correctly targets
      `harmony-calendar-helper.html`
- [x] Docs consolidated: `README.md` + `DEPLOYMENT.md` + `SECURITY.md` →
      `STRUCTURE.md`; `MEETING-WALKTHROUGH.md` → `MEETING.md`

## Next: the meeting with her
See `MEETING.md`. Google Cloud setup is mostly you working inside her
project (she just needs to add you as an IAM Editor); her only real step
is sharing her calendar with the service account's email address.

## After the meeting
- [ ] Create the service account inside her Google Cloud project, get
      the JSON key into Render as `GOOGLE_SERVICE_ACCOUNT_KEY`
- [ ] Have her share her calendar with the service account email
- [ ] Set `GOOGLE_CALENDAR_ID` on Render to her actual email address
      (not `"primary"`)
- [ ] Confirm `ALLOWED_ORIGINS` on Render matches the live Netlify URL
- [ ] Run the smoke tests below with the real calendar connected
- [ ] Add her actual photos and About/TCM content to the site
- [ ] Confirm where hatcm.com is actually registered (not GitHub), then
      do the DNS swap last
- [ ] Change `ADMIN_PASSCODE` from `AzureDuan` to something real, chosen
      *with* her since she's the one typing it
- [ ] Rename `_gitignore` → `.gitignore` and `_env.example` →
      `.env.example` before/when pushing to GitHub, if not already done

## Smoke test before calling it done
- [ ] Submit a real test booking → confirm it appears as an event on the
      actual Google Calendar
- [ ] Block an hour directly in Google Calendar → confirm it disappears
      from the booking widget within a minute
- [ ] Try booking the same slot twice quickly → second attempt should
      get a clear "already booked" message
- [ ] On the Schedule Helper: add a busy block → confirm it shows up on
      the real Google Calendar and disappears from the public booking
      page
- [ ] Try deleting a patient-booked appointment from the Schedule Helper
      → should be refused with a clear message
- [ ] Submit a test booking with an odd name (e.g. containing `<` or an
      apostrophe) → confirm it's rejected or rendered safely in the
      Schedule Helper, not executed