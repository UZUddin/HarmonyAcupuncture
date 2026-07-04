require('dotenv').config();
const express = require('express');
const applySecurity = require('./middleware/security');
const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');

const app = express();

// Trust Render's proxy so rate-limiting sees the real client IP
app.set('trust proxy', 1);

applySecurity(app);

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter); // calendar helper dashboard, passcode-protected

// Never leak stack traces or internal details to visitors
app.use((err, req, res, next) => {
  console.error(err); // full detail goes to Render's logs only
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Something went wrong. Please try again.' : err.message,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Harmony backend listening on port ${PORT}`));
