# Deployment Walkthrough (Website + Live Google Calendar Booking)

No database to set up — this is the whole reason the architecture got
simpler. One GitHub repo (two folders inside it), one Render service, one
Netlify site, plus one Google Calendar authorization.

## 0. Repo structure
One repo, two folders — Netlify and Render each get pointed at their own
subfolder, so there's nothing to keep in sync between separate repos.

```
harmony-website/              (one GitHub repo)
├── harmony-frontend/
│   ├── harmony-acupuncture.html
│   ├── harmony-calendar-helper.html
│   └── netlify.toml
└── harmony-backend/
    ├── server.js
    ├── package.json
    ├── routes/
    ├── middleware/
    └── services/
```

## 1. Google Calendar (you do the technical setup; she does one click)
1. console.cloud.google.com → new project → enable "Google Calendar API".
2. Credentials → OAuth client ID → "Web application" → add the redirect
   URI (matches `GOOGLE_REDIRECT_URI`).
3. Configure the OAuth consent screen (External is fine; add her email as
   a test user while in testing mode).
4. Do the one-time consent flow AS HER to get a refresh token — send her
   the Google sign-in link, she clicks "Allow" once, and you capture the
   refresh token (easiest via Google's OAuth Playground:
   developers.google.com/oauthplayground — use your client ID/secret in
   the gear icon, authorize the Calendar scope).
5. Put that refresh token in `GOOGLE_REFRESH_TOKEN`.

That single "Allow" click is the only technical thing she ever does.

## 2. Backend → Render
1. Push the whole repo (both folders) to GitHub.
2. Render → New → **Web Service** (not Blueprint — Blueprint expects
   `render.yaml` at the repo root, which gets awkward with two folders
   in one repo).
3. Connect the repo. Under **Root Directory**, enter `harmony-backend`.
4. Build command: `npm install`. Start command: `npm start`.
5. Add env vars manually in Render's dashboard, from `.env.example`
   (including `ADMIN_PASSCODE` for the Schedule Helper dashboard — use
   `AzureDuan` for now per the current plan, change it before real use,
   see TODO.md).
6. Deploy, confirm `https://your-service.onrender.com/health` returns
   `{"ok":true}`.

(`render.yaml` can stay in `harmony-backend/` as a reference — Render's
Web Service flow above doesn't read it, but it documents the config.)

## 3. Frontend → Netlify
1. Update `API_BASE` in both `harmony-acupuncture.html` (patient site) and
   `harmony-calendar-helper.html` (her schedule dashboard) to the real
   Render URL from step 2.
2. Netlify → New site from Git → same repo. Under **Base directory** AND
   **Publish directory**, enter `harmony-frontend` (it's static HTML, no
   build command needed).
3. Deploy to the free `.netlify.app` subdomain first for testing.
   `harmony-acupuncture.html` links to `harmony-calendar-helper.html` via
   a small "Staff" link in the footer — since both files live in the same
   `harmony-frontend` folder, that relative link resolves correctly once
   deployed.
4. Once approved, update DNS at wherever hatcm.com is actually registered
   to point at Netlify.
5. Update `ALLOWED_ORIGINS` on Render to the real domain, redeploy.
6. Give her the passcode directly (call or in-person, not over
   text/email where it could be forwarded around) — she won't need a
   separate URL, just the "Staff" link at the bottom of her own site.

## 4. Smoke test before handoff
- Submit a real test booking → confirm it appears as an event on the
  actual Google Calendar.
- Block an hour directly in Google Calendar → confirm it disappears from
  the booking widget within a minute.
- Try booking the same slot twice quickly → second attempt should get a
  clear "already booked" message.
- On the Schedule Helper: add a busy block → confirm it shows up on the
  real Google Calendar and disappears from the public booking page.
- Try deleting a patient-booked appointment from the Schedule Helper →
  should be refused with a clear message.