import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUsersCollection, isMongoConfigured } from './mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.resolve(__dirname, '../../data/db.json');

let inMemoryDb = null;
let writeQueue = Promise.resolve();

async function ensureDbFile() {
  try {
    await fs.access(dbFilePath);
  } catch {
    await fs.mkdir(path.dirname(dbFilePath), { recursive: true });
    await fs.writeFile(dbFilePath, JSON.stringify({ users: [] }, null, 2), 'utf-8');
  }
}

export async function loadDb() {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  await ensureDbFile();
  const raw = await fs.readFile(dbFilePath, 'utf-8');
  inMemoryDb = JSON.parse(raw || '{"users": []}');
  if (!Array.isArray(inMemoryDb.users)) {
    inMemoryDb.users = [];
  }
  return inMemoryDb;
}

export async function saveDb() {
  if (!inMemoryDb) {
    return;
  }

  writeQueue = writeQueue.then(() => fs.writeFile(dbFilePath, JSON.stringify(inMemoryDb, null, 2), 'utf-8'));
  await writeQueue;
}

export async function findUserByEmail(email) {
  const normalized = String(email).toLowerCase().trim();

  if (isMongoConfigured()) {
    try {
      const users = await getUsersCollection();
      if (users) {
        return users.findOne({ email: normalized }, { projection: { _id: 0 } });
      }
    } catch {
      // Fall through to local file fallback for development resilience.
    }
  }

  const db = await loadDb();
  return db.users.find((u) => u.email === normalized) || null;
}

export async function findUserById(id) {
  if (isMongoConfigured()) {
    try {
      const users = await getUsersCollection();
      if (users) {
        return users.findOne({ id: String(id) }, { projection: { _id: 0 } });
      }
    } catch {
      // Fall through to local file fallback for development resilience.
    }
  }

  const db = await loadDb();
  return db.users.find((u) => u.id === String(id)) || null;
}

export async function upsertUser(user) {
  const normalizedEmail = String(user.email || '').toLowerCase().trim();
  const normalizedUser = {
    ...user,
    email: normalizedEmail,
    updatedAt: new Date().toISOString(),
  };

  if (isMongoConfigured()) {
    try {
      const users = await getUsersCollection();
      if (users) {
        const existing = await users.findOne({ $or: [{ id: normalizedUser.id }, { email: normalizedEmail }] }, { projection: { _id: 0 } });
        const merged = {
          ...(existing || {}),
          ...normalizedUser,
          createdAt: existing?.createdAt || normalizedUser.createdAt || new Date().toISOString(),
        };

        await users.updateOne(
          { email: normalizedEmail },
          { $set: merged },
          { upsert: true },
        );

        return merged;
      }
    } catch {
      // Fall through to local file fallback for development resilience.
    }
  }

  const db = await loadDb();
  const idx = db.users.findIndex((u) => u.id === normalizedUser.id || u.email === normalizedEmail);
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...normalizedUser };
  } else {
    db.users.push(normalizedUser);
  }
  await saveDb();
  return normalizedUser;
}
