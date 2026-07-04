const { google } = require('googleapis');

// ============================================================
// Her calendar IS the database. No separate DB to manage, nothing for her
// to log into except Google Calendar, which she already uses.
//
// SETUP (done once, by you — not her):
// 1. Google Cloud Console > new project > enable "Google Calendar API"
// 2. Create OAuth 2.0 credentials (Web application)
// 3. Do the one-time consent flow AS HER — she just clicks "Allow" once
//    on a Google sign-in screen, nothing technical. Save the resulting
//    refresh token as GOOGLE_REFRESH_TOKEN in Render.
// ============================================================

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

// Her standing business hours. This is the one thing that isn't "just her
// calendar" — if these ever need to change, that's a quick code edit
// (a few minutes), not something to build a settings screen for.
// Matches the hours already shown in the site footer.
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
  deleteEvent,
  updateEventTime,
  cancelPatientAppointment,
  BUSINESS_HOURS,
};
