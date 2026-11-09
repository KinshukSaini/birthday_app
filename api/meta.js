// Vercel function for /api/meta: tells the editor whether it needs a password.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ passwordRequired: !!process.env.MODIFY_PASSWORD });
};
