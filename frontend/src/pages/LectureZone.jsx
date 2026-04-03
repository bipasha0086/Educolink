import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoChevronForward,
  IoPlayCircleOutline,
  IoBookOutline,
  IoMicOutline,
  IoDocumentTextOutline,
  IoOpenOutline,
  IoSaveOutline,
  IoCopyOutline,
  IoSearchOutline
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';
import { askEducoAssist, fetchLectureTranscript, verifyLectureVideo } from '../services/api';

const lectureTools = [
  { title: 'Live Lectures', text: 'Join live classes and keep synchronized notes.', icon: <IoPlayCircleOutline /> },
  { title: 'Transcripts', text: 'Auto-generate text from lecture audio.', icon: <IoMicOutline /> },
  { title: 'Quick Summaries', text: 'Condense sessions into actionable revision points.', icon: <IoDocumentTextOutline /> },
];

const YT_LECTURE_LIBRARY = [
  { subject: 'Biology', title: 'Cell Structure and Function', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=URUJD5NEXC8' },
  { subject: 'Biology', title: 'Photosynthesis', channel: 'Amoeba Sisters', url: 'https://www.youtube.com/watch?v=sQK3Yr4Sc_k' },
  { subject: 'Biology', title: 'DNA and Genes Basics', channel: 'Amoeba Sisters', url: 'https://www.youtube.com/watch?v=8kK2zwjRV0M' },
  { subject: 'Biology', title: 'Human Digestive System', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=Og5xAdC8EUI' },
  { subject: 'Biology', title: 'Evolution and Natural Selection', channel: 'CrashCourse', url: 'https://www.youtube.com/watch?v=P3GagfbA2vo' },

  { subject: 'Chemistry', title: 'Atomic Structure', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=thnDxFdkzZs' },
  { subject: 'Chemistry', title: 'Chemical Bonding Basics', channel: 'FuseSchool', url: 'https://www.youtube.com/watch?v=QXT4OVM4vXI' },
  { subject: 'Chemistry', title: 'Acids and Bases', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=ANi709MYnWg' },
  { subject: 'Chemistry', title: 'Electrochemistry Introduction', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=3fVf4mD89xw' },
  { subject: 'Chemistry', title: 'Organic Chemistry Basics', channel: 'The Organic Chemistry Tutor', url: 'https://www.youtube.com/watch?v=QXXkV8v4Jko' },

  { subject: 'Physics', title: 'Newton Laws of Motion', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds' },
  { subject: 'Physics', title: 'Work, Energy and Power', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=Q0s5kQn7HGA' },
  { subject: 'Physics', title: 'Waves and Sound', channel: 'CrashCourse', url: 'https://www.youtube.com/watch?v=qV4v3M3QfYU' },
  { subject: 'Physics', title: 'Current Electricity', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=3pW2x6u5w6A' },
  { subject: 'Physics', title: 'Ray Optics Basics', channel: 'Physics Wallah', url: 'https://www.youtube.com/watch?v=6lSBynPRaR8' },

  { subject: 'Mathematics', title: 'Limits Introduction', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=riXcZT2ICjA' },
  { subject: 'Mathematics', title: 'Derivatives Introduction', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=ANyVpMS3HLw' },
  { subject: 'Mathematics', title: 'Integrals Basics', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=rfG8ce4nNh0' },
  { subject: 'Mathematics', title: 'Probability Basics', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=uzkc-qNVoOk' },
  { subject: 'Mathematics', title: 'Matrices and Determinants', channel: 'Khan Academy', url: 'https://www.youtube.com/watch?v=xyAuNHPsq-g' },

  { subject: 'Computer Science', title: 'Binary Search Explained', channel: 'CS Dojo', url: 'https://www.youtube.com/watch?v=D5SrAga1pno' },
  { subject: 'Computer Science', title: 'Recursion in 100 Seconds', channel: 'Fireship', url: 'https://www.youtube.com/watch?v=ijBiv5I3oCk' },
  { subject: 'Computer Science', title: 'Big O Notation', channel: 'freeCodeCamp.org', url: 'https://www.youtube.com/watch?v=Mo4vesaut8g' },
  { subject: 'Computer Science', title: 'Git and GitHub Basics', channel: 'freeCodeCamp.org', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk' },

  { subject: 'Java', title: 'Java Full Course for Beginners', channel: 'Programming with Mosh', url: 'https://www.youtube.com/watch?v=eIrMbAQSU34' },
  { subject: 'Java', title: 'OOP in Java', channel: 'Telusko', url: 'https://www.youtube.com/watch?v=BSVKUk58K6U' },
  { subject: 'Java', title: 'Java Collections Framework', channel: 'Kunal Kushwaha', url: 'https://www.youtube.com/watch?v=rzA7UJ-hQn4' },
  { subject: 'Java', title: 'Java Exception Handling', channel: 'Neso Academy', url: 'https://www.youtube.com/watch?v=1XAfapkBQjk' },

  { subject: 'DSA', title: 'Arrays and Strings (DSA)', channel: 'Apna College', url: 'https://www.youtube.com/watch?v=cbH2VwXb0Ok' },
  { subject: 'DSA', title: 'Linked List Basics', channel: 'take U forward', url: 'https://www.youtube.com/watch?v=Nq7ok-OyEpg' },
  { subject: 'DSA', title: 'Trees and Traversals', channel: 'freeCodeCamp.org', url: 'https://www.youtube.com/watch?v=fAAZixBzIAI' },
  { subject: 'DSA', title: 'Dynamic Programming Intro', channel: 'Aditya Verma', url: 'https://www.youtube.com/watch?v=3Y4H8QYd0ck' },

  { subject: 'DBMS', title: 'DBMS Full Course', channel: 'Neso Academy', url: 'https://www.youtube.com/watch?v=dl00fOOYLOM' },
  { subject: 'DBMS', title: 'Normalization in DBMS', channel: 'Gate Smashers', url: 'https://www.youtube.com/watch?v=GFQaEYEc8_8' },
  { subject: 'DBMS', title: 'SQL Joins Explained', channel: 'freeCodeCamp.org', url: 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw' },

  { subject: 'Operating Systems', title: 'OS Full Course', channel: 'Neso Academy', url: 'https://www.youtube.com/watch?v=26QPDBe-NB8' },
  { subject: 'Operating Systems', title: 'Process and Threads', channel: 'Gate Smashers', url: 'https://www.youtube.com/watch?v=BI0Q8lwlQmY' },
  { subject: 'Operating Systems', title: 'Deadlock in OS', channel: 'Gate Smashers', url: 'https://www.youtube.com/watch?v=5I99QbMnhPU' },

  { subject: 'Computer Networks', title: 'OSI Model Explained', channel: 'PowerCert Animated Videos', url: 'https://www.youtube.com/watch?v=vv4y_uOneC0' },
  { subject: 'Computer Networks', title: 'TCP/IP Model', channel: 'Neso Academy', url: 'https://www.youtube.com/watch?v=KEa-MY7XIzs' },
  { subject: 'Computer Networks', title: 'Routing Basics', channel: 'CertBros', url: 'https://www.youtube.com/watch?v=NQ4A7A1f2eE' },
];

function extractYoutubeEmbedUrl(rawUrl = '') {
  const url = String(rawUrl || '').trim();
  if (!url) return '';

  if (/youtube\.com\/embed\//i.test(url)) {
    return url;
  }

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch?.[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}`;
  }

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch?.[1]) {
    return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}`;
  }

  return '';
}

function getYoutubeVideoId(rawUrl = '') {
  const url = String(rawUrl || '').trim();
  if (!url) return '';

  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch?.[1]) return embedMatch[1];

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch?.[1]) return shortMatch[1];

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch?.[1]) return watchMatch[1];

  return '';
}

const EDUCATIONAL_VIDEO_ID_ALLOWLIST = new Set(
  YT_LECTURE_LIBRARY
    .map((entry) => getYoutubeVideoId(entry.url))
    .filter(Boolean)
);

function isAllowedEducationalLectureUrl(url = '') {
  const videoId = getYoutubeVideoId(url);
  return !!videoId && EDUCATIONAL_VIDEO_ID_ALLOWLIST.has(videoId);
}

function looksStudyFocused(url = '', topic = '') {
  const text = `${url} ${topic}`.toLowerCase();
  return /\b(study|lecture|tutorial|course|class|revision|lesson|education|educational|math|mathematics|biology|chemistry|physics|computer|science|java|dsa|dbms|os|operating systems|networks)\b/i.test(text);
}

function isYoutubeUrl(url = '') {
  return /(?:youtube\.com|youtu\.be)/i.test(String(url || ''));
}

export default function LectureZone() {
  const recognitionRef = useRef(null);

  const [lectureTopic, setLectureTopic] = useState('Biology Revision');
  const [lectureUrl, setLectureUrl] = useState('');
  const [lectureNotes, setLectureNotes] = useState('');
  const [lectureMessage, setLectureMessage] = useState('');
  const [lectureMessageType, setLectureMessageType] = useState('success');
  const [lectureSubjectFilter, setLectureSubjectFilter] = useState('All');
  const [selectedLecture, setSelectedLecture] = useState(YT_LECTURE_LIBRARY[0]);
  const [lectureSearch, setLectureSearch] = useState('');
  const [strictLectureMode, setStrictLectureMode] = useState(true);
  const [embedChecking, setEmbedChecking] = useState(false);
  const [activeToolTitle, setActiveToolTitle] = useState('Live Lectures');

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcriptStatus, setTranscriptStatus] = useState('Ready to transcribe');
  const [transcriptError, setTranscriptError] = useState('');
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptUrl, setTranscriptUrl] = useState('');

  const [summaryInput, setSummaryInput] = useState('');
  const [summaryOutput, setSummaryOutput] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const lectureSubjects = ['All', ...new Set(YT_LECTURE_LIBRARY.map((entry) => entry.subject))];
  const activeTool = lectureTools.find((tool) => tool.title === activeToolTitle) || lectureTools[0];
  const filteredLectures = YT_LECTURE_LIBRARY.filter((entry) => {
    const subjectMatch = lectureSubjectFilter === 'All' || entry.subject === lectureSubjectFilter;
    const q = lectureSearch.trim().toLowerCase();
    const searchMatch = !q
      || entry.title.toLowerCase().includes(q)
      || entry.channel.toLowerCase().includes(q)
      || entry.subject.toLowerCase().includes(q);
    return subjectMatch && searchMatch;
  });
  const activeEmbedUrl = extractYoutubeEmbedUrl(lectureUrl || selectedLecture?.url || '');
  const curatedCount = filteredLectures.length;

  useEffect(() => {
    const saved = localStorage.getItem('lecturezone-notes');
    if (saved) {
      setLectureNotes(saved);
    }

    if (YT_LECTURE_LIBRARY[0]) {
      setSelectedLecture(YT_LECTURE_LIBRARY[0]);
      setLectureTopic(YT_LECTURE_LIBRARY[0].title);
      setLectureUrl(YT_LECTURE_LIBRARY[0].url);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const findFirstAvailableLecture = async (lectures) => {
    for (const lecture of lectures) {
      try {
        const verified = await verifyLectureVideo(lecture.url);
        if (verified.ok && verified.watchUrl) {
          return {
            ...lecture,
            url: verified.watchUrl,
          };
        }
      } catch {
        // Continue to next lecture until a working one is found.
      }
    }
    return null;
  };

  const ensureLectureIsEmbeddable = async (lecture) => {
    if (!lecture?.url) return null;

    try {
      const verified = await verifyLectureVideo(lecture.url);
      if (verified.ok && verified.watchUrl) {
        return {
          ...lecture,
          url: verified.watchUrl,
          title: lecture.title,
          channel: lecture.channel,
          subject: lecture.subject,
        };
      }
    } catch {
      // Fall through to fallback search.
    }

    const sameSubject = YT_LECTURE_LIBRARY.filter((entry) => entry.subject === lecture.subject && entry.title !== lecture.title);
    const fallback = await findFirstAvailableLecture([...sameSubject, ...YT_LECTURE_LIBRARY]);
    return fallback;
  };

  const openLecture = () => {
    if (!lectureUrl.trim()) {
      setLectureMessageType('error');
      setLectureMessage('Please select an educational lecture from the library.');
      return;
    }

    if (!isYoutubeUrl(lectureUrl.trim())) {
      setLectureMessageType('error');
      setLectureMessage('Only YouTube educational links are allowed here.');
      return;
    }

    if (strictLectureMode && !isAllowedEducationalLectureUrl(lectureUrl.trim())) {
      setLectureMessageType('error');
      setLectureMessage('For safety, only approved educational lectures from this library can be opened.');
      return;
    }

    if (!strictLectureMode && !looksStudyFocused(lectureUrl.trim(), lectureTopic.trim())) {
      setLectureMessageType('error');
      setLectureMessage('Please use a study-focused YouTube lecture link or turn strict mode back on.');
      return;
    }

    try {
      const popup = window.open(lectureUrl.trim(), '_blank', 'noopener,noreferrer');
      if (!popup) {
        setLectureMessageType('success');
        setLectureMessage('Popup was blocked. Lecture is still ready below in the embedded player.');
        return;
      }

      setLectureMessageType('success');
      setLectureMessage('Educational YouTube lecture opened in new tab.');
    } catch {
      setLectureMessageType('error');
      setLectureMessage('Unable to open lecture right now. Please try again.');
    }
  };

  const saveLectureNotes = () => {
    localStorage.setItem('lecturezone-notes', lectureNotes);
    setLectureMessageType('success');
    setLectureMessage('Notes saved successfully.');
  };

  const pickLibraryLecture = (lecture) => {
    setEmbedChecking(true);
    setLectureMessage('');

    ensureLectureIsEmbeddable(lecture)
      .then((resolved) => {
        if (!resolved) {
          setLectureMessageType('error');
          setLectureMessage('This lecture is unavailable. Please try another topic.');
          return;
        }

        setSelectedLecture(resolved);
        setLectureTopic(resolved.title);
        setLectureUrl(resolved.url);
        setLectureMessageType('success');

        if (resolved.title !== lecture.title) {
          setLectureMessage(`Selected lecture was unavailable. Loaded alternative: ${resolved.title} (${resolved.channel}).`);
        } else {
          setLectureMessage(`Loaded: ${resolved.title} (${resolved.channel})`);
        }
      })
      .catch(() => {
        setLectureMessageType('error');
        setLectureMessage('Unable to verify lecture right now. Please try again.');
      })
      .finally(() => {
        setEmbedChecking(false);
      });
  };

  const getSpeechRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;

  const toggleTranscription = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setTranscriptError('Live transcript is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setTranscriptStatus('Transcription paused');
      return;
    }

    setTranscriptError('');
    setTranscriptStatus('Listening...');
    setListening(true);

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      setTranscriptError(event.error ? `Transcription error: ${event.error}` : 'Transcription failed.');
      setListening(false);
      setTranscriptStatus('Ready to transcribe');
    };

    recognition.onend = () => {
      setListening(false);
      setTranscriptStatus('Ready to transcribe');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const copyTranscript = async () => {
    if (!transcript.trim()) return;
    await navigator.clipboard.writeText(transcript);
    setTranscriptStatus('Transcript copied.');
  };

  const buildTranscriptCandidateUrls = (primaryUrl) => {
    const primaryId = getYoutubeVideoId(primaryUrl);
    if (!primaryId) return [primaryUrl];

    const primaryLecture = YT_LECTURE_LIBRARY.find((entry) => getYoutubeVideoId(entry.url) === primaryId);
    if (!primaryLecture) return [primaryUrl];

    const sameSubject = YT_LECTURE_LIBRARY
      .filter((entry) => entry.subject === primaryLecture.subject && getYoutubeVideoId(entry.url) !== primaryId)
      .map((entry) => entry.url);

    const rest = YT_LECTURE_LIBRARY
      .filter((entry) => entry.subject !== primaryLecture.subject && getYoutubeVideoId(entry.url) !== primaryId)
      .map((entry) => entry.url);

    return [primaryUrl, ...sameSubject, ...rest];
  };

  const fetchTranscriptFromLecture = async () => {
    const url = transcriptUrl.trim() || lectureUrl.trim() || selectedLecture?.url || '';

    if (!url) {
      setTranscriptError('Select a lecture or paste a YouTube lecture link first.');
      return;
    }

    if (!isYoutubeUrl(url)) {
      setTranscriptError('Only YouTube lecture links are supported for transcript fetch.');
      return;
    }

    if (strictLectureMode && !isAllowedEducationalLectureUrl(url)) {
      setTranscriptError('Transcript fetch is limited to approved educational lectures in strict mode.');
      return;
    }

    // Keep source of transcript unambiguous: stop live mic capture before fetching YouTube captions.
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }

    setTranscriptLoading(true);
    setTranscriptError('');
    setTranscriptStatus('Fetching transcript...');
    setTranscript('');

    try {
      const candidateUrls = strictLectureMode
        ? buildTranscriptCandidateUrls(url).slice(0, 10)
        : [url];

      let finalResult = null;
      let finalUrl = '';

      for (const candidateUrl of candidateUrls) {
        try {
          const result = await fetchLectureTranscript(candidateUrl);
          if (result?.transcript?.trim()) {
            finalResult = result;
            finalUrl = candidateUrl;
            break;
          }
        } catch {
          // Try the next candidate lecture.
        }
      }

      if (!finalResult) {
        throw new Error('Transcript is not available for this video. Some YouTube lectures do not provide captions.');
      }

      setTranscript(finalResult.transcript || 'No transcript text returned.');

      if (finalUrl !== url) {
        const fallbackLecture = YT_LECTURE_LIBRARY.find((entry) => getYoutubeVideoId(entry.url) === getYoutubeVideoId(finalUrl));
        if (fallbackLecture) {
          setSelectedLecture(fallbackLecture);
          setLectureTopic(fallbackLecture.title);
          setLectureUrl(fallbackLecture.url);
          setTranscriptUrl(fallbackLecture.url);
          setTranscriptStatus(`Transcript loaded from fallback lecture: ${fallbackLecture.title}.`);
        } else {
          setTranscriptStatus('Transcript loaded from alternative lecture link.');
        }
      } else {
        setTranscriptStatus('Transcript loaded from YouTube lecture.');
      }

      if (!lectureUrl.trim()) {
        setLectureUrl(finalUrl || url);
      }
    } catch (error) {
      setTranscriptError((error?.message || 'Unable to fetch transcript right now.') + ' You can still use Start Transcription for live microphone capture.');
      setTranscriptStatus('Ready to transcribe');
    } finally {
      setTranscriptLoading(false);
    }
  };

  const generateSummary = async () => {
    const baseText = summaryInput.trim() || transcript.trim();
    if (!baseText) {
      setSummaryError('Paste lecture text or generate transcript first.');
      return;
    }

    setSummaryLoading(true);
    setSummaryError('');
    try {
      const prompt = `Summarize this lecture text in concise exam revision format. Output in plain text only (no markdown symbols like #, *, -). Keep it short with key concepts, formulas/facts, and quick revision points:\n\n${baseText}`;
      const result = await askEducoAssist(prompt, {
        mode: 'chat',
        subject: 'General',
        level: 'college',
        outputLanguage: 'english',
        responseStyle: 'structured',
        includeExamples: false,
      });
      setSummaryOutput(result.answer || 'No summary generated.');
    } catch (error) {
      setSummaryError(error?.message || 'Unable to generate summary right now.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const jumpToSummary = () => {
    if (!summaryInput.trim()) {
      const seed = transcript.trim() || lectureNotes.trim() || `Lecture topic: ${lectureTopic}`;
      setSummaryInput(seed);
    }
    setActiveToolTitle('Quick Summaries');
  };

  const jumpToTranscript = () => {
    if (!transcriptUrl.trim()) {
      setTranscriptUrl(lectureUrl || selectedLecture?.url || '');
    }
    setActiveToolTitle('Transcripts');
  };

  return (
    <div className="module-page">
      <FloatingParticles />
      <GradientMesh colors={['#7a001f', '#b41340', '#f06292']} />
      
      <motion.div
        className="module-hero"
        style={{ background: 'linear-gradient(135deg, rgba(122,0,31,0.7), rgba(180,19,64,0.5), rgba(240,98,146,0.4))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <IoChevronForward />
            <span>Lecture Zone</span>
          </div>
          <h1>Lecture Zone</h1>
          <p>Watch, capture, and revise lectures with AI-assisted tools.</p>
        </div>
      </motion.div>

      <div className="lecture-tool-switcher">
        {lectureTools.map((tool) => (
          <button
            key={tool.title}
            type="button"
            className={`lecture-tool-tab ${activeToolTitle === tool.title ? 'active' : ''}`}
            onClick={() => setActiveToolTitle(tool.title)}
          >
            <span className="lecture-tool-tab-icon" aria-hidden="true">{tool.icon}</span>
            <span className="lecture-tool-tab-title">{tool.title}</span>
          </button>
        ))}
      </div>

      <div className="feature-grid single-card">
        <motion.div
          key={activeTool.title}
          className="feature-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="feature-card-body">
            {activeTool.title !== 'Live Lectures' && (
              <>
                <div className="module-card-illustration" style={{ opacity: 0.08, transform: 'rotate(-4deg)' }}>
                  {activeTool.icon}
                </div>
                <div className="feature-card-header">
                  <div className="feature-card-icon" style={{ background: 'rgba(122,0,31,0.14)', color: '#7a001f' }}>
                    {activeTool.icon}
                  </div>
                  <div>
                    <div className="feature-card-title">{activeTool.title}</div>
                    <div className="feature-card-subtitle">Lecture workflow</div>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-item-icon" style={{ background: 'rgba(122,0,31,0.14)', color: '#7a001f' }}>
                    <IoBookOutline />
                  </div>
                  {activeTool.text}
                </div>
              </>
            )}

            {activeTool.title === 'Live Lectures' && (
                <>
                  <div className="lecture-live-layout">
                    <div className="lecture-library-card">
                      <h3 className="lecture-panel-title">Lecture Library</h3>
                      <div className="tools-chip-row">
                        {lectureSubjects.map((subjectEntry) => (
                          <button
                            key={subjectEntry}
                            type="button"
                            className={`tools-chip ${lectureSubjectFilter === subjectEntry ? 'active' : ''}`}
                            onClick={() => setLectureSubjectFilter(subjectEntry)}
                          >
                            {subjectEntry}
                          </button>
                        ))}
                      </div>

                      <div className="lecture-search-wrap">
                        <IoSearchOutline className="lecture-search-icon" />
                        <input
                          className="tools-input"
                          value={lectureSearch}
                          onChange={(event) => setLectureSearch(event.target.value)}
                          placeholder="Search lectures or channels..."
                        />
                      </div>

                      <div className="tools-inline-status">
                        {strictLectureMode
                          ? 'Smart: only curated lecture links can open.'
                          : 'Custom links allowed, but study focused only.'}
                      </div>

                      <div className="lecture-list-scroll">
                        {filteredLectures.length === 0 && (
                          <div className="tools-inline-status">No lectures found for this filter.</div>
                        )}
                        {filteredLectures.map((lecture) => {
                          const isActive = getYoutubeVideoId(lecture.url) === getYoutubeVideoId(lectureUrl);
                          return (
                            <button
                              key={`${lecture.subject}-${lecture.title}`}
                              type="button"
                              className={`lecture-list-row ${isActive ? 'active' : ''}`}
                              onClick={() => pickLibraryLecture(lecture)}
                            >
                              <span className="lecture-list-row-icon"><IoPlayCircleOutline /></span>
                              <span className="lecture-list-row-text">
                                <span>{lecture.subject}: {lecture.title}</span>
                                <small>{lecture.channel}</small>
                              </span>
                              <IoChevronForward />
                            </button>
                          );
                        })}
                      </div>

                      <div className="tools-inline-status">{curatedCount} curated YouTube lectures open.</div>

                      <div className="lecture-selected-strip">
                        {[selectedLecture, ...filteredLectures.filter((entry) => entry.title !== selectedLecture?.title).slice(0, 1)].map((lecture) => (
                          <button
                            key={`selected-${lecture.subject}-${lecture.title}`}
                            type="button"
                            className="lecture-list-row active"
                            onClick={() => pickLibraryLecture(lecture)}
                          >
                            <span className="lecture-list-row-icon"><IoPlayCircleOutline /></span>
                            <span className="lecture-list-row-text">
                              <span>{lecture.subject}: {lecture.title}</span>
                              <small>{lecture.channel}</small>
                            </span>
                            <IoChevronForward />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="lecture-details-card">
                      <h3 className="lecture-panel-title">Lecture Details</h3>

                      <label className="tools-label">Lecture Topic</label>
                      <input
                        className="tools-input"
                        value={lectureTopic}
                        onChange={(event) => setLectureTopic(event.target.value)}
                        placeholder="Ex: Cell Biology Masterclass"
                      />

                      <label className="tools-label">YouTube Lecture Link</label>
                      <input
                        className="tools-input"
                        value={lectureUrl}
                        onChange={(event) => setLectureUrl(event.target.value)}
                        readOnly={strictLectureMode}
                        placeholder={strictLectureMode ? 'Library controlled link' : 'Paste a study-focused YouTube lecture link'}
                      />

                      <div className="tools-action-row">
                        <button className="btn-primary" onClick={openLecture}><IoOpenOutline /> Open YouTube Lecture</button>
                      </div>

                      <div className="lecture-mini-actions">
                        <button type="button" className="btn-secondary" onClick={jumpToSummary}><IoDocumentTextOutline /> Generate Summary</button>
                        <button type="button" className="btn-secondary" onClick={() => setLectureMessage('Use Synchronized Notes section below to create notes quickly.')}><IoSaveOutline /> Generate Notes</button>
                        <button type="button" className="btn-secondary" onClick={() => setLectureMessage('Quiz generator can be added next.')}><IoDocumentTextOutline /> Generate Quiz</button>
                        <button type="button" className="btn-secondary" onClick={jumpToTranscript}><IoCopyOutline /> Use Transcript</button>
                      </div>

                      <div className="lecture-overview-card">
                        <h4 className="lecture-overview-title">Lecture Overview</h4>
                        {embedChecking && <div className="tools-inline-status">Checking lecture availability...</div>}
                        <div className="lecture-mini-actions">
                          <button type="button" className="btn-secondary" onClick={jumpToSummary}><IoDocumentTextOutline /> Generate Summary</button>
                          <button type="button" className="btn-secondary" onClick={() => setLectureMessage('Use Notes Hub for advanced note templates.')}><IoSaveOutline /> Generate Notes</button>
                          <button type="button" className="btn-secondary" onClick={() => setLectureMessage('Quiz generator can be added next.')}><IoDocumentTextOutline /> Generate Quiz</button>
                          <button type="button" className="btn-secondary" onClick={jumpToTranscript}><IoSaveOutline /> Save Transcript</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="tools-action-row">
                    <button
                      type="button"
                      className={`tools-chip ${strictLectureMode ? 'active' : ''}`}
                      onClick={() => setStrictLectureMode(true)}
                    >
                      Strict Mode On
                    </button>
                    <button
                      type="button"
                      className={`tools-chip ${!strictLectureMode ? 'active' : ''}`}
                      onClick={() => setStrictLectureMode(false)}
                    >
                      Strict Mode Off
                    </button>
                  </div>

                  {lectureMessage && <div className={`upload-message ${lectureMessageType}`}>{lectureMessage}</div>}
                </>
              )}

            {activeTool.title === 'Transcripts' && (
                <>
                  <label className="tools-label">YouTube Lecture Link for Transcript</label>
                  <input
                    className="tools-input"
                    value={transcriptUrl}
                    onChange={(event) => setTranscriptUrl(event.target.value)}
                    placeholder="Paste the same lecture link here"
                  />
                  <div className="tools-action-row">
                    <button className="btn-primary" onClick={toggleTranscription}>
                      <IoMicOutline /> {listening ? 'Stop Transcription' : 'Start Transcription'}
                    </button>
                    <button className="btn-secondary" onClick={copyTranscript} disabled={!transcript.trim()}>
                      <IoCopyOutline /> Copy
                    </button>
                    <button className="btn-secondary" onClick={fetchTranscriptFromLecture} disabled={transcriptLoading}>
                      <IoDocumentTextOutline /> {transcriptLoading ? 'Loading...' : 'Fetch Full Transcript'}
                    </button>
                    <button className="btn-secondary" onClick={() => setTranscriptUrl(lectureUrl || selectedLecture?.url || '')}>
                      Use Current Lecture
                    </button>
                  </div>
                  <div className="tools-inline-status">Fetch Full Transcript uses YouTube captions. Start/Stop Transcription uses your microphone.</div>
                  <div className="tools-list-item" style={{ whiteSpace: 'pre-wrap', minHeight: '130px' }}>
                    {transcript || 'Live transcript text will appear here...'}
                  </div>
                  <div className="tools-inline-status">{transcriptStatus}</div>
                  {transcriptError && <div className="upload-message error">{transcriptError}</div>}
                </>
              )}

            {activeTool.title === 'Quick Summaries' && (
                <>
                  <label className="tools-label">Lecture Text / Transcript</label>
                  <textarea
                    className="tools-textarea"
                    value={summaryInput}
                    onChange={(event) => setSummaryInput(event.target.value)}
                    placeholder="Paste transcript here, or use generated transcript from previous card."
                  />
                  <div className="tools-action-row">
                    <button className="btn-primary" onClick={generateSummary} disabled={summaryLoading}>
                      <IoDocumentTextOutline /> {summaryLoading ? 'Generating...' : 'Generate Summary'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setSummaryInput(transcript)}
                      disabled={!transcript.trim()}
                    >
                      Use Transcript
                    </button>
                  </div>
                  {summaryError && <div className="upload-message error">{summaryError}</div>}
                  {!!summaryOutput && (
                    <div className="tools-list-item" style={{ whiteSpace: 'pre-wrap' }}>
                      {summaryOutput}
                    </div>
                  )}
                </>
              )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
