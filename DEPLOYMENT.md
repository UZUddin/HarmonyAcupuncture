# Deployment Walkthrough (Website + Live Google Calendar Booking)

No database to set up — this is the whole reason the architecture got
simpler. One GitHub repo (two folders inside it), one Render service, one
Netlify site, plus a Google Service Account (not user OAuth — see below).

## 0. Repo structure
```
harmony-website/              (one GitHub repo)
├── DEPLOYMENT.md
├── HOW-IT-WORKS-FOR-HER.md
├── SECURITY.md
├── TODO.md
├── MEETING-WALKTHROUGH.md
├── frontend/
│   ├── index.html
│   ├── harmony-calendar-helper.html
│   └── netlify.toml
└── backend/
    ├── server.js
    ├── package.json
    ├── routes/
    ├── middleware/
    └── services/
```

## 1. Google Cloud — Service Account (not OAuth)
This project uses a Service Account instead of user OAuth. That means no
consent screen flow, no refresh token, no 7-day expiry, no test user
cap — it's a completely different, simpler auth mechanism meant for
exactly this kind of single-calendar integration.

**Do this inside HER Google Cloud project** (have her add you as an
Editor via IAM & Admin → IAM, or create the project together):

1. console.cloud.google.com → new project (under her account) → enable
   "Google Calendar API"
2. IAM & Admin → Service Accounts → **Create Service Account** → give it
   any name (e.g. "harmony-booking")
3. Click into the new service account → **Keys** tab → **Add Key** →
   **Create new key** → JSON → downloads a `.json` file
4. Open that file, copy its entire contents, minify to one line, and
   paste it as `GOOGLE_SERVICE_ACCOUNT_KEY` in Render's environment
   variables
5. Note the service account's email — it's in that JSON file under
   `client_email`, looks like
   `harmony-booking@her-project.iam.gserviceaccount.com`

**Her only step, ever:**
6. She opens Google Calendar (calendar.google.com) → gear icon →
   Settings → click her calendar in the left sidebar → scroll to
   "Share with specific people or groups" → **Add people and groups** →
   paste in the service account email from step 5 → set permission to
   **"Make changes to events"** → Send.

That's the entire Google-side setup. No "Allow" click, no OAuth
Playground, nothing that expires.

## 2. Backend → Render
1. Push the whole repo (both folders) to GitHub.
2. Render → New → **Web Service** (not Blueprint — that expects
   `render.yaml` at the repo root, awkward with two folders in one repo).
3. Connect the repo. Under **Root Directory**, enter `backend`.
4. Build command: `npm install`. Start command: `npm start`.
5. Add env vars manually in Render's dashboard, from `.env.example`:
   `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_CALENDAR_ID` (her actual email
   address, not "primary"), `ALLOWED_ORIGINS`, `ADMIN_PASSCODE`.
6. Deploy, confirm `https://your-service.onrender.com/health` returns
   `{"ok":true}`.

## 3. Frontend → Netlify
1. Update `API_BASE` in both `index.html` and
   `harmony-calendar-helper.html` to the real Render URL from step 2.
2. Netlify → New site from Git → same repo. **Base directory** and
   **Publish directory**: `frontend`.
3. Deploy to the free `.netlify.app` subdomain first for testing.
4. Once approved, update DNS at wherever hatcm.com is actually
   registered to point at Netlify.
5. Update `ALLOWED_ORIGINS` on Render to the real domain, redeploy.
6. Give her the passcode directly, not over text/email — she reaches
   the Schedule Helper via the small "Staff" link in the site footer.

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
