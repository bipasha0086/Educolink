import { Router } from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');
const roomResourcesDbPath = path.resolve(__dirname, '../../data/room-resources.json');
const roomSessionsDbPath = path.resolve(__dirname, '../../data/room-sessions.json');
const MEMBER_ACTIVE_WINDOW_MS = 120 * 1000;

await fs.mkdir(uploadsDir, { recursive: true });

async function ensureRoomResourcesFile() {
  try {
    await fs.access(roomResourcesDbPath);
  } catch {
    await fs.mkdir(path.dirname(roomResourcesDbPath), { recursive: true });
    await fs.writeFile(roomResourcesDbPath, JSON.stringify({ resources: [] }, null, 2), 'utf-8');
  }
}

async function ensureRoomSessionsFile() {
  try {
    await fs.access(roomSessionsDbPath);
  } catch {
    await fs.mkdir(path.dirname(roomSessionsDbPath), { recursive: true });
    await fs.writeFile(roomSessionsDbPath, JSON.stringify({ rooms: {} }, null, 2), 'utf-8');
  }
}

async function loadRoomResources() {
  await ensureRoomResourcesFile();
  const raw = await fs.readFile(roomResourcesDbPath, 'utf-8');
  const parsed = JSON.parse(raw || '{"resources": []}');
  if (!Array.isArray(parsed.resources)) {
    parsed.resources = [];
  }
  return parsed;
}

async function saveRoomResources(db) {
  await fs.writeFile(roomResourcesDbPath, JSON.stringify(db, null, 2), 'utf-8');
}

async function loadRoomSessions() {
  await ensureRoomSessionsFile();
  const raw = await fs.readFile(roomSessionsDbPath, 'utf-8');
  const parsed = JSON.parse(raw || '{"rooms": {}}');
  if (!parsed.rooms || typeof parsed.rooms !== 'object') {
    parsed.rooms = {};
  }
  return parsed;
}

async function saveRoomSessions(db) {
  await fs.writeFile(roomSessionsDbPath, JSON.stringify(db, null, 2), 'utf-8');
}

function normalizeRoomCode(roomCodeRaw) {
  return String(roomCodeRaw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

function sanitizeDisplayName(nameRaw) {
  const cleaned = String(nameRaw || '').trim().replace(/\s+/g, ' ');
  return cleaned.slice(0, 40) || 'Anonymous';
}

function memberIsActive(member) {
  const lastSeenTime = new Date(member.lastSeenAt || 0).getTime();
  if (!Number.isFinite(lastSeenTime)) {
    return false;
  }
  return (Date.now() - lastSeenTime) <= MEMBER_ACTIVE_WINDOW_MS;
}

function pruneRoom(room) {
  room.members = Array.isArray(room.members) ? room.members : [];
  room.messages = Array.isArray(room.messages) ? room.messages : [];

  room.members = room.members.filter((member) => memberIsActive(member));
  room.messages = room.messages.slice(-200);
}

function getOrCreateRoom(db, roomCode) {
  if (!db.rooms[roomCode]) {
    db.rooms[roomCode] = {
      roomCode,
      createdAt: new Date().toISOString(),
      members: [],
      messages: [],
    };
  }

  const room = db.rooms[roomCode];
  pruneRoom(room);
  return room;
}

function toPublicMember(member) {
  return {
    memberId: member.memberId,
    displayName: member.displayName,
    joinedAt: member.joinedAt,
    lastSeenAt: member.lastSeenAt,
  };
}

function toPublicMessage(message) {
  return {
    messageId: message.messageId,
    memberId: message.memberId,
    displayName: message.displayName,
    text: message.text,
    sentAt: message.sentAt,
  };
}

function toPublicRoomResource(resource, req) {
  return {
    id: resource.id,
    roomCode: resource.roomCode,
    name: resource.storedName,
    originalName: resource.originalName,
    size: resource.size,
    uploadedBy: resource.uploadedBy,
    uploadedAt: resource.uploadedAt,
    url: `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(resource.storedName)}`,
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = path
      .basename(file.originalname || 'file', ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'file';

    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

function toPublicFile(fileName, stats, req) {
  return {
    name: fileName,
    size: stats.size,
    uploadedAt: stats.birthtime?.toISOString?.() || new Date(stats.mtime).toISOString(),
    url: `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(fileName)}`,
  };
}

router.get('/files', async (req, res) => {
  const items = await fs.readdir(uploadsDir);

  const files = await Promise.all(
    items.map(async (name) => {
      const fullPath = path.join(uploadsDir, name);
      const stats = await fs.stat(fullPath);
      return stats.isFile() ? toPublicFile(name, stats, req) : null;
    }),
  );

  files.sort((a, b) => (a?.uploadedAt < b?.uploadedAt ? 1 : -1));

  return res.json({ files: files.filter(Boolean) });
});

router.post('/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Use field name "file".' });
  }

  const response = {
    name: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
    url: `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(req.file.filename)}`,
  };

  return res.status(201).json({ file: response });
});

router.get('/rooms/:roomCode/resources', async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.roomCode);
  if (!roomCode) {
    return res.status(400).json({ message: 'Valid room code is required.' });
  }

  const db = await loadRoomResources();
  const resources = db.resources
    .filter((resource) => resource.roomCode === roomCode)
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
    .map((resource) => toPublicRoomResource(resource, req));

  return res.json({ roomCode, resources });
});

