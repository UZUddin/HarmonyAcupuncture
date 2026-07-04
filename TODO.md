# TODO

## Done
- [x] Backend deployed to Render, `/health` passing
- [x] Frontend deployed to Netlify, loading correctly at root
- [x] Single repo, `frontend`/`backend` folders, both platforms pointed
      at the right subdirectories
- [x] `API_BASE` updated in both `index.html` and
      `harmony-calendar-helper.html`
- [x] Switched calendar auth from OAuth (refresh token, 7-day expiry in
      Testing mode) to a Service Account — no expiry, no consent screen,
      no test user cap. See `services/googleCalendar.js` and
      `DEPLOYMENT.md` for the new setup steps.

## Next: the meeting with her
See `MEETING-WALKTHROUGH.md`. Now simpler than originally planned —
Google Cloud setup is mostly you working inside her project (she just
needs to add you as an IAM Editor), and her only real step is sharing
her calendar with the service account's email address, same as sharing
it with an assistant.

## After the meeting
- [ ] Create the service account inside her Google Cloud project, get
      the JSON key into Render as `GOOGLE_SERVICE_ACCOUNT_KEY`
- [ ] Have her share her calendar with the service account email
- [ ] Set `GOOGLE_CALENDAR_ID` on Render to her actual email address
      (not "primary")
- [ ] Confirm `ALLOWED_ORIGINS` on Render matches the live Netlify URL
- [ ] Test a real end-to-end booking once the real calendar is connected
- [ ] Add her actual photos and About/TCM content to the site
- [ ] Confirm where hatcm.com is actually registered (not GitHub), then
      do the DNS swap last
- [ ] Change `ADMIN_PASSCODE` from `AzureDuan` to something real, chosen
      *with* her since she's the one typing it
- [ ] Consider translating `HOW-IT-WORKS-FOR-HER.md` to Chinese
