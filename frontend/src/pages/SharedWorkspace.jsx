import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IoArrowBackOutline,
  IoCloudUploadOutline,
  IoDocumentTextOutline,
  IoOpenOutline,
  IoRefreshOutline,
  IoCheckmarkCircleOutline,
  IoWarningOutline,
  IoPeopleOutline,
  IoChatbubblesOutline,
  IoSendOutline,
  IoCopyOutline,
  IoCloseOutline,
} from 'react-icons/io5';
import {
  getStudyRoomSession,
  listRoomResources,
  normalizeRoomCode,
  sendStudyRoomHeartbeat,
  sendStudyRoomMessage,
  uploadRoomResource,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

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

export default function SharedWorkspace() {
  const navigate = useNavigate();
  const { roomCode: paramRoomCode } = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const resourcesRef = useRef([]);
  const participantsRef = useRef([]);
  const chatMessagesRef = useRef([]);

  // Initialize from URL params or localStorage to avoid flicker
  const initializeRoomCode = () => {
    if (paramRoomCode) {
      return normalizeRoomCode(paramRoomCode);
    }
    const saved = localStorage.getItem('studyRoomCode');
    return saved ? normalizeRoomCode(saved) : '';
  };

  const initializeActiveMember = () => {
    const code = initializeRoomCode();
    if (!code) return null;
    const memberData = localStorage.getItem(`studyRoomMemberData:${code}`);
    try {
      return memberData ? JSON.parse(memberData) : null;
    } catch {
      return null;
    }
  };

  const initializeCachedResources = () => {
    const code = initializeRoomCode();
    if (!code) return [];
    try {
      const cached = localStorage.getItem(`studyRoomResources:${code}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  const initializeCachedMessages = () => {
    const code = initializeRoomCode();
    if (!code) return [];
    try {
      const cached = localStorage.getItem(`studyRoomMessages:${code}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  const initializeCachedParticipants = () => {
    const code = initializeRoomCode();
    if (!code) return [];
    try {
      const cached = localStorage.getItem(`studyRoomParticipants:${code}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  const [roomCode, setRoomCode] = useState(initializeRoomCode());
  const [activeMember, setActiveMember] = useState(initializeActiveMember());
  const [participants, setParticipants] = useState(initializeCachedParticipants());
  const [resources, setResources] = useState(initializeCachedResources());
  const [chatMessages, setChatMessages] = useState(initializeCachedMessages());
  const [chatInput, setChatInput] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [copied, setCopied] = useState(false);

  const uploaderName = useMemo(() => {
    const fallback = user?.email ? String(user.email).split('@')[0] : 'Anonymous';
    return user?.name || fallback;
  }, [user]);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 2600);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const refreshResources = async ({ silent = false } = {}) => {
    if (!roomCode) return;
    if (!silent) {
      setLoadingFiles(true);
    }
    try {
      const data = await listRoomResources(roomCode);
      const nextResources = data.resources || [];
      const nextResourcesJson = JSON.stringify(nextResources);
      const currentResourcesJson = JSON.stringify(resourcesRef.current);
      if (nextResourcesJson !== currentResourcesJson) {
        setResources(nextResources);
        resourcesRef.current = nextResources;
        localStorage.setItem(`studyRoomResources:${roomCode}`, nextResourcesJson);
      }
    } catch (error) {
      showMessage(error.message || 'Could not load resources', 'error');
    } finally {
      if (!silent) {
        setLoadingFiles(false);
      }
    }
  };

  const refreshSession = async ({ silent = false } = {}) => {
    if (!roomCode) return;
    try {
      const session = await getStudyRoomSession(roomCode);
      const nextParticipants = session.participants || [];
      const nextMessages = session.messages || [];
      const nextParticipantsJson = JSON.stringify(nextParticipants.map(toComparableParticipant));
      const currentParticipantsJson = JSON.stringify(participantsRef.current.map(toComparableParticipant));
      const nextMessagesJson = JSON.stringify(nextMessages.map(toComparableMessage));
      const currentMessagesJson = JSON.stringify(chatMessagesRef.current.map(toComparableMessage));
      if (nextParticipantsJson !== currentParticipantsJson) {
        setParticipants(nextParticipants);
        participantsRef.current = nextParticipants;
        localStorage.setItem(`studyRoomParticipants:${roomCode}`, nextParticipantsJson);
      }
      if (nextMessagesJson !== currentMessagesJson) {
        setChatMessages(nextMessages);
        chatMessagesRef.current = nextMessages;
        localStorage.setItem(`studyRoomMessages:${roomCode}`, nextMessagesJson);
      }
    } catch (error) {
      showMessage(error.message || 'Could not load session', 'error');
    }
  };

  const handleUpload = async (selectedFiles) => {
    const filesToUpload = Array.from(selectedFiles || []).filter(Boolean);
    if (!filesToUpload.length) {
      return;
    }

    setUploadingFile(true);
    try {
      for (const file of filesToUpload) {
        await uploadRoomResource(roomCode, file, uploaderName);
      }
      showMessage(`${filesToUpload.length} file(s) shared successfully`);
      await refreshResources();
    } catch (error) {
      showMessage(error.message || 'Upload failed', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendMessage = async () => {
    const text = String(chatInput || '').trim();
    if (!text || !activeMember?.memberId) {
      return;
    }

    setSendingMessage(true);
    try {
      await sendStudyRoomMessage(roomCode, activeMember.memberId, text);
      setChatInput('');
      await refreshSession();
    } catch (error) {
      showMessage(error.message || 'Could not send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  // Load initial data on mount
  useEffect(() => {
    const initializeData = async () => {
      if (!roomCode || !activeMember?.memberId) {
        setIsInitialized(true);
        return;
      }
      try {
        await Promise.all([
          refreshResources(),
          refreshSession(),
        ]);
      } catch {
        // Errors already handled in refresh functions
      } finally {
        resourcesRef.current = initializeCachedResources();
        participantsRef.current = initializeCachedParticipants();
        chatMessagesRef.current = initializeCachedMessages();
        setIsInitialized(true);
      }
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    if (!roomCode || !activeMember?.memberId) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendStudyRoomHeartbeat(roomCode, activeMember.memberId).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    sendStudyRoomHeartbeat(roomCode, activeMember.memberId).catch(() => {});

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomCode, activeMember?.memberId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      const isNearBottom = chatContainerRef.current.scrollTop + chatContainerRef.current.clientHeight >= chatContainerRef.current.scrollHeight - 100;
      if (isNearBottom) {
        setTimeout(() => {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }, 0);
      }
    }
  }, [chatMessages]);

  if (!roomCode || !activeMember) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <p style={{ fontSize: '16px', fontWeight: 600 }}>Loading study workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #f5ecdf 0%, #ede7ff 50%, #e8eeff 100%)', overflow: 'hidden' }}>
      {/* Sidebar - Room Info */}
      <div style={{ width: '300px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)', borderRight: '1px solid rgba(255, 255, 255, 0.3)', display: 'flex', flexDirection: 'column', padding: '24px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Study Workspace</h2>
          <button onClick={() => window.close()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#764ba2', hover: { opacity: 0.7 } }}>
            <IoCloseOutline />
          </button>
        </div>

        {/* Room Code */}
        <div style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)', border: '1px solid rgba(102, 126, 234, 0.2)', borderRadius: '14px', padding: '16px', marginBottom: '22px' }}>
          <div style={{ fontSize: '11px', color: '#667eea', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Room Code</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.12em', flex: 1, color: '#333' }}>{roomCode}</div>
            <button onClick={copyRoomCode} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: copied ? '#00a86b' : '#667eea', transition: 'color 0.2s' }}>
              <IoCopyOutline />
            </button>
          </div>
          {copied && <div style={{ fontSize: '11px', color: '#00a86b', marginTop: '6px', fontWeight: 600 }}>✓ Copied to clipboard!</div>}
        </div>

        {/* Participants */}
        <div style={{ marginBottom: '26px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#667eea', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Participants ({participants.length}/2)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {participants.map((person) => (
              <div key={person.memberId} style={{ background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(102, 126, 234, 0.15)', borderRadius: '10px', padding: '12px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 700 }}>
                    {person.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 700, color: '#333' }}>{person.displayName}</span>
                  {person.memberId === activeMember?.memberId && <span style={{ fontSize: '10px', color: '#00a86b', background: 'rgba(0, 168, 107, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>You</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => window.close()} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '10px', padding: '13px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: 'auto', fontSize: '13px', transition: 'transform 0.2s' }}>
          <IoArrowBackOutline /> Exit Workspace
        </button>
      </div>

      {/* Main Content - Split into Resources and Chat */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Shared Resources */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(8px)' }}>
            <h3 style={{ margin: 0, marginBottom: '14px', fontSize: '18px', fontWeight: 800, color: '#333' }}>📚 Shared Resources</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} style={{ padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, transition: 'transform 0.2s', opacity: uploadingFile ? 0.6 : 1 }}>
                <IoCloudUploadOutline /> {uploadingFile ? 'Uploading...' : 'Upload Files'}
              </button>
              <button onClick={refreshResources} disabled={loadingFiles} style={{ padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.05)', color: '#333', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <IoRefreshOutline /> Refresh
              </button>
              <input ref={fileInputRef} type="file" multiple className="upload-hidden-input" onChange={(e) => handleUpload(e.target.files)} />
            </div>
            {message && (
              <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '8px', background: messageType === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 168, 107, 0.1)', border: `1px solid ${messageType === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 168, 107, 0.3)'}`, color: messageType === 'error' ? '#dc2626' : '#00a86b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                {messageType === 'error' ? <IoWarningOutline /> : <IoCheckmarkCircleOutline />} {message}
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {loadingFiles && <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', marginTop: '20px' }}>⏳ Loading resources...</div>}
            {!loadingFiles && resources.length === 0 && <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', marginTop: '20px' }}>📭 No resources yet. Upload study materials to share!</div>}

            {resources.map((resource) => (
              <div key={resource.id} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(102, 126, 234, 0.1)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '24px' }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '4px' }}>{resource.originalName || resource.name}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {formatBytes(resource.size)} • by <span style={{ fontWeight: 600 }}>{resource.uploadedBy}</span> • {new Date(resource.uploadedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <a href={resource.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, transition: 'transform 0.2s' }}>
                  <IoOpenOutline /> Open
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        <div style={{ width: '360px', display: 'flex', flexDirection: 'column', background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(8px)', borderLeft: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
              <IoChatbubblesOutline /> Chat
            </h3>
          </div>

          <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chatMessages.length === 0 && <div style={{ textAlign: 'center', color: '#999', fontSize: '12px', marginTop: '20px' }}>💬 No messages yet. Start chatting!</div>}
            {chatMessages.map((chat) => (
              <div key={chat.messageId} style={{ background: chat.memberId === activeMember?.memberId ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(200, 240, 255, 0.6)', color: chat.memberId === activeMember?.memberId ? 'white' : '#333', borderRadius: '10px', padding: '11px 14px', fontSize: '12px', maxWidth: '100%', wordBreak: 'break-word', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, marginBottom: '3px', fontSize: '11px', opacity: 0.8 }}>{chat.displayName}</div>
                <div style={{ lineHeight: 1.4 }}>{chat.text}</div>
                <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>{new Date(chat.sentAt).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: '8px' }}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type message..." style={{ flex: 1, borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', padding: '10px 12px', fontSize: '12px', background: 'rgba(255, 255, 255, 0.7)', outline: 'none', transition: 'all 0.2s' }} />
            <button onClick={handleSendMessage} disabled={sendingMessage || !chatInput.trim()} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sendingMessage || !chatInput.trim() ? 0.6 : 1, fontSize: '14px' }}>
              <IoSendOutline />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
