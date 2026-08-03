// This is intentionally NOT a full authentication system (no accounts, no
// Supabase, no passwords-per-user) — it's a single shared passcode that
// keeps the calendar helper dashboard from being usable by anyone who
// stumbles on the URL. Treat ADMIN_PASSCODE like a house key: simple,
// but only give it to her.
const crypto = require('crypto');

// Constant-time comparison. Hashing both sides to a fixed 32 bytes first means
// timingSafeEqual never sees unequal-length buffers (which would throw and also
// leak length), so this is safe for arbitrary input.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function requireAdminPasscode(req, res, next) {
  const provided = req.headers['x-admin-passcode'];
  const expected = process.env.ADMIN_PASSCODE;
  if (!provided || !expected || !safeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Incorrect passcode.' });
  }
  next();
}

module.exports = requireAdminPasscode;
