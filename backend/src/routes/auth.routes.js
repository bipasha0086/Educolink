import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { findUserByEmail, upsertUser } from '../lib/db.js';
import { signToken } from '../lib/token.js';

const router = Router();

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    authProvider: user.authProvider,
    preferences: user.preferences || {},
  };
}

function issueAuthResponse(user) {
  const token = signToken({ sub: user.id, email: user.email });
  return {
    user: toPublicUser(user),
    token,
  };
}

router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body || {};

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'fullName, email, and password are required' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await findUserByEmail(normalizedEmail);

  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);

  const user = {
    id: `usr_${randomUUID()}`,
    name: String(fullName).trim(),
    email: normalizedEmail,
    passwordHash,
    authProvider: 'local',
    createdAt: new Date().toISOString(),
    preferences: {
      theme: 'light',
      focusMode: false,
    },
  };

  await upsertUser(user);
  return res.json(issueAuthResponse(user));
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordOk = await bcrypt.compare(String(password), user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return res.json(issueAuthResponse(user));
});

router.post('/google', async (req, res) => {
  const { token } = req.body || {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Google token is required' });
  }

  let payload;
  try {
    const segments = token.split('.');
    payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf-8'));
  } catch {
    payload = {};
  }

  const normalizedEmail = String(payload.email || `google_user_${token.slice(0, 8)}@educolink.local`).toLowerCase().trim();
  const name = String(payload.name || 'Google User').trim();

  let user = await findUserByEmail(normalizedEmail);

  if (!user) {
    user = {
      id: `usr_${randomUUID()}`,
      name,
      email: normalizedEmail,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        focusMode: false,
      },
    };
  } else {
    user = {
      ...user,
      name,
      authProvider: 'google',
    };
  }

  await upsertUser(user);
  return res.json(issueAuthResponse(user));
});

export default router;
