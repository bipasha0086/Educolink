import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upsertUser } from '../lib/db.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  const { user } = req.auth;
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
      preferences: user.preferences || {},
    },
  });
});

router.patch('/me/preferences', requireAuth, async (req, res) => {
  const { user } = req.auth;
  const { theme, focusMode } = req.body || {};

  const updated = {
    ...user,
    preferences: {
      ...user.preferences,
      ...(typeof theme === 'string' ? { theme } : {}),
      ...(typeof focusMode === 'boolean' ? { focusMode } : {}),
    },
  };

  await upsertUser(updated);

  return res.json({
    preferences: updated.preferences,
  });
});

export default router;
