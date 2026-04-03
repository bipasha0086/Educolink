import { verifyToken } from '../lib/token.js';
import { findUserById } from '../lib/db.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const decoded = verifyToken(token);
    const user = await findUserById(decoded.sub);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token user' });
    }

    req.auth = {
      userId: user.id,
      user,
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
