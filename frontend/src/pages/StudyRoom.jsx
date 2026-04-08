import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoPeopleOutline, IoChatbubblesOutline, IoDocumentTextOutline,
  IoEaselOutline, IoShareSocialOutline, IoTimerOutline,
  IoChevronForward, IoAddOutline, IoVideocamOutline,
  IoLogInOutline, IoCloudUploadOutline, IoOpenOutline,
  IoRefreshOutline, IoCheckmarkCircleOutline, IoWarningOutline,
  IoSendOutline, IoCloseOutline
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh, IllustrationNetwork } from '../components/SVGBackgrounds/SVGBackgrounds';
import {
  getStudyRoomSession,
  joinStudyRoom,
  listRoomResources,
  normalizeRoomCode,
  sendStudyRoomHeartbeat,
  sendStudyRoomMessage,
  uploadRoomResource,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function createRoomCode() {
  return `EDU${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function toComparableParticipant(participant) {
  return {
    memberId: participant?.memberId || '',
    displayName: participant?.displayName || '',
    joinedAt: participant?.joinedAt || '',
  };
}

function toComparableMessage(message) {
  return {
    messageId: message?.messageId || '',
    memberId: message?.memberId || '',
    text: message?.text || '',
    sentAt: message?.sentAt || '',
  };
}

export default function StudyRoom() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const resourcesRef = useRef([]);
  const participantsRef = useRef([]);
  const messagesRef = useRef([]);
  
  // Initialize from localStorage to prevent flickering
  const initializeRoomInput = () => {
    const saved = localStorage.getItem('studyRoomCode');
    return saved ? normalizeRoomCode(saved) : '';
  };

  const [roomInput, setRoomInput] = useState(initializeRoomInput());
  const [activeRoomCode, setActiveRoomCode] = useState('');
  const [activeMember, setActiveMember] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showRoomPopup, setShowRoomPopup] = useState(false);
  const [showSharedResourcesPanel, setShowSharedResourcesPanel] = useState(false);

  const uploaderName = useMemo(() => {
    const fallback = user?.email ? String(user.email).split('@')[0] : 'Anonymous';
    return user?.name || fallback;
  }, [user]);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 2600);
  };

  const refreshResources = async (code, { silent = false } = {}) => {
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
      return;
    }

    if (!silent) {
      setLoadingResources(true);
    }
    try {
      const data = await listRoomResources(normalized);
      const nextResources = data.resources || [];
      const nextJson = JSON.stringify(nextResources);
      const currentJson = JSON.stringify(resourcesRef.current);
      setActiveRoomCode(data.roomCode);
      if (nextJson !== currentJson) {
        setResources(nextResources);
        resourcesRef.current = nextResources;
      }
    } catch (error) {
      showMessage(error.message || 'Could not load room resources', 'error');
    } finally {
      if (!silent) {
        setLoadingResources(false);
      }
    }
  };

  const refreshSession = async (code, { silent = false } = {}) => {
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
      return;
    }

    if (!silent) {
      setLoadingSession(true);
    }
    try {
      const session = await getStudyRoomSession(normalized);
      const nextParticipants = session.participants || [];
      const nextMessages = session.messages || [];
      const nextParticipantsJson = JSON.stringify(nextParticipants.map(toComparableParticipant));
      const currentParticipantsJson = JSON.stringify(participantsRef.current.map(toComparableParticipant));
      const nextMessagesJson = JSON.stringify(nextMessages.map(toComparableMessage));
      const currentMessagesJson = JSON.stringify(messagesRef.current.map(toComparableMessage));

      if (nextParticipantsJson !== currentParticipantsJson) {
        setParticipants(nextParticipants);
        participantsRef.current = nextParticipants;
      }
      if (nextMessagesJson !== currentMessagesJson) {
        setChatMessages(nextMessages);
        messagesRef.current = nextMessages;
      }
    } catch (error) {
      showMessage(error.message || 'Could not load room session', 'error');
    } finally {
      if (!silent) {
        setLoadingSession(false);
      }
    }
  };

  const connectToRoom = async (inputCode) => {
    const normalized = normalizeRoomCode(inputCode);
    if (!normalized) {
      showMessage('Enter a valid room code to join.', 'error');
      return;
    }

    const savedMemberId = localStorage.getItem(`studyRoomMember:${normalized}`) || '';

    const joinData = await joinStudyRoom(normalized, uploaderName, savedMemberId);
    setRoomInput(joinData.roomCode);
    setActiveRoomCode(joinData.roomCode);
    setActiveMember(joinData.member);
    setParticipants(joinData.participants || []);
    participantsRef.current = joinData.participants || [];

    localStorage.setItem('studyRoomCode', joinData.roomCode);
    if (joinData.member?.memberId) {
      localStorage.setItem(`studyRoomMember:${joinData.roomCode}`, joinData.member.memberId);
      localStorage.setItem(`studyRoomMemberData:${joinData.roomCode}`, JSON.stringify(joinData.member));
    }

    await Promise.all([
      refreshResources(joinData.roomCode),
      refreshSession(joinData.roomCode),
    ]);
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      if (isNearBottom) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 0);
      }
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!activeRoomCode || !activeMember?.memberId) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      sendStudyRoomHeartbeat(activeRoomCode, activeMember.memberId).catch(() => {});
      refreshSession(activeRoomCode, { silent: true }).catch(() => {});
      refreshResources(activeRoomCode, { silent: true }).catch(() => {});
    }, 5000);

    return () => clearInterval(intervalId);
  }, [activeRoomCode, activeMember?.memberId]);

  const handleCreateRoom = async () => {
    const code = createRoomCode();
    try {
      await connectToRoom(code);
      setShowRoomPopup(false);
      setShowSharedResourcesPanel(false);
      showMessage(`Room created. Opening collaboration window...`);
      // Open SharedWorkspace in a new window
      setTimeout(() => {
        window.open(`/workspace/shared/${code}`, 'SharedWorkspace', 'width=1400,height=900,resizable=yes,scrollbars=yes');
      }, 600);
    } catch (error) {
      showMessage(error.message || 'Could not create room', 'error');
    }
  };

  const handleJoinRoom = async () => {
    const normalized = normalizeRoomCode(roomInput);
    try {
      await connectToRoom(normalized);
      setShowRoomPopup(false);
      setShowSharedResourcesPanel(false);
      showMessage(`Joined room ${normalized}. Opening collaboration window...`);
      // Open SharedWorkspace in a new window
      setTimeout(() => {
        window.open(`/workspace/shared/${normalized}`, 'SharedWorkspace', 'width=1400,height=900,resizable=yes,scrollbars=yes');
      }, 600);
    } catch (error) {
      showMessage(error.message || 'Could not join room', 'error');
    }
  };

  const handleSendMessage = async () => {
    const text = String(chatInput || '').trim();
    if (!text) {
      return;
    }

    if (!activeRoomCode || !activeMember?.memberId) {
      showMessage('Join a room first to start one-to-one chat.', 'error');
      return;
    }

    setSendingMessage(true);
    try {
      await sendStudyRoomMessage(activeRoomCode, activeMember.memberId, text);
      setChatInput('');
      await refreshSession(activeRoomCode);
    } catch (error) {
      showMessage(error.message || 'Could not send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpload = async (selectedFiles) => {
    const filesToUpload = Array.from(selectedFiles || []).filter(Boolean);
    if (!filesToUpload.length) {
      return;
    }

    if (!activeRoomCode) {
      showMessage('Join a room first to share resources.', 'error');
      return;
    }

    setUploading(true);
    try {
      for (const file of filesToUpload) {
        await uploadRoomResource(activeRoomCode, file, uploaderName);
      }
      showMessage(`${filesToUpload.length} file(s) shared in room ${activeRoomCode}`);
      await refreshResources(activeRoomCode);
    } catch (error) {
      showMessage(error.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const illustrations = [
    <IoChatbubblesOutline key="0" />,
    <IoEaselOutline key="1" />,
    <IoDocumentTextOutline key="2" />,
    <IoTimerOutline key="3" />
  ];

  return (
    <div className="module-page study-room-page">
      <div className="studyroom-global-bg" />
      <FloatingParticles />
      <GradientMesh colors={['#c9b7ff', '#a9c8ff', '#f4d7ff']} />
      
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(153,130,255,0.62), rgba(131,177,255,0.5), rgba(241,186,255,0.44))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-illustration" style={{ position: 'absolute', top: '-40px', right: '40px', opacity: 0.12, width: '300px', height: '300px' }}>
          <IllustrationNetwork />
        </div>
        <div className="module-hero-content">
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <IoChevronForward />
            <span>Study Room</span>
          </div>
          <h1>Study Room</h1>
          <p>Collaborate, discuss, and learn together in real-time study rooms.</p>
        </div>
      </motion.div>

      {showSharedResourcesPanel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(233, 229, 255, 0.42)',
            backdropFilter: 'blur(3px)',
            zIndex: 70,
            overflowY: 'auto',
            padding: 'min(6vh, 3rem) 1rem',
          }}
          onClick={() => setShowSharedResourcesPanel(false)}
        >
      <motion.div className="feature-grid" variants={container} initial="hidden" animate="show" style={{ marginBottom: 'var(--space-6)', maxWidth: '960px', marginLeft: 'auto', marginRight: 'auto', gap: '0.9rem' }} onClick={(event) => event.stopPropagation()}>
        <motion.div className="feature-card" variants={item} style={{ gridColumn: 'span 2', borderRadius: '26px', border: '1px solid rgba(255,255,255,0.45)', background: 'linear-gradient(145deg, rgba(250,250,255,0.72), rgba(240,237,255,0.62))', boxShadow: '0 18px 38px rgba(96, 104, 166, 0.18)', backdropFilter: 'blur(10px)' }}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-notes)', color: '#00685a' }}><IoDocumentTextOutline /></div>
            <div>
              <div className="feature-card-title">Shared Resources (Room Based)</div>
              <div className="feature-card-subtitle">Everyone in the same code can upload and view files</div>
            </div>
            <button className="btn-secondary" onClick={() => setShowSharedResourcesPanel(false)} style={{ borderRadius: '999px' }}>
              <IoCloseOutline />
            </button>
          </div>

          <div className="feature-item" style={{ marginBottom: '0.75rem', justifyContent: 'space-between', borderRadius: '14px', background: 'rgba(212, 217, 235, 0.35)' }}>
            <div>Active room</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="chip" style={{ background: activeRoomCode ? 'rgba(0,104,90,0.1)' : 'rgba(115,119,123,0.1)', color: activeRoomCode ? '#00685a' : '#73777b', letterSpacing: '0.06em' }}>
                {activeRoomCode || 'Not joined'}
              </span>
              <button className="btn-secondary" onClick={() => refreshResources(activeRoomCode)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '999px' }}>
                <IoRefreshOutline /> Refresh
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowRoomPopup(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '999px' }}
              >
                <IoLogInOutline /> Room Access
              </button>
            </div>
          </div>

          <div className="feature-card-action" style={{ marginBottom: '0.75rem' }}>
            <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading || !activeRoomCode} style={{ borderRadius: '999px', minHeight: '46px' }}>
              <IoCloudUploadOutline /> {uploading ? 'Uploading...' : 'Add Resource'}
            </button>
            <button className="btn-secondary" onClick={() => refreshResources(activeRoomCode)} disabled={!activeRoomCode || loadingResources} style={{ borderRadius: '999px' }}>
              <IoRefreshOutline /> Refresh
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="upload-hidden-input"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>

          {message && (
            <div className={`upload-message ${messageType === 'error' ? 'error' : 'success'}`}>
              {messageType === 'error' ? <IoWarningOutline /> : <IoCheckmarkCircleOutline />} {message}
            </div>
          )}

          <div className="uploaded-file-list" style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.28)', border: '1px dashed rgba(166, 171, 204, 0.42)' }}>
            {!activeRoomCode && <div className="uploaded-empty">Join or create a room code first.</div>}
            {activeRoomCode && loadingResources && <div className="uploaded-empty">Loading room resources...</div>}

            {activeRoomCode && !loadingResources && resources.length === 0 && (
              <div className="uploaded-empty">No shared resources yet in this room. Be the first to upload.</div>
            )}

            {activeRoomCode && !loadingResources && resources.map((resource) => (
              <div key={resource.id || resource.name} className="uploaded-file-item">
                <div className="uploaded-file-main">
                  <IoDocumentTextOutline />
                  <div>
                    <div className="uploaded-file-name">{resource.originalName || resource.name}</div>
                    <div className="uploaded-file-meta">
                      {formatBytes(resource.size)} • by {resource.uploadedBy || 'Anonymous'} • {new Date(resource.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <a className="btn-secondary" href={resource.url} target="_blank" rel="noreferrer">
                  <IoOpenOutline /> Open
                </a>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="feature-card" variants={item} style={{ gridColumn: 'span 2', borderRadius: '26px', border: '1px solid rgba(255,255,255,0.45)', background: 'linear-gradient(145deg, rgba(250,250,255,0.72), rgba(240,237,255,0.62))', boxShadow: '0 18px 38px rgba(96, 104, 166, 0.18)', backdropFilter: 'blur(10px)' }}>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-ai)', color: '#574db3' }}><IoChatbubblesOutline /></div>
            <div>
              <div className="feature-card-title">One-to-One Interactive Session</div>
              <div className="feature-card-subtitle">Live room chat between two participants in the same code</div>
            </div>
          </div>

          <div ref={chatContainerRef} className="uploaded-file-list" style={{ minHeight: '220px', maxHeight: '280px', overflowY: 'auto', marginBottom: '0.75rem', borderRadius: '16px', background: 'rgba(255,255,255,0.28)', border: '1px dashed rgba(166, 171, 204, 0.42)' }}>
            {!activeRoomCode && <div className="uploaded-empty">Join or create a room to start chat.</div>}
            {activeRoomCode && loadingSession && <div className="uploaded-empty">Loading chat...</div>}
            {activeRoomCode && !loadingSession && chatMessages.length === 0 && (
              <div className="uploaded-empty">No messages yet. Start the conversation.</div>
            )}

            {activeRoomCode && !loadingSession && chatMessages.map((chat) => (
              <div key={chat.messageId} className="uploaded-file-item" style={{ alignItems: 'flex-start' }}>
                <div className="uploaded-file-main" style={{ alignItems: 'flex-start' }}>
                  <IoChatbubblesOutline />
                  <div>
                    <div className="uploaded-file-name">{chat.displayName}{chat.memberId === activeMember?.memberId ? ' (You)' : ''}</div>
                    <div className="uploaded-file-meta">{new Date(chat.sentAt).toLocaleString()}</div>
                    <div style={{ marginTop: '0.35rem', color: 'var(--on-surface)', lineHeight: 1.4 }}>{chat.text}</div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message for the room"
              style={{
                flex: '1 1 260px',
                minHeight: '44px',
                borderRadius: '14px',
                border: '1px solid rgba(115,119,123,0.25)',
                background: 'rgba(255,255,255,0.72)',
                padding: '0 14px'
              }}
              disabled={!activeRoomCode || !activeMember?.memberId}
            />
            <button
              className="btn-primary"
              onClick={handleSendMessage}
              disabled={sendingMessage || !activeRoomCode || !activeMember?.memberId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '14px', minWidth: '180px' }}
            >
              <IoSendOutline /> {sendingMessage ? 'Sending...' : 'Send'}
            </button>
          </div>
        </motion.div>
      </motion.div>
        </div>
      )}

      {showRoomPopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.38)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            padding: '1rem',
          }}
          onClick={() => setShowRoomPopup(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(620px, 100%)',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(249,250,253,0.95))',
              border: '1px solid rgba(87,77,179,0.15)',
              boxShadow: '0 18px 40px rgba(26, 30, 36, 0.16)',
              padding: '1.2rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Room Access</div>
                <div style={{ color: 'var(--outline)', fontSize: '0.85rem' }}>Create or join a room for shared resources and one-to-one session</div>
              </div>
              <button className="btn-secondary" onClick={() => setShowRoomPopup(false)}>
                <IoCloseOutline />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={roomInput}
                onChange={(event) => setRoomInput(normalizeRoomCode(event.target.value))}
                placeholder="Enter room code (example: EDUA1B2C3)"
                style={{
                  flex: '1 1 260px',
                  minHeight: '44px',
                  borderRadius: '14px',
                  border: '1px solid rgba(115,119,123,0.25)',
                  background: 'rgba(255,255,255,0.8)',
                  padding: '0 14px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}
              />
              <button className="btn-primary" onClick={handleJoinRoom} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <IoLogInOutline /> Join Room
              </button>
              <button className="btn-secondary" onClick={handleCreateRoom} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <IoAddOutline /> Create Room
              </button>
            </div>

            <div className="feature-item" style={{ marginTop: '0.95rem', justifyContent: 'space-between' }}>
              <div>Participants in one-to-one session</div>
              <span className="chip" style={{ background: participants.length === 2 ? 'rgba(0,104,90,0.1)' : 'rgba(196,144,0,0.12)', color: participants.length === 2 ? '#00685a' : '#9c7000' }}>
                {participants.length}/2 connected
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
              {participants.length === 0 && <span className="chip">No participant yet</span>}
              {participants.map((person) => (
                <span key={person.memberId} className="chip" style={{ background: 'rgba(87,77,179,0.12)', color: '#574db3' }}>
                  {person.displayName}{person.memberId === activeMember?.memberId ? ' (You)' : ''}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <motion.div className="feature-grid" variants={container} initial="hidden" animate="show">
        <motion.div className="feature-card" variants={item}>
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(-5deg)' }}>
            {illustrations[0]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-study)', color: '#c49000' }}><IoChatbubblesOutline /></div>
            <div>
              <div className="feature-card-title">Real-time Discussion</div>
              <div className="feature-card-subtitle">Chat and share ideas</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(196,144,0,0.1)', color: '#c49000' }}><IoChatbubblesOutline /></div>Group messaging</div>
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(196,144,0,0.1)', color: '#c49000' }}><IoShareSocialOutline /></div>Share resources</div>
          </div>
        </motion.div>

        <motion.div className="feature-card" variants={item}>
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(8deg)' }}>
            {illustrations[1]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-ai)', color: '#574db3' }}><IoEaselOutline /></div>
            <div>
              <div className="feature-card-title">Collaborative Whiteboard</div>
              <div className="feature-card-subtitle">Draw and explain together</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(87,77,179,0.1)', color: '#574db3' }}><IoEaselOutline /></div>Shared drawing canvas</div>
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(87,77,179,0.1)', color: '#574db3' }}><IoVideocamOutline /></div>Screen sharing</div>
          </div>
        </motion.div>

        <motion.div
          className="feature-card"
          variants={item}
          style={{
            cursor: 'pointer',
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.38)',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.68), rgba(245,246,255,0.52))',
            boxShadow: '0 16px 40px rgba(48, 46, 102, 0.18)',
            backdropFilter: 'blur(8px)',
            overflow: 'hidden',
            padding: '1.55rem 1.45rem',
          }}
          onClick={() => setShowSharedResourcesPanel(true)}
        >
          <div className="feature-card-header" style={{ alignItems: 'center', paddingBottom: '1.05rem', gap: '1rem' }}>
            <div
              className="feature-card-icon"
              style={{
                background: 'linear-gradient(145deg, rgba(182, 233, 210, 0.9), rgba(209, 242, 227, 0.75))',
                color: '#0f8069',
                boxShadow: '0 10px 22px rgba(15, 128, 105, 0.24)',
                width: '74px',
                height: '74px',
                borderRadius: '22px',
                fontSize: '2rem',
              }}
            >
              <IoDocumentTextOutline />
            </div>
            <div>
              <div className="feature-card-title" style={{ fontSize: '2rem', lineHeight: 1.08, letterSpacing: '-0.02em', fontWeight: 800 }}>Shared Resources</div>
              <div className="feature-card-subtitle" style={{ fontSize: '1.1rem', marginTop: '0.2rem' }}>Upload and access files instantly</div>
            </div>
          </div>

          <div
            style={{
              borderRadius: '18px',
              border: '1px dashed rgba(116, 121, 153, 0.3)',
              background: 'rgba(255,255,255,0.34)',
              padding: '1rem',
            }}
          >
            <button
              className="btn-primary"
              onClick={(event) => {
                event.stopPropagation();
                setShowSharedResourcesPanel(true);
              }}
              style={{
                width: '100%',
                minHeight: '62px',
                borderRadius: '999px',
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.55rem',
                fontSize: '1.05rem',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                background: 'linear-gradient(100deg, #4f4cb8 0%, #6e64df 46%, #62a4ff 84%)',
                boxShadow: '0 12px 28px rgba(84, 94, 224, 0.36), inset 0 1px 0 rgba(255,255,255,0.25)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '0',
                  bottom: '0',
                  left: '-25%',
                  width: '44%',
                  background: 'linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.34) 48%, rgba(255,255,255,0) 100%)',
                  transform: 'skewX(-20deg)',
                  pointerEvents: 'none',
                }}
              />
              <IoOpenOutline /> Go To Shared Resources
            </button>
          </div>
        </motion.div>

        <motion.div className="feature-card" variants={item}>
          <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(8deg)' }}>
            {illustrations[3]}
          </div>
          <div className="feature-card-header">
            <div className="feature-card-icon" style={{ background: 'var(--accent-lecture)', color: '#b41340' }}><IoTimerOutline /></div>
            <div>
              <div className="feature-card-title">Group Timer</div>
              <div className="feature-card-subtitle">Study together in sync</div>
            </div>
          </div>
          <div className="feature-card-body">
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(180,19,64,0.1)', color: '#b41340' }}><IoTimerOutline /></div>Synced Pomodoro timer</div>
            <div className="feature-item"><div className="feature-item-icon" style={{ background: 'rgba(180,19,64,0.1)', color: '#b41340' }}><IoPeopleOutline /></div>Group accountability</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
