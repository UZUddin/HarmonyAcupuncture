const { google } = require('googleapis');

// ============================================================
// Her calendar IS the database. No separate DB to manage, nothing for her
// to log into except Google Calendar, which she already uses.
//
// AUTH: uses a Google Cloud Service Account, NOT user OAuth. This matters —
// service accounts are a completely different auth mechanism ("server to
// server," not user-consent OAuth), so none of the Testing/Production
// publish status, 7-day refresh token expiry, or test-user-cap rules that
// apply to OAuth consent screens apply here at all.
//
// SETUP (done once, by you, inside her Google Cloud project):
// 1. Google Cloud Console > her project > enable "Google Calendar API"
// 2. IAM & Admin > Service Accounts > Create Service Account
// 3. That service account > Keys > Add Key > Create new key > JSON
//    → download it, paste its full contents into GOOGLE_SERVICE_ACCOUNT_KEY
//    as a single-line env var on Render
// 4. Note the service account's email (looks like
//    something@her-project.iam.gserviceaccount.com)
//
// HER ONLY STEP, EVER: she opens Google Calendar > Settings > her calendar
// > "Share with specific people" > adds that service account email >
// gives it "Make changes to events" permission. Same action as sharing
// her calendar with an assistant — nothing about Google Cloud involved.
// ============================================================

// Fail loudly and clearly at startup if required env vars are missing or
// malformed, instead of letting a bare JSON.parse error show up in Render's
// logs with no indication of what actually went wrong.
if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  throw new Error(
    "GOOGLE_SERVICE_ACCOUNT_KEY is not set. Set it in Render's Environment " +
    'tab to the full contents of the service account JSON key, minified to ' +
    'one line. See DEPLOYMENT.md for setup steps.'
  );
}

let serviceAccountCredentials;
try {
  serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
} catch (err) {
  throw new Error(
    'GOOGLE_SERVICE_ACCOUNT_KEY is set but is not valid JSON. Double-check ' +
    'it was pasted as a single-line, unmodified copy of the downloaded key ' +
    'file (quotes and all).'
  );
}

if (!process.env.GOOGLE_CALENDAR_ID) {
  throw new Error(
    'GOOGLE_CALENDAR_ID is not set. This should be her actual calendar ' +
    'email address (e.g. harmony@gmail.com) — never "primary", since a ' +
    'service account has no calendar of its own.'
  );
}

const serviceAccountAuth = new google.auth.GoogleAuth({
  credentials: serviceAccountCredentials,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth: serviceAccountAuth });

// This must be HER calendar's ID — for a personal Gmail account, that's
// just her email address (e.g. harmony@gmail.com), not "primary". "primary"
// only makes sense for the account that's actually authenticated, and a
// service account has no calendar of its own — it only sees calendars
// explicitly shared with it (see the sharing step above).
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

// NOT used to gate bookings anymore — she's a side-hustle practice with no
// fixed weekly schedule, so nothing is open by default. Availability comes
// entirely from the open-time windows she adds via createOpenOverrideEvent
// (see getOpenWindows below). Kept here only in case a future version wants
// a "these are my usual hours" fallback again.
const BUSINESS_HOURS = {
  0: null, // Sunday - closed
  1: { start: '09:00', end: '18:00' }, // Monday
  2: { start: '09:00', end: '18:00' },
  3: { start: '09:00', end: '18:00' },
  4: { start: '09:00', end: '18:00' },
  5: { start: '09:00', end: '18:00' },
  6: { start: '09:00', end: '13:00' }, // Saturday
};

// Ask Google "what's already busy on this calendar during this window?"
// This means: whatever she blocks off in her own Google Calendar app —
// a dentist appointment, a vacation, a lunch break — automatically
// disappears from the public booking page. She never has to touch
// anything except her calendar, the way she already does.
async function getBusyIntervals(dayStart, dayEnd) {
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: [{ id: CALENDAR_ID }],
    },
  });
  return res.data.calendars[CALENDAR_ID].busy || [];
}

