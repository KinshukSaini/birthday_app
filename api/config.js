// Vercel function for /api/config: GET reads the text, POST saves it, DELETE resets it.
const { getConfig, saveConfig, resetConfig, NoDatabaseError } = require('../lib/store');

const PASSWORD = process.env.MODIFY_PASSWORD || '';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.status(200).json(await getConfig());

    if (PASSWORD && req.headers['x-modify-password'] !== PASSWORD) {
      return res.status(401).json({ error: 'Wrong password' });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Could not save that' });
      return res.status(200).json(await saveConfig(body));
    }
    if (req.method === 'DELETE') return res.status(200).json(await resetConfig());
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof NoDatabaseError) return res.status(503).json({ error: 'No database connected' });
    if (err instanceof SyntaxError) return res.status(400).json({ error: 'Could not save that' });
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};