router.post('/rooms/:roomCode/resources/upload', upload.single('file'), async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.roomCode);
  if (!roomCode) {
    return res.status(400).json({ message: 'Valid room code is required.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Use field name "file".' });
  }

  const uploadedBy = String(req.body?.uploadedBy || 'Anonymous').trim().slice(0, 60) || 'Anonymous';

  const resource = {
    id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    roomCode,
    storedName: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
  };

  const db = await loadRoomResources();
  db.resources.push(resource);
  await saveRoomResources(db);

  return res.status(201).json({ resource: toPublicRoomResource(resource, req) });
});

router.post('/rooms/:roomCode/join', async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.roomCode);
  if (!roomCode) {
    return res.status(400).json({ message: 'Valid room code is required.' });
  }

  const displayName = sanitizeDisplayName(req.body?.displayName);
  const requestedMemberId = String(req.body?.memberId || '').trim();

  const db = await loadRoomSessions();
  const room = getOrCreateRoom(db, roomCode);

  let member = requestedMemberId
    ? room.members.find((entry) => entry.memberId === requestedMemberId)
    : null;

  const activeOthers = room.members.filter((entry) => entry.memberId !== member?.memberId);
  if (!member && activeOthers.length >= 1) {
    return res.status(409).json({ message: 'This room already has two active participants.' });
  }

  if (!member) {
    member = {
      memberId: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      displayName,
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };
    room.members.push(member);
  } else {
    member.displayName = displayName;
    member.lastSeenAt = new Date().toISOString();
  }

  await saveRoomSessions(db);

  return res.json({
    roomCode,
    member: toPublicMember(member),
    participants: room.members.map(toPublicMember),
  });
});

router.post('/rooms/:roomCode/heartbeat', async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.roomCode);
  const memberId = String(req.body?.memberId || '').trim();

  if (!roomCode || !memberId) {
    return res.status(400).json({ message: 'Room code and memberId are required.' });
  }

  const db = await loadRoomSessions();
  const room = getOrCreateRoom(db, roomCode);
  const member = room.members.find((entry) => entry.memberId === memberId);

  if (!member) {
    return res.status(404).json({ message: 'Participant not found in room. Join again.' });
  }

  member.lastSeenAt = new Date().toISOString();
  await saveRoomSessions(db);

  return res.json({ ok: true });
});

router.get('/rooms/:roomCode/session', async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.roomCode);
  if (!roomCode) {
    return res.status(400).json({ message: 'Valid room code is required.' });
  }

  const db = await loadRoomSessions();
  const room = getOrCreateRoom(db, roomCode);
  await saveRoomSessions(db);

  return res.json({
    roomCode,
    participants: room.members.map(toPublicMember),
    messages: room.messages.map(toPublicMessage),
  });
});

router.post('/rooms/:roomCode/messages', async (req, res) => {
  const roomCode = normalizeRoomCode(req.params.roomCode);
  const memberId = String(req.body?.memberId || '').trim();
  const text = String(req.body?.text || '').trim();

  if (!roomCode || !memberId) {
    return res.status(400).json({ message: 'Room code and memberId are required.' });
  }

  if (!text) {
    return res.status(400).json({ message: 'Message text is required.' });
  }

  const db = await loadRoomSessions();
  const room = getOrCreateRoom(db, roomCode);
  const member = room.members.find((entry) => entry.memberId === memberId);

  if (!member) {
    return res.status(404).json({ message: 'Participant not found in room. Join again.' });
  }

  const message = {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    memberId,
    displayName: member.displayName,
    text: text.slice(0, 1000),
    sentAt: new Date().toISOString(),
  };

  room.messages.push(message);
  member.lastSeenAt = new Date().toISOString();
  pruneRoom(room);

  await saveRoomSessions(db);

  return res.status(201).json({ message: toPublicMessage(message) });
});

export default router;
