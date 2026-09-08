
/




















Bookings · JS
const express = require('express');
const { z } = require('zod');
const { getBusyIntervals, createCalendarEvent, getOpenWindows } = require('../services/googleCalendar');
 
const router = express.Router();
 
const SERVICE_DURATIONS_MIN = { initial_consultation: 75, follow_up: 45, special: 60 };
const SLOT_INCREMENT_MIN = 30;
 
// Reject '<' and '>' outright in free-text fields. These fields end up in
// the calendar event summary/description, which the Schedule Helper later
// renders in the admin dashboard — blocking angle brackets here closes off
// HTML/script injection at the source, as a second layer behind the
// frontend's own escaping on render.
const noHtmlText = (max) =>
  z
    .string()
    .max(max)
    .refine((val) => !/[<>]/.test(val), { message: 'Please remove any < or > characters.' });
 
const bookingSchema = z
  .object({
    full_name: z
      .string()
      .min(1)
      .max(120)
      .refine((val) => !/[<>]/.test(val), { message: 'Please remove any < or > characters.' }),
    email: z.string().email().max(200).optional().or(z.literal('')),
    phone: z
      .string()
      .min(7)
      .max(20)
      .regex(/^[\d\s+()\-]+$/, {
        message: 'Please enter a valid phone number (digits and + ( ) - only).',
      }),
    service_type: z.enum(['initial_consultation', 'follow_up', 'special']),
    starts_at: z.string().datetime(),
    chief_complaint: noHtmlText(1000).optional(),
    calendar_opt_in: z.boolean().default(false),
    consent_given: z.literal(true, {
      errorMap: () => ({ message: 'Please check the consent box to continue.' }),
    }),
  })
  .refine((data) => !data.calendar_opt_in || (data.email && data.email.length > 0), {
    message: 'An email address is required to send calendar reminders.',
    path: ['email'],
  });
 
function overlapsAny(start, end, busyIntervals) {
  return busyIntervals.some((b) => start < new Date(b.end) && end > new Date(b.start));
}
 
// Everything here reads directly from her actual Google Calendar in real
// time — there's no separate copy of her schedule to keep in sync. If she
// blocks an hour in her calendar app, it's reflected the next time anyone
// loads this endpoint. Nothing for her to update manually.
router.get('/slots', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'A valid date (YYYY-MM-DD) is required.' });
    }
 
    // She has no fixed weekly schedule — availability is entirely whatever
    // open-time windows she's added for this specific date. No windows
    // means nothing bookable that day, full stop.
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    const openWindows = await getOpenWindows(dayStart, dayEnd);
 
    if (openWindows.length === 0) {
      return res.json({ openSlots: [] });
    }
 
    const busy = await getBusyIntervals(dayStart, dayEnd);
 
    const openSlots = [];
    for (const window of openWindows) {
      let cursor = new Date(window.start);
      while (cursor < window.end) {
        const slotEnd = new Date(cursor.getTime() + SLOT_INCREMENT_MIN * 60000);
        if (slotEnd <= window.end && !overlapsAny(cursor, slotEnd, busy)) {
          openSlots.push(cursor.toISOString());
        }
        cursor = slotEnd;
      }
    }
 
    res.json({ openSlots });
  } catch (err) {
    next(err);
  }
});
 
router.post('/', async (req, res, next) => {
  try {
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
 
    const input = parsed.data;
    const durationMin = SERVICE_DURATIONS_MIN[input.service_type];
    const startsAt = new Date(input.starts_at);
    const endsAt = new Date(startsAt.getTime() + durationMin * 60000);
 
    // Re-check right before booking — closes the gap where two people
    // might grab the same slot between page load and submit.
    const busy = await getBusyIntervals(startsAt, endsAt);
    if (overlapsAny(startsAt, endsAt, busy)) {
      return res.status(409).json({ error: 'That time was just booked. Please pick another slot.' });
    }
 
    const googleEventId = await createCalendarEvent({
      summary: `${input.service_type.replace('_', ' ')} — ${input.full_name}`,
      description: [
        `Phone: ${input.phone}`,
        input.email ? `Email: ${input.email}` : null,
        input.chief_complaint ? `Concern: ${input.chief_complaint}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      start: startsAt,
      end: endsAt,
      attendeeEmail: input.calendar_opt_in && input.email ? input.email : undefined,
    });
 
    res.status(201).json({ confirmed: true, eventId: googleEventId });
  } catch (err) {
    next(err);
  }
});
 
module.exports = router;
 

