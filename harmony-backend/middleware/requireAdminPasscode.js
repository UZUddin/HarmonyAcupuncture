// This is intentionally NOT a full authentication system (no accounts, no
// Supabase, no passwords-per-user) — it's a single shared passcode that
// keeps the calendar helper dashboard from being usable by anyone who
// stumbles on the URL. Treat ADMIN_PASSCODE like a house key: simple,
// but only give it to her.
function requireAdminPasscode(req, res, next) {
  const provided = req.headers['x-admin-passcode'];
  if (!provided || provided !== process.env.ADMIN_PASSCODE) {
    return res.status(401).json({ error: 'Incorrect passcode.' });
  }
  next();
}

module.exports = requireAdminPasscode;
