# TODO Before Real Launch

## 1. Change the placeholder passcode
`AzureDuan` is temporary — just for demoing the Schedule Helper to her.
Before real patient data or her real schedule touches this, change it.

**How to change it:**
1. Go to your Render dashboard → the `harmony-backend` service →
   **Environment** tab.
2. Find `ADMIN_PASSCODE` → edit the value → save.
3. Render will automatically redeploy with the new value (takes ~1 minute).
4. Anyone using the old passcode (including her, if she'd already saved
   it) will need the new one — tell her directly, not over text/email.
5. If she'd already logged into the Schedule Helper page on her phone or
   computer, the old passcode is saved in that browser's local storage.
   It'll simply stop working after you change it on Render; she'll be
   prompted to enter the new one next time.

Pick the real passcode *with her*, not for her — she's the one typing it.
Confirm it's easy for her specifically (see the note about Chinese vs
English comfort from earlier).

## 2. Other things still pending
- [ ] Get GitHub repo access / exported files + photos + About/TCM
      content from her (content request already drafted)
- [ ] Confirm where hatcm.com is actually registered (not GitHub —
      GitHub doesn't sell domains) so DNS can be repointed later
- [ ] Set up Google Cloud OAuth project, get her one-time "Allow" click,
      obtain `GOOGLE_REFRESH_TOKEN`
- [ ] Deploy backend to Render, frontend to Netlify (see DEPLOYMENT.md)
- [ ] Set real `ALLOWED_ORIGINS` once the domain is live
- [ ] Full handoff / walkthrough session with her (separate from this
      technical setup — per her request)
- [ ] Change `ADMIN_PASSCODE` from the demo value (see above)
- [ ] Consider translating `HOW-IT-WORKS-FOR-HER.md` to Chinese before
      the handoff meeting
