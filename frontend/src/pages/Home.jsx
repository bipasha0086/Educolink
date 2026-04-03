import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IoFlagOutline, IoTimerOutline, IoCreateOutline, IoMoonOutline,
  IoStatsChartOutline, IoBriefcaseOutline, IoDocumentTextOutline,
  IoRocketOutline, IoPeopleOutline, IoPlayCircleOutline,
  IoColorPaletteOutline, IoMoonSharp, IoBarChartOutline,
  IoCheckmarkSharp, IoTrophyOutline, IoSparklesOutline, IoCloseOutline,
  IoTrashOutline
} from 'react-icons/io5';
import {
  GradientMesh, FloatingParticles, AnimatedGradientBg,
  IllustrationBook3D, IllustrationTrophy, IllustrationLaptop
} from '../components/SVGBackgrounds/SVGBackgrounds';

const quotes = [
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.", author: "Richard Feynman" },
];

const modules = [
  { id: 'workspace', path: '/workspace', title: 'Smart Workspace', icon: <IoBriefcaseOutline />, features: ['Custom study websites', 'All-in-one workspace'], className: 'workspace' },
  { id: 'notes', path: '/notes', title: 'Notes Hub', icon: <IoDocumentTextOutline />, features: ['Digital notes organizer', 'Document scanner'], className: 'notes' },
  { id: 'ai', path: '/educoassist', title: 'EducoAssist', icon: <IoRocketOutline />, features: ['AI-powered assistance', 'Study plan generator'], className: 'ai' },
  { id: 'study', path: '/study-room', title: 'Study Room', icon: <IoPeopleOutline />, features: ['Collaborative studying', 'Real-time discussion'], className: 'study' },
  { id: 'lecture', path: '/lectures', title: 'Lecture Zone', icon: <IoPlayCircleOutline />, features: ['Video lectures', 'AI lecture summarizer'], className: 'lecture' },
  { id: 'visual', path: '/visual-labs', title: 'Visual Lab', icon: <IoColorPaletteOutline />, features: ['Flowchart maker', 'Mind map generator'], className: 'visual' },
  { id: 'focus', path: '/break', title: 'Break Zone', icon: <IoMoonSharp />, features: ['Distraction-free lock', 'Ambient focus toolkit'], className: 'focus' },
  { id: 'analytics', path: '/tools', title: 'Tools', icon: <IoBarChartOutline />, features: ['Study time tracking', 'Progress insights'], className: 'analytics-mod' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};

const FOCUS_PIN_KEY = 'educolink_focus_pin';
const POMODORO_TODAY_SECONDS_KEY = 'educolink_pomodoro_today_seconds';
const POMODORO_TODAY_DATE_KEY = 'educolink_pomodoro_today_date';
const QUICK_NOTES_DRAFT_KEY = 'educolink_quick_note_draft';
const QUICK_NOTES_LIST_KEY = 'educolink_quick_notes_list';

const generatePin = () => String(Math.floor(1000 + Math.random() * 9000));
const getTodayKey = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const navigate = useNavigate();
  const [currentQuote, setCurrentQuote] = useState(0);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState(25);
  const [todayPomodoroDate, setTodayPomodoroDate] = useState(getTodayKey());
  const [todayPomodoroSeconds, setTodayPomodoroSeconds] = useState(() => {
    const today = getTodayKey();
    const savedDate = localStorage.getItem(POMODORO_TODAY_DATE_KEY);
    const saved = localStorage.getItem(POMODORO_TODAY_SECONDS_KEY);
    const parsed = Number(saved);
    if (savedDate !== today) {
      return 0;
    }

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const initialGoals = [
    { id: 1, text: 'Complete Math Chapter 5', done: false, createdAt: now.toISOString(), completedAt: null },
    { id: 2, text: 'Review Physics Notes', done: true, createdAt: twoDaysAgo, completedAt: oneDayAgo },
    { id: 3, text: 'Solve 10 Coding Problems', done: false, createdAt: now.toISOString(), completedAt: null },
  ];
  const [goals, setGoals] = useState(() => initialGoals.filter((g) => !g.done));
  const [goalHistory, setGoalHistory] = useState(initialGoals);
  const [showGoalHistory, setShowGoalHistory] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [quickNote, setQuickNote] = useState(() => localStorage.getItem(QUICK_NOTES_DRAFT_KEY) || '');
  const [savedNotes, setSavedNotes] = useState(() => {
    try {
      const raw = localStorage.getItem(QUICK_NOTES_LIST_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [dndActive, setDndActive] = useState(false);
  const [focusDuration, setFocusDuration] = useState(45);
  const [customFocusValue, setCustomFocusValue] = useState('');
  const [customFocusUnit, setCustomFocusUnit] = useState('m');
  const [focusEndAt, setFocusEndAt] = useState(null);
  const [focusTimeLeft, setFocusTimeLeft] = useState(0);
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [showPinUnlockModal, setShowPinUnlockModal] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [confirmSetupPin, setConfirmSetupPin] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Pomodoro timer
  useEffect(() => {
    let interval;
    if (isRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime((t) => t - 1);
        setTodayPomodoroSeconds((s) => s + 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, pomodoroTime]);

  useEffect(() => {
    localStorage.setItem(POMODORO_TODAY_SECONDS_KEY, String(todayPomodoroSeconds));
    localStorage.setItem(POMODORO_TODAY_DATE_KEY, todayPomodoroDate);
  }, [todayPomodoroDate, todayPomodoroSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nowDay = getTodayKey();
      if (nowDay !== todayPomodoroDate) {
        setTodayPomodoroDate(nowDay);
        setTodayPomodoroSeconds(0);
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [todayPomodoroDate]);

  useEffect(() => {
    localStorage.setItem(QUICK_NOTES_DRAFT_KEY, quickNote);
  }, [quickNote]);

  useEffect(() => {
    localStorage.setItem(QUICK_NOTES_LIST_KEY, JSON.stringify(savedNotes));
  }, [savedNotes]);

  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  const formatFocusClock = useCallback((seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  const formatFocusDurationLabel = useCallback((minutes) => {
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return `${hours}h`;
    }

    return `${minutes}m`;
  }, []);

  const selectTimer = (mins) => {
    setSelectedTimer(mins);
    setPomodoroTime(mins * 60);
    setIsRunning(false);
  };

  const completeGoal = (id) => {
    const completedAt = new Date().toISOString();
    setGoals((prevGoals) => prevGoals.filter((g) => g.id !== id));
    setGoalHistory((prevHistory) => prevHistory.map((g) => (
      g.id === id
        ? { ...g, done: true, completedAt }
        : g
    )));
  };

  const addGoal = () => {
    const trimmed = newGoalText.trim();
    if (!trimmed) {
      return;
    }

    const nextGoal = {
      id: Date.now(),
      text: trimmed,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    setGoals((prevGoals) => [nextGoal, ...prevGoals]);
    setGoalHistory((prevHistory) => [nextGoal, ...prevHistory]);
    setNewGoalText('');
  };

  const last30Start = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const monthlySetGoals = goalHistory.filter((g) => new Date(g.createdAt).getTime() >= last30Start).length;
  const monthlyDoneGoals = goalHistory.filter((g) => g.completedAt && new Date(g.completedAt).getTime() >= last30Start).length;
  const monthlyCompletionTimes = goalHistory
    .filter((g) => g.completedAt && new Date(g.completedAt).getTime() >= last30Start)
    .map((g) => (new Date(g.completedAt).getTime() - new Date(g.createdAt).getTime()) / (1000 * 60 * 60));
  const avgCompletionHours = monthlyCompletionTimes.length
    ? (monthlyCompletionTimes.reduce((acc, hours) => acc + hours, 0) / monthlyCompletionTimes.length)
    : 0;
  const monthlyCompletionRate = monthlySetGoals ? Math.round((monthlyDoneGoals / monthlySetGoals) * 100) : 0;
  const monthlyHistoryRows = goalHistory
    .filter((g) => {
      const createdIn30d = new Date(g.createdAt).getTime() >= last30Start;
      const completedIn30d = g.completedAt && new Date(g.completedAt).getTime() >= last30Start;
      return createdIn30d || completedIn30d;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const barHeights = [60, 80, 45, 90, 70, 55, 85];
  const totalSelectedSeconds = selectedTimer * 60;
  const elapsedSeconds = Math.max(0, totalSelectedSeconds - pomodoroTime);
  const timerFillPercentage = totalSelectedSeconds ? Math.min(100, Math.max(0, (elapsedSeconds / totalSelectedSeconds) * 100)) : 0;
  const todayPomodoroHours = (todayPomodoroSeconds / 3600).toFixed(1);

  const formatGoalDate = (iso) => new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const getGoalFinishTime = (goal) => {
    if (!goal.completedAt) {
      return '--';
    }

    const hours = (new Date(goal.completedAt).getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60);
    return `${hours.toFixed(1)}h`;
  };

  const addQuickNote = () => {
    const trimmed = quickNote.trim();
    if (!trimmed) {
      return;
    }

    const nextNote = {
      id: Date.now(),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setSavedNotes((prev) => [nextNote, ...prev].slice(0, 30));
    setQuickNote('');
  };

  const deleteQuickNote = (id) => {
    setSavedNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const clearQuickNoteDraft = () => {
    setQuickNote('');
  };

  const formatNoteDate = (iso) => new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const applyCustomFocusDuration = () => {
    const parsed = Number(customFocusValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    const minutes = customFocusUnit === 'h' ? parsed * 60 : parsed;
    const safeMinutes = Math.min(480, Math.max(1, Math.round(minutes)));
    setFocusDuration(safeMinutes);
    setCustomFocusValue('');
  };

  const adjustCustomFocusValue = (delta) => {
    const current = Number(customFocusValue || 0);
    const maxValue = customFocusUnit === 'h' ? 8 : 480;
    const next = Math.min(maxValue, Math.max(0, current + delta));
    setCustomFocusValue(next ? String(next) : '');
  };

  const enterFullscreen = async () => {
    if (document.fullscreenElement) {
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setPinMessage('Fullscreen request was blocked. Click toggle again.');
    }
  };

  const enableFocusMode = async () => {
    setPinMessage('');
    setDndActive(true);
    const nextEndAt = Date.now() + focusDuration * 60 * 1000;
    setFocusEndAt(nextEndAt);
    setFocusTimeLeft(focusDuration * 60);
    await enterFullscreen();
  };

  const handleToggleFocus = async () => {
    if (!dndActive) {
      const existingPin = localStorage.getItem(FOCUS_PIN_KEY);
      if (!existingPin) {
        setShowPinSetupModal(true);
        return;
      }

      await enableFocusMode();
      return;
    }

    setShowPinUnlockModal(true);
    setPinMessage('Enter PIN to exit Focus Mode.');
  };

  const handleCreatePinAndStart = async () => {
    if (!setupPin || !confirmSetupPin) {
      setPinMessage('Enter PIN and confirm PIN.');
      return;
    }

    if (!/^\d{4,6}$/.test(setupPin)) {
      setPinMessage('PIN must be 4 to 6 digits.');
      return;
    }

    if (setupPin !== confirmSetupPin) {
      setPinMessage('PIN does not match.');
      return;
    }

    localStorage.setItem(FOCUS_PIN_KEY, setupPin);
    setShowPinSetupModal(false);
    setSetupPin('');
    setConfirmSetupPin('');
    setPinMessage('PIN created. Focus Mode locked.');
    await enableFocusMode();
  };

  const handleGeneratePin = () => {
    const pin = generatePin();
    setSetupPin(pin);
    setConfirmSetupPin(pin);
    setPinMessage(`Generated PIN: ${pin}`);
  };

  const handleUnlockFocus = async () => {
    const savedPin = localStorage.getItem(FOCUS_PIN_KEY);
    if (!savedPin) {
      setPinMessage('No PIN found. Please create PIN again.');
      setShowPinUnlockModal(false);
      setShowPinSetupModal(true);
      return;
    }

    if (unlockPin !== savedPin) {
      setPinMessage('Incorrect PIN.');
      return;
    }

    setUnlockPin('');
    setShowPinUnlockModal(false);
    setPinMessage('');
    setDndActive(false);
    setFocusEndAt(null);
    setFocusTimeLeft(0);

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
  };

  const handleForgotPin = () => {
    const pin = generatePin();
    localStorage.setItem(FOCUS_PIN_KEY, pin);
    setPinMessage(`New PIN generated: ${pin}`);
    setUnlockPin('');
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      if (dndActive && !document.fullscreenElement) {
        setShowPinUnlockModal(true);
        setPinMessage('Focus lock active. Enter PIN to exit.');
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [dndActive]);

  useEffect(() => {
    if (!dndActive || !focusEndAt) {
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.floor((focusEndAt - Date.now()) / 1000));
      setFocusTimeLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [dndActive, focusEndAt]);

  return (
    <div className="home-page">
      {(showPinSetupModal || showPinUnlockModal) && <div className="focus-lock-overlay" />}

      {showGoalHistory && <div className="goal-history-overlay" onClick={() => setShowGoalHistory(false)} />}

      {showGoalHistory && (
        <div className="goal-history-modal">
          <div className="goal-history-header">
            <h3>30-Day Goal History</h3>
            <button
              type="button"
              className="goal-history-close"
              onClick={() => setShowGoalHistory(false)}
              aria-label="Close history"
            >
              <IoCloseOutline />
            </button>
          </div>
          <div className="goal-history-summary">
            <span>Set: {monthlySetGoals}</span>
            <span>Done: {monthlyDoneGoals}</span>
            <span>Rate: {monthlyCompletionRate}%</span>
          </div>
          <div className="goal-history-table">
            <div className="goal-history-row goal-history-head">
              <span>Goal</span>
              <span>Status</span>
              <span>Set</span>
              <span>Finish</span>
            </div>
            {monthlyHistoryRows.length ? monthlyHistoryRows.map((goal) => (
              <div key={goal.id} className="goal-history-row">
                <span className="goal-history-text">{goal.text}</span>
                <span className={`goal-history-status ${goal.done ? 'done' : 'open'}`}>
                  {goal.done ? 'Done' : 'Open'}
                </span>
                <span>{formatGoalDate(goal.createdAt)}</span>
                <span>{getGoalFinishTime(goal)}</span>
              </div>
            )) : (
              <div className="goal-history-empty">No goals in the last 30 days.</div>
            )}
          </div>
        </div>
      )}

      {showPinSetupModal && (
        <div className="focus-lock-modal">
          <h3>Set Focus PIN</h3>
          <p>Create a PIN to exit fullscreen Focus Mode.</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            className="focus-lock-input"
            placeholder="Enter PIN (4-6 digits)"
            value={setupPin}
            onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, ''))}
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            className="focus-lock-input"
            placeholder="Confirm PIN"
            value={confirmSetupPin}
            onChange={(e) => setConfirmSetupPin(e.target.value.replace(/\D/g, ''))}
          />
          {pinMessage && <div className="focus-lock-message">{pinMessage}</div>}
          <div className="focus-lock-actions">
            <button type="button" className="btn-secondary" onClick={handleGeneratePin}>Generate PIN</button>
            <button type="button" className="btn-primary" onClick={handleCreatePinAndStart}>Save & Start</button>
          </div>
        </div>
      )}

      {showPinUnlockModal && (
        <div className="focus-lock-modal">
          <h3>Unlock Focus Mode</h3>
          <p>Enter your PIN to exit fullscreen mode.</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            className="focus-lock-input"
            placeholder="Enter PIN"
            value={unlockPin}
            onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
          />
          {pinMessage && <div className="focus-lock-message">{pinMessage}</div>}
          <div className="focus-lock-actions">
            <button type="button" className="btn-secondary" onClick={handleForgotPin}>Forgot PIN</button>
            <button type="button" className="btn-primary" onClick={handleUnlockFocus}>Unlock</button>
          </div>
        </div>
      )}

      {/* Background Elements */}
      <FloatingParticles />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
        <GradientMesh colors={['#574db3', '#9c93fe', '#b8b3ff']} />
      </div>

      {/* Mini Modules */}
      <motion.div className="mini-modules" variants={container} initial="hidden" animate="show">
        {/* Goal Tracker */}
        <motion.div className="mini-card goal-tracker" variants={item}>
          <div className="mini-card-header">
            <div className="mini-card-icon"><IoFlagOutline /></div>
          </div>
          <div className="mini-card-title">Goal Tracker</div>
          <div className="goal-add-row">
            <input
              className="goal-add-input"
              type="text"
              placeholder="Add new goal"
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addGoal();
                }
              }}
            />
          </div>
          <div className="goal-list" style={{ marginTop: '0.5rem' }}>
            {goals.length ? goals.map((goal) => (
              <div key={goal.id} className="goal-item">
                <span>{goal.text}</span>
                <button
                  type="button"
                  className="goal-done-btn"
                  onClick={() => completeGoal(goal.id)}
                >
                  Done
                </button>
              </div>
            )) : (
              <div className="goal-empty">No active goals. Add a new one above.</div>
            )}
          </div>
          <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
            <div className="progress-bar-fill" style={{ width: `${monthlyCompletionRate}%` }} />
          </div>
          <div className="goal-monthly-summary">
            <span>30d set: {monthlySetGoals}</span>
            <span>done: {monthlyDoneGoals}</span>
          </div>
        </motion.div>

        {/* Pomodoro Timer */}
        <motion.div className="mini-card pomodoro" variants={item}>
          <div className="pomodoro-water-bg" aria-hidden="true">
            <div className="pomodoro-water-outline">
              <div className="pomodoro-water-fill" style={{ height: `${timerFillPercentage}%` }}>
                <div className={`pomodoro-wave ${isRunning ? 'running' : ''}`} />
                <div className={`pomodoro-drops ${isRunning ? 'running' : ''}`}>
                  <span />
                  <span />
                  <span />
                </div>
                <div className="pomodoro-bubbles">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
          <div className="mini-card-header">
            <div className="mini-card-icon"><IoTimerOutline /></div>
            <div className="pomodoro-total-badge">{todayPomodoroHours}h today</div>
          </div>
          <div className="mini-card-title">Pomodoro</div>
          <div className="pomodoro-display">{formatTime(pomodoroTime)}</div>
          <div className="pomodoro-buttons">
            {[15, 25, 30, 45, 60].map((m) => (
              <button
                key={m}
                className={`pomodoro-btn ${selectedTimer === m ? 'active' : ''}`}
                onClick={() => selectTimer(m)}
              >
                {m}m
              </button>
            ))}
          </div>
          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.75rem' }}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
        </motion.div>

        {/* Quick Notes */}
        <motion.div className="mini-card quick-notes" variants={item}>
          <div className="mini-card-header">
            <div className="mini-card-icon"><IoCreateOutline /></div>
          </div>
          <div className="mini-card-title">Quick Notes</div>
          <textarea
            className="quick-note-input"
            placeholder="Write note and press + or Cmd/Ctrl + Enter"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                addQuickNote();
              }
            }}
          />
          <div className="quick-note-actions">
            <button type="button" className="quick-note-btn" onClick={addQuickNote}>Save</button>
            <button
              type="button"
              className="quick-note-btn"
              onClick={clearQuickNoteDraft}
              disabled={!quickNote.trim()}
            >
              Clear
            </button>
          </div>
          <div className="quick-notes-list">
            {savedNotes.length ? savedNotes.map((note) => (
              <div key={note.id} className="quick-note-item">
                <div className="quick-note-item-text">{note.text}</div>
                <div className="quick-note-item-footer">
                  <span>{formatNoteDate(note.createdAt)}</span>
                  <button
                    type="button"
                    className="quick-note-delete"
                    onClick={() => deleteQuickNote(note.id)}
                    aria-label="Delete note"
                  >
                    <IoTrashOutline />
                  </button>
                </div>
              </div>
            )) : (
              <div className="quick-notes-empty">No saved notes yet.</div>
            )}
          </div>
        </motion.div>

        {/* DND Toggle */}
        <motion.div className="mini-card dnd" variants={item}>
          <div className="mini-card-header">
            <div className="mini-card-icon"><IoMoonOutline /></div>
          </div>
          <div className="mini-card-title">Focus Mode</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div
              className={`toggle-track ${dndActive ? 'active' : ''}`}
              onClick={handleToggleFocus}
            >
              <div className="toggle-thumb" />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: dndActive ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
              {dndActive ? 'Active' : 'Off'}
            </span>
          </div>
          <div className="focus-presets" style={{ marginTop: '0.45rem' }}>
            {[15, 25, 30, 45, 60, 90, 120, 180, 240].map((mins) => (
              <button
                key={mins}
                type="button"
                className={`focus-preset-btn ${focusDuration === mins ? 'active' : ''}`}
                onClick={() => setFocusDuration(mins)}
                disabled={dndActive}
              >
                {formatFocusDurationLabel(mins)}
              </button>
            ))}
          </div>
          <div className="focus-manual-row">
            <input
              type="text"
              inputMode="numeric"
              className="focus-manual-input"
              placeholder="Custom time"
              value={customFocusValue}
              onChange={(e) => setCustomFocusValue(e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  adjustCustomFocusValue(1);
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  adjustCustomFocusValue(-1);
                }
              }}
              disabled={dndActive}
            />
            <select
              className="focus-manual-unit"
              value={customFocusUnit}
              onChange={(e) => setCustomFocusUnit(e.target.value)}
              disabled={dndActive}
            >
              <option value="m">min</option>
              <option value="h">hr</option>
            </select>
            <button
              type="button"
              className="focus-manual-apply"
              onClick={applyCustomFocusDuration}
              disabled={dndActive || !customFocusValue}
            >
              Set
            </button>
          </div>
          <p className="focus-next-session">
            {dndActive
              ? `Session left: ${formatFocusClock(focusTimeLeft)}`
              : `Next session: ${formatFocusDurationLabel(focusDuration)}`}
          </p>
        </motion.div>

        {/* Analytics Summary */}
        <motion.div className="mini-card analytics" variants={item}>
          <div className="mini-card-header">
            <div className="mini-card-icon"><IoStatsChartOutline /></div>
          </div>
          <div className="mini-card-title">Analytics</div>
          <div className="mini-bars">
            {barHeights.map((h, i) => (
              <div key={i} className="mini-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="insights-monthly-block">
            <p>Pomodoro today: {todayPomodoroHours}h</p>
            <p>30d Completion: {monthlyCompletionRate}%</p>
            <p>Avg finish time: {avgCompletionHours ? `${avgCompletionHours.toFixed(1)}h` : '--'}</p>
            <p>Goals done: {monthlyDoneGoals}/{monthlySetGoals || 0}</p>
          </div>
          <button
            type="button"
            className="history-open-btn"
            onClick={() => setShowGoalHistory(true)}
          >
            View 30d history
          </button>
        </motion.div>
      </motion.div>

      {/* Motivational Quote */}
      <motion.div
        className="quote-section"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="quote-illustration-container">
          <IllustrationTrophy />
        </div>
        <div className="quote-decoration">
          <IoTrophyOutline style={{ color: 'var(--primary-container)' }} />
        </div>
        <div className="quote-label">
          <IoSparklesOutline style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          Motivational Quote of the Day
        </div>
        <motion.div
          key={currentQuote}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <p className="quote-text">"{quotes[currentQuote].text}"</p>
          <p className="quote-author">— {quotes[currentQuote].author}</p>
        </motion.div>
      </motion.div>

      {/* Module Grid */}
      <h2 className="module-grid-title">Explore Modules</h2>
      <motion.div className="module-grid" variants={container} initial="hidden" animate="show">
        {modules.map((mod) => {
          const cardIllustrations = {
            workspace: <IllustrationLaptop key="workspace" />,
            notes: <IllustrationBook3D key="notes" />,
            ai: (
              <div key="ai" style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoRocketOutline size={100} style={{ opacity: 0.3, color: '#574db3' }} />
              </div>
            ),
            study: (
              <div key="study" style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoPeopleOutline size={100} style={{ opacity: 0.3, color: '#00685a' }} />
              </div>
            ),
            lecture: (
              <div key="lecture" style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoPlayCircleOutline size={100} style={{ opacity: 0.3, color: '#c7426a' }} />
              </div>
            ),
            visual: (
              <div key="visual" style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoColorPaletteOutline size={100} style={{ opacity: 0.3, color: '#864a4b' }} />
              </div>
            ),
            focus: (
              <div key="focus" style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoMoonSharp size={100} style={{ opacity: 0.25, color: '#7b55b2' }} />
              </div>
            ),
            analytics: (
              <div key="analytics" style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IoBarChartOutline size={100} style={{ opacity: 0.3, color: '#c14f87' }} />
              </div>
            ),
          };

          const illustration = cardIllustrations[mod.id] || (
            <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IoSparklesOutline size={90} style={{ opacity: 0.25, color: '#574db3' }} />
            </div>
          );

          return (
            <motion.div
              key={mod.id}
              className={`module-card ${mod.className}`}
              variants={item}
              onClick={() => navigate(mod.path)}
              whileHover={{ scale: 1.03, y: -5 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="module-card-illustration">
                {illustration}
              </div>
              <div className="module-card-icon">{mod.icon}</div>
              <div className="module-card-title">{mod.title}</div>
              <div className="module-card-features">
                {mod.features.map((feat, i) => (
                  <div key={i} className="module-card-feature">
                    <div className="check"><IoCheckmarkSharp /></div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