async function createCalendarEvent({ summary, description, start, end, attendeeEmail }) {
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    sendUpdates: 'all', // actually emails the invite (and later reminders) to the attendee
    requestBody: {
      summary,
      description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      reminders: { useDefault: true }, // uses the attendee's own Google/Gmail default reminders
    },
  });
  return res.data.id;
}

// Lists everything on her calendar for a given day — used by the calendar
// helper dashboard so she can see both her own personal blocks AND patient
// bookings in one place, without opening Google Calendar itself.
async function listDayEvents(dayStart, dayEnd) {
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items || []).map((event) => ({
    id: event.id,
    summary: event.summary || '(no title)',
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    // Patient bookings always have an attendee (the patient's email) —
    // her own personal blocks never do. This distinguishes them so the
    // dashboard can protect patient appointments from accidental deletion.
    isPatientBooking: Boolean(event.attendees && event.attendees.length > 0),
    // A one-off "open this window" exception she added herself (see
    // createOpenOverrideEvent below) — the dashboard tags these distinctly
    // from an ordinary busy block.
    isOpenOverride: event.extendedProperties?.private?.harmonyType === 'open_override',
  }));
}

// Creates a simple "Busy" block on her calendar — no attendees, no
// reminders sent to anyone. Used by the calendar helper dashboard's
// "add busy time" feature.
async function createBlockEvent({ summary, start, end }) {
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: summary || 'Blocked',
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      transparency: 'opaque', // "Busy", not "Free"
    },
  });
  return res.data.id;
}

// Opens up a window of bookable time. This is her PRIMARY way of setting
// availability, not a rare exception — she's a side-hustle practice with no
// fixed weekly schedule, so nothing is open by default (see getOpenWindows
// below and how bookings.js uses it). Each week she adds whichever windows
// she's actually free. transparency:'transparent' means the event itself
// never counts as "busy" on her calendar, and it's tagged via
// extendedProperties so getOpenWindows() (used by the public booking
// endpoint) can find it.
async function createOpenOverrideEvent({ summary, start, end }) {
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: summary || 'Available',
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      transparency: 'transparent',
      extendedProperties: { private: { harmonyType: 'open_override' } },
    },
  });
  return res.data.id;
}

// Returns ALL open windows on this date (she may add more than one, e.g.
// 9-12 and 2-4 the same day) as an array of {start, end} Dates. An empty
// array means she hasn't opened any time that day — the public booking
// endpoint treats that as fully closed.
async function getOpenWindows(dayStart, dayEnd) {
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    privateExtendedProperty: 'harmonyType=open_override',
  });
  return (res.data.items || []).map((event) => ({
    start: new Date(event.start.dateTime),
    end: new Date(event.end.dateTime),
  }));
}

// Only ever used to delete HER OWN blocks, never a patient booking — the
// route calling this checks isPatientBooking first and refuses otherwise.
async function deleteEvent(eventId) {
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
}

// Reschedules a PATIENT appointment. sendUpdates:'all' means Google emails
// the patient automatically if they opted into calendar reminders (i.e.
// they're listed as an attendee) — nothing extra to build for that.
async function updateEventTime(eventId, start, end) {
  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: 'all',
    requestBody: {
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });
}

// Cancels a PATIENT appointment (distinct from deleteEvent, which is only
// for her own personal blocks). Notifies the patient automatically if
// they're an attendee.
async function cancelPatientAppointment(eventId) {
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId, sendUpdates: 'all' });
}

module.exports = {
  getBusyIntervals,
  createCalendarEvent,
  listDayEvents,
  createBlockEvent,
  createOpenOverrideEvent,
  getOpenWindows,
  deleteEvent,
  updateEventTime,
  cancelPatientAppointment,
  BUSINESS_HOURS,
};
