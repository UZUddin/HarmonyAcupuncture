# Meeting Walkthrough

Three things to cover — Google Cloud setup is mostly on you (less to
explain to her), content-gathering can happen while you talk, and her
input on the booking flow works best once she's actually seen it live.

Bring: laptop, the live site loaded (`https://harmonyacupuncture.netlify.app`),
the Schedule Helper loaded.

---

## Part 1: Google Cloud setup (~10 min)

**Goal:** she ends up owning the Google Cloud project. Her actual
involvement is minimal — no "click Allow," no consent screens, no
Google Cloud UI for her to be nervous about (this uses a Service
Account, not OAuth — see `STRUCTURE.md`).

1. Have her create a Google Cloud project under her own account (or
   watch you do it — 2 minutes either way): console.cloud.google.com →
   New Project.
2. Have her go to **IAM & Admin → IAM → Add** → enter your email → role
   **Editor**. This is the only "Google Cloud" thing she does — one
   settings screen, then she can step away.
3. From here, you do the rest yourself (can even be after the meeting,
   remotely, now that you have access):
   - Enable the Google Calendar API
   - Create a Service Account
   - Generate its JSON key
   - Put the key into Render as `GOOGLE_SERVICE_ACCOUNT_KEY`

**Her only real step, and it's simple:**
4. Walk her through this live, since it's genuinely easy: Google
   Calendar → Settings → her calendar → "Share with specific people" →
   add the service account's email (looks like an email address,
   `something@her-project.iam.gserviceaccount.com`) → permission
   **"Make changes to events"** → Send. This is the same action as
   sharing her calendar with an assistant — frame it that way, since
   it'll land better than anything Google-Cloud-flavored.
5. Test together: submit a real booking on the live site, confirm it
   shows up on her actual calendar.

---

## Part 2: Pulling old site content (~15 min, can overlap with Part 1
while things load/deploy)

Ask her directly, in this order:

1. **GitHub access** — "Can you add me as a collaborator on the repo
   for your current site?" (GitHub.com → her repo → Settings →
   Collaborators). If she doesn't remember having a GitHub account
   herself, the current site may have been built by someone else on
   their own account — ask who built the original hatcm.com site.
2. **Photos** — ask what she already has: clinic photos, treatment
   room, any photos of her. If none exist, don't try to solve that in
   this meeting — just note it as a follow-up (professional photos are
   a separate, biggish task).
3. **About / bio text** — ask her to just talk about her background,
   training, and approach out loud while you take notes or record
   (with permission) — often easier for her than trying to write it
   herself, especially if English isn't her first language. Draft the
   actual copy afterward for her to review.
4. **TCM philosophy content** — same approach: let her talk, you
   synthesize into web copy afterward.

---

## Part 3: Her input on booking flow (~15 min)

Pull up the live site together. Have her actually try booking a test
appointment herself, on her own phone if possible — this reveals real
friction points better than describing the flow to her.

Things to specifically watch for and ask about:
- Does she get through the 3-step flow without help?
- Is anything confusing in either English or Chinese?
- Does she want to adjust the appointment type names/descriptions?
- Try the Schedule Helper too — have her add a busy block herself,
  live. Does the passcode step make sense? Is "+ Add busy time" clear?
- Ask what her actual weekly rhythm looks like (lunch breaks, days off)
  so you can sanity-check the business hours already coded in
  (`BUSINESS_HOURS` in `googleCalendar.js` — currently Mon–Fri 9–6,
  Sat 9–1, Sun closed) against her real hours.
- Ask if she wants the real `ADMIN_PASSCODE` to be something specific —
  pick it with her now if it comes up naturally.

---

## After the meeting
Update `TODO.md` with whatever's now resolved, and follow up on
anything you couldn't finish live (photos, content drafts, the service
account key going into Render if you didn't do it live).
