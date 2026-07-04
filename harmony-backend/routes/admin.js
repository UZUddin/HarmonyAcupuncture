const express = require('express');
const { z } = require('zod');
const requireAdminPasscode = require('../middleware/requireAdminPasscode');
const { listDayEvents, createBlockEvent, deleteEvent, updateEventTime, cancelPatientAppointment, BUSINESS_HOURS } = require('../services/googleCalendar');

const router = express.Router();

router.use(requireAdminPasscode);

// Simple check endpoint the dashboard calls once to verify the passcode
// before showing anything.
router.get('/verify', (req, res) => res.json({ ok: true }));

router.get('/day', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'A valid date (YYYY-MM-DD) is required.' });
    }

    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const events = await listDayEvents(dayStart, dayEnd);

    res.json({
      businessHours: BUSINESS_HOURS[dayOfWeek], // null if closed that day
      events,
    });
  } catch (err) {
    next(err);
  }
});

const blockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  label: z.string().max(100).optional(),
});

router.post('/block', async (req, res, next) => {
  try {
    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { date, start_time, end_time, label } = parsed.data;
    const start = new Date(`${date}T${start_time}`);
    const end = new Date(`${date}T${end_time}`);

    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    const eventId = await createBlockEvent({ summary: label, start, end });
    res.status(201).json({ eventId });
  } catch (err) {
    next(err);
  }
});

router.delete('/block/:eventId', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required to verify this block.' });

    // Refuse to delete anything that turns out to be a patient booking —
    // this endpoint is only for her own personal blocks. Re-fetch the
    // day's events rather than trusting the client's word for it.
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    const events = await listDayEvents(dayStart, dayEnd);
    const target = events.find((e) => e.id === req.params.eventId);

    if (!target) {
      return res.status(404).json({ error: 'That event was not found.' });
    }
    if (target.isPatientBooking) {
      return res.status(403).json({
        error: 'This is a patient appointment, not a personal block — use "Reschedule" or "Cancel" instead.',
      });
    }

    await deleteEvent(req.params.eventId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

const rescheduleSchema = z.object({
  original_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  new_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

// Reschedules a PATIENT appointment. The reverse restriction from the block
// endpoint above: this only works on events that ARE a patient booking.
router.patch('/appointment/:eventId', async (req, res, next) => {
  try {
    const parsed = rescheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { original_date, new_date, start_time, end_time } = parsed.data;

    const dayStart = new Date(`${original_date}T00:00:00`);
    const dayEnd = new Date(`${original_date}T23:59:59`);
    const events = await listDayEvents(dayStart, dayEnd);
    const target = events.find((e) => e.id === req.params.eventId);

    if (!target) return res.status(404).json({ error: 'That appointment was not found.' });
    if (!target.isPatientBooking) {
      return res.status(403).json({ error: 'This is a personal block, not a patient appointment — use the delete (✕) button instead.' });
    }

    const newStart = new Date(`${new_date}T${start_time}`);
    const newEnd = new Date(`${new_date}T${end_time}`);
    if (newEnd <= newStart) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    await updateEventTime(req.params.eventId, newStart, newEnd);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Cancels a PATIENT appointment (separate, deliberate action from the block
// delete above — same reverse restriction applies).
router.delete('/appointment/:eventId', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required to verify this appointment.' });

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    const events = await listDayEvents(dayStart, dayEnd);
    const target = events.find((e) => e.id === req.params.eventId);

    if (!target) return res.status(404).json({ error: 'That appointment was not found.' });
    if (!target.isPatientBooking) {
      return res.status(403).json({ error: 'This is a personal block, not a patient appointment — use the delete (✕) button instead.' });
    }

    await cancelPatientAppointment(req.params.eventId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
