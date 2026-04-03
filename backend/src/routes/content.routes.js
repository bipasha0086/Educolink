import { Router } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import {
  modules,
  breakZoneActivities,
  motivationalQuotes,
} from '../constants/content.js';

const router = Router();
const syllabusUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function clampAnswer(answer, maxWords = 220) {
  const clean = String(answer || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'No response generated.';
  const words = clean.split(' ');
  if (words.length <= maxWords) return clean;
  return `${words.slice(0, maxWords).join(' ')} ...`;
}

function buildLocalSyllabusAnalysis(rawText = '', subject = 'General', level = 'college') {
  const lines = String(rawText)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*+•]\s*/, '').trim())
    .filter(Boolean);

  const uniqueLines = [];
  const seen = new Set();
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueLines.push(line);
    if (uniqueLines.length >= 80) break;
  }

  const headings = uniqueLines.filter((line) => /chapter|unit|module|topic|week|day|lesson|part/i.test(line));
  const topics = (headings.length ? headings : uniqueLines)
    .slice(0, 24)
    .map((line) => line.replace(/^\d+[\).:-]\s*/, '').trim());

  const fallbackTopic = `Core ${subject} concepts`;
  const normalizedTopics = topics.length ? topics : [fallbackTopic, `Problem solving in ${subject}`, `${subject} revision practice`];

  const snapshot = normalizedTopics.slice(0, 5);
  const highPriority = normalizedTopics.slice(0, 4);
  const mediumPriority = normalizedTopics.slice(4, 8);
  const lowPriority = normalizedTopics.slice(8, 12);

  const week1 = highPriority.slice(0, 2);
  const week2 = [...highPriority.slice(2), ...mediumPriority.slice(0, 1)];
  const week3 = mediumPriority.slice(1, 4);
  const week4 = [...lowPriority.slice(0, 2), 'Mock test + error log review'];

  const flow = [
    `Monday: Learn ${highPriority[0] || fallbackTopic}`,
    `Tuesday: Practice questions from ${highPriority[1] || fallbackTopic}`,
    `Wednesday: Revise weak points and summary notes`,
    `Thursday: Cover ${mediumPriority[0] || fallbackTopic} with examples`,
    `Friday: Timed quiz and doubt clearance`,
    `Saturday: Past papers / applied problems`,
    `Sunday: Weekly recap + next-week plan`,
  ];

  const revision = [
    'Use active recall and spaced repetition for every chapter.',
    'Maintain an error log after each quiz or mock test.',
    'Do one timed test at the end of every week.',
    'Final week: 2 full mocks + rapid formula/fact revision.',
  ];

  const formatList = (items) => (items.length ? items : ['No major topics found in file.'])
    .map((item) => `- ${item}`)
    .join('\n');

  return [
    `1) Syllabus Snapshot (${subject} - ${level})`,
    formatList(snapshot),
    '',
    '2) Priority Buckets (High/Medium/Low with reasons)',
    'High Priority:',
    formatList(highPriority.map((item) => `${item} (high exam weight / foundational)`)),
    'Medium Priority:',
    formatList(mediumPriority.map((item) => `${item} (important for scoring consistency)`)),
    'Low Priority:',
    formatList(lowPriority.map((item) => `${item} (quick coverage after core topics)`)),
    '',
    '3) 4-Week Roadmap (Week-wise focus)',
    `Week 1: ${week1.join(' | ') || fallbackTopic}`,
    `Week 2: ${week2.join(' | ') || fallbackTopic}`,
    `Week 3: ${week3.join(' | ') || fallbackTopic}`,
    `Week 4: ${week4.join(' | ') || fallbackTopic}`,
    '',
    '4) Daily Study Flowchart (Mon-Sun tasks)',
    formatList(flow),
    '',
    '5) Revision + Test Strategy',
    formatList(revision),
  ].join('\n');
}

function normalizeWebResults(results = []) {
  return results
    .filter((item) => item && item.title && item.link)
    .map((item) => ({
      title: String(item.title),
      snippet: String(item.snippet || item.description || 'No summary available.'),
      link: String(item.link),
      displayLink: String(item.displayLink || ''),
    }));
}

function extractYoutubeVideoId(rawUrl = '') {
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

function decodeHtmlEntities(value = '') {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function parseTranscriptXml(xml = '') {
  const entries = [];

  const parseNodeEntries = (nodeRegex, timeExtractor) => {
    let nodeMatch;
    while ((nodeMatch = nodeRegex.exec(xml)) !== null) {
      const attrs = String(nodeMatch[1] || '');
      const inner = String(nodeMatch[2] || '');
      const { offset, duration } = timeExtractor(attrs);

      let text = '';
      const spanRegex = /<s[^>]*>([\s\S]*?)<\/s>/g;
      let spanMatch;
      while ((spanMatch = spanRegex.exec(inner)) !== null) {
        text += spanMatch[1];
      }

      if (!text) {
        text = inner;
      }

      text = decodeHtmlEntities(text)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text) {
        entries.push({ text, offset, duration });
      }
    }
  };

  // Newer caption XML often uses <p t="..." d="..."> nodes.
  parseNodeEntries(/<p\b([^>]*)>([\s\S]*?)<\/p>/g, (attrs) => {
    const t = attrs.match(/\bt="([0-9.]+)"/i)?.[1] || '0';
    const d = attrs.match(/\bd="([0-9.]+)"/i)?.[1] || '0';
    return {
      offset: Number.parseFloat(t) || 0,
      duration: Number.parseFloat(d) || 0,
    };
  });

  // Older caption XML may use <text start="..." dur="..."> nodes.
  if (!entries.length) {
    parseNodeEntries(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (attrs) => {
      const start = attrs.match(/\bstart="([0-9.]+)"/i)?.[1] || '0';
      const dur = attrs.match(/\bdur="([0-9.]+)"/i)?.[1] || '0';
      return {
        offset: Number.parseFloat(start) || 0,
        duration: Number.parseFloat(dur) || 0,
      };
    });
  }

  return entries;
}

function parseInlineJson(html = '', variableName) {
  const marker = `var ${variableName} = `;
  const startIndex = html.indexOf(marker);
  if (startIndex === -1) return null;

  const jsonStart = startIndex + marker.length;
  let depth = 0;

  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function pickPreferredEnglishTrack(tracks = []) {
  if (!Array.isArray(tracks) || !tracks.length) return null;

  const isEnglishCode = (code = '') => /^en(-|$)/i.test(String(code || ''));
  const isAsr = (kind = '') => String(kind || '').toLowerCase() === 'asr';

  const englishManual = tracks.find((track) => isEnglishCode(track?.languageCode) && !isAsr(track?.kind));
  if (englishManual) return englishManual;

  const englishAny = tracks.find((track) => isEnglishCode(track?.languageCode));
  if (englishAny) return englishAny;

  const firstManual = tracks.find((track) => !isAsr(track?.kind));
  return firstManual || tracks[0] || null;
}

function looksEnglishTranscript(text = '') {
  const sample = String(text || '').toLowerCase().slice(0, 4000);
  if (!sample.trim()) return false;

  const englishMarkers = [
    ' the ', ' and ', ' is ', ' are ', ' of ', ' to ', ' in ', ' for ', ' with ',
    'this', 'that', 'from', 'you', 'your', 'how', 'what', 'when', 'where',
  ];

  const markerHits = englishMarkers.reduce((count, marker) => count + (sample.includes(marker) ? 1 : 0), 0);
  if (markerHits >= 2) return true;

  const lettersOnly = sample.replace(/[^a-z]/g, '');
  return lettersOnly.length >= Math.max(120, Math.floor(sample.length * 0.5));
}

async function fetchTranscriptTracks(videoId) {
  const innerTubeUrl = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
  const innerTubeResponse = await fetch(innerTubeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '20.10.38',
        },
      },
      videoId,
    }),
  });

  if (innerTubeResponse.ok) {
    const innerTubeData = await innerTubeResponse.json();
    const trackList = innerTubeData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (Array.isArray(trackList) && trackList.length > 0) {
      return trackList;
    }
  }

  const watchResponse = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!watchResponse.ok) {
    throw new Error('YouTube watch page could not be loaded.');
  }

  const html = await watchResponse.text();
  if (html.includes('class="g-recaptcha"')) {
    throw new Error('YouTube is rate-limiting transcript access from this IP.');
  }

  if (!html.includes('"playabilityStatus":')) {
    throw new Error('The video is unavailable.');
  }

  const playerResponse = parseInlineJson(html, 'ytInitialPlayerResponse');
  const trackList = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!Array.isArray(trackList) || trackList.length === 0) {
    throw new Error('No transcripts are available for this video.');
  }

  return trackList;
}

async function fetchLectureTranscriptByVideoId(videoId) {
  const tracks = await fetchTranscriptTracks(videoId);
  const selectedTrack = pickPreferredEnglishTrack(tracks);

  if (!selectedTrack?.baseUrl) {
    throw new Error('No transcript track was found.');
  }

  const hasEnglishTrack = tracks.some((track) => /^en(-|$)/i.test(String(track?.languageCode || '')));
  const uniqueUrls = new Set();

  uniqueUrls.add(`${selectedTrack.baseUrl}${selectedTrack.baseUrl.includes('?') ? '&' : '?'}tlang=en`);
  uniqueUrls.add(selectedTrack.baseUrl);
  if (!hasEnglishTrack) {
    uniqueUrls.add(`${selectedTrack.baseUrl}${selectedTrack.baseUrl.includes('?') ? '&' : '?'}tlang=en`);
  }

  // Try a few additional tracks and pick the most complete transcript.
  for (const track of tracks.slice(0, 4)) {
    if (track?.baseUrl) {
      if (/^en(-|$)/i.test(String(track?.languageCode || ''))) {
        uniqueUrls.add(track.baseUrl);
      }
      uniqueUrls.add(track.baseUrl);
      uniqueUrls.add(`${track.baseUrl}${track.baseUrl.includes('?') ? '&' : '?'}tlang=en`);
    }
  }

  let bestParts = [];
  for (const transcriptUrl of uniqueUrls) {
    const transcriptResponse = await fetch(transcriptUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!transcriptResponse.ok) {
      continue;
    }

    const xml = await transcriptResponse.text();
    const parts = parseTranscriptXml(xml);
    if (parts.length > bestParts.length) {
      const joined = parts.map((part) => part.text).join(' ');
      if (looksEnglishTranscript(joined)) {
        bestParts = parts;
      }
    }
  }

  if (!bestParts.length) {
    throw new Error('English transcript is not available for this lecture.');
  }

  return bestParts;
}

router.get('/modules', (_req, res) => {
  return res.json({ modules });
});

router.get('/break-zone/activities', (_req, res) => {
  return res.json({ items: breakZoneActivities });
});

router.get('/quotes/random', (_req, res) => {
  const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  return res.json({ quote: randomQuote });
});

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.status(400).json({ message: 'Query parameter q is required' });
  }

  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json&origin=*`;

  const response = await fetch(url);
  if (!response.ok) {
    return res.status(502).json({ message: 'Upstream search provider failed' });
  }

  const data = await response.json();
  const titles = data?.[1] || [];
  const descriptions = data?.[2] || [];
  const links = data?.[3] || [];

  const results = titles.map((title, idx) => ({
    title,
    description: descriptions[idx] || 'No summary available.',
    link: links[idx] || '',
  }));

  return res.json({ query: q, results });
});

router.get('/search/web', async (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.status(400).json({ message: 'Query parameter q is required' });
  }

  let results = [];
  let provider = 'none';
  let answer = null;
  let snippet = null;
  let knowledge = null;
  const serperApiKey = String(process.env.SERPER_API_KEY || '').trim();

  if (serperApiKey) {
    try {
      const serperResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q }),
      });

      if (serperResponse.ok) {
        const serperData = await serperResponse.json();
        const organic = Array.isArray(serperData?.organic) ? serperData.organic : [];

        answer = serperData?.answerBox?.answer || serperData?.answerBox?.result || null;
        snippet = serperData?.answerBox?.snippet || null;
        knowledge = serperData?.knowledgeGraph || null;
        results = organic.slice(0, 10);

        if (answer || knowledge || results.length) {
          provider = 'google-serper';
        }
      }
    } catch {
      results = [];
    }
  }

  const googleApiKey = String(process.env.GOOGLE_CSE_API_KEY || '').trim();
  const googleCx = String(process.env.GOOGLE_CSE_CX || '').trim();

  if (!results.length && googleApiKey && googleCx) {
    try {
      const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleApiKey)}&cx=${encodeURIComponent(googleCx)}&q=${encodeURIComponent(q)}&num=8`;
      const googleResponse = await fetch(googleUrl);

      if (googleResponse.ok) {
        const googleData = await googleResponse.json();
        const googleItems = Array.isArray(googleData?.items) ? googleData.items : [];

        const mapped = googleItems.map((item) => ({
          title: item?.title || q,
          snippet: item?.snippet || `Web result for ${q}`,
          link: item?.link || '',
          displayLink: item?.displayLink || '',
        }));

        results = normalizeWebResults(mapped).slice(0, 8);
        if (results.length) {
          provider = 'google-cse';
        }
      }
    } catch {
      results = [];
    }
  }

  if (!results.length) {
    try {
    const duckUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(duckUrl);

    if (response.ok) {
      const data = await response.json();
      const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];

      const flattened = [];
      for (const item of related) {
        if (item?.FirstURL && item?.Text) {
          flattened.push({
            title: item.Text.split(' - ')[0] || item.Text,
            snippet: item.Text,
            link: item.FirstURL,
          });
          continue;
        }

        if (Array.isArray(item?.Topics)) {
          for (const topic of item.Topics) {
            if (topic?.FirstURL && topic?.Text) {
              flattened.push({
                title: topic.Text.split(' - ')[0] || topic.Text,
                snippet: topic.Text,
                link: topic.FirstURL,
              });
            }
          }
        }
      }

      if (!flattened.length && data?.AbstractURL) {
        flattened.push({
          title: data?.Heading || q,
          snippet: data?.AbstractText || `Web result for ${q}`,
          link: data.AbstractURL,
        });
      }

      results = normalizeWebResults(flattened).slice(0, 8);
      if (results.length) {
        provider = 'duckduckgo';
      }
    }
    } catch {
    results = [];
    }
  }

  if (!results.length) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json&origin=*`;
      const wikiResponse = await fetch(wikiUrl);

      if (wikiResponse.ok) {
        const wikiData = await wikiResponse.json();
        const titles = wikiData?.[1] || [];
        const descriptions = wikiData?.[2] || [];
        const links = wikiData?.[3] || [];

        const wikiResults = titles.map((title, idx) => ({
          title,
          snippet: descriptions[idx] || `Web result for ${q}`,
          link: links[idx] || '',
        }));

        results = normalizeWebResults(wikiResults).slice(0, 8);
        if (results.length) {
          provider = 'wikipedia';
        }
      }
    } catch {
      results = [];
    }
  }

  return res.json({
    query: q,
    source: 'web',
    provider,
    answer,
    snippet,
    knowledge,
    results,
    googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  });
});

router.post('/lectures/verify', async (req, res) => {
  const rawUrl = String(req.body?.url || '').trim();

  if (!rawUrl) {
    return res.status(400).json({ message: 'Lecture URL is required.' });
  }

  if (!/(?:youtube\.com|youtu\.be)/i.test(rawUrl)) {
    return res.status(400).json({ message: 'Only YouTube links are supported.' });
  }

  const videoId = extractYoutubeVideoId(rawUrl);
  if (!videoId) {
    return res.status(400).json({ message: 'Invalid YouTube video link.' });
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return res.status(404).json({ message: 'This lecture video is unavailable or cannot be embedded.' });
    }

    const data = await response.json();
    return res.json({
      ok: true,
      videoId,
      watchUrl,
      embedUrl,
      title: String(data?.title || ''),
      authorName: String(data?.author_name || ''),
    });
  } catch {
    return res.status(502).json({ message: 'Unable to verify lecture video right now.' });
  }
});

router.post('/lectures/transcript', async (req, res) => {
  const url = String(req.body?.url || '').trim();

  if (!url) {
    return res.status(400).json({ message: 'Lecture URL is required.' });
  }

  if (!/(?:youtube\.com|youtu\.be)/i.test(url)) {
    return res.status(400).json({ message: 'Only YouTube lecture links are supported.' });
  }

  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    return res.status(400).json({ message: 'Could not read the YouTube video ID.' });
  }

  try {
    const transcriptParts = await fetchLectureTranscriptByVideoId(videoId);
    const transcriptText = transcriptParts
      .map((part) => String(part?.text || '').trim())
      .filter(Boolean)
      .join(' ');

    if (!transcriptText) {
      return res.status(404).json({ message: 'No transcript found for this lecture.' });
    }

    return res.json({
      videoId,
      transcript: transcriptText,
      parts: transcriptParts,
    });
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('transcript')) {
      return res.status(404).json({ message: 'Transcript is not available for this lecture.' });
    }

    return res.status(502).json({ message: 'Unable to fetch transcript from YouTube right now.' });
  }
});

router.post('/ai/ask', async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  const mode = String(req.body?.mode || 'chat').trim();
  const subject = String(req.body?.subject || 'General').trim();
  const level = String(req.body?.level || 'college').trim();
  const outputLanguage = String(req.body?.outputLanguage || 'english').trim().toLowerCase();
  const responseStyle = String(req.body?.responseStyle || 'structured').trim().toLowerCase();
  const includeExamples = req.body?.includeExamples !== false;
  const shortResponse = req.body?.shortResponse === true;
  const isPlanMode = mode === 'plan';
  const tokenLimit = shortResponse ? (isPlanMode ? 500 : 320) : (isPlanMode ? 1500 : 1100);

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required.' });
  }

  const apiKey = String(process.env.GROK_API_KEY || '').trim();
  const configuredModel = String(process.env.GROK_MODEL || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      message: 'GROK_API_KEY is not configured in backend environment.',
    });
  }

  const provider = apiKey.startsWith('gsk_') ? 'groq' : 'xai';
  const endpoint = provider === 'groq'
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.x.ai/v1/chat/completions';

  const languageInstruction = outputLanguage === 'hindi'
    ? 'Write the response in Hindi.'
    : outputLanguage === 'hinglish'
      ? 'Write in Hinglish using simple student-friendly wording.'
      : 'Write in clear English.';

  const answerPattern = responseStyle === 'structured'
    ? 'Use short headings and bullet points.'
    : 'Use a concise paragraph format.';

  const plannerInstruction = [
    `You are EducoAssist, an academic planner specialized in ${subject}.`,
    `Target level: ${level}.`,
    languageInstruction,
    answerPattern,
    shortResponse ? 'Keep the response concise. Max 150 words.' : 'Provide complete and well-defined explanation with practical detail.',
    'Return sections in this exact order:',
    '1) Goal Snapshot',
    '2) Weekly Plan Table (Day-wise)',
    '3) Daily Time Split',
    includeExamples ? '4) Worked Example Task for Day 1' : '4) Key Task Notes',
    '5) Revision and Self-Test Checklist',
    'Keep the schedule practical and realistic.',
  ].join(' ');

  const tutorInstruction = [
    `You are EducoAssist, an expert ${subject} tutor for ${level} learners.`,
    languageInstruction,
    answerPattern,
    shortResponse ? 'Keep the response concise. Max 120 words.' : 'Provide detailed, clear and exam-oriented explanation with enough depth.',
    'Return sections in this exact order:',
    '1) Concept Snapshot',
    '2) Step-by-Step Explanation',
    includeExamples ? '3) Worked Example' : '3) Key Illustration',
    '4) Common Mistakes',
    '5) Practice Question with Final Answer',
    'Keep explanations direct and exam-oriented.',
  ].join(' ');

  const systemPrompt = mode === 'plan' ? plannerInstruction : tutorInstruction;

  const modelCandidates = provider === 'groq'
    ? Array.from(new Set([
      configuredModel || 'llama-3.1-8b-instant',
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'mixtral-8x7b-32768',
    ].filter(Boolean)))
    : Array.from(new Set([
      configuredModel || 'grok-3-mini-beta',
      'grok-3-mini-beta',
      'grok-3-beta',
    ].filter(Boolean)));

  let lastErrorMessage = 'Grok API request failed.';

  try {
    for (const model of modelCandidates) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: tokenLimit,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      });

      const rawText = await response.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (response.ok) {
        const rawAnswer = data?.choices?.[0]?.message?.content || 'No response generated.';
        const answer = shortResponse ? clampAnswer(rawAnswer, isPlanMode ? 150 : 120) : rawAnswer;
        return res.json({ answer, model, provider });
      }

      const upstreamMessage = data?.error || data?.message || rawText || 'Grok API request failed.';
      lastErrorMessage = String(upstreamMessage);

      // Retry with fallback model only when model id is rejected.
      if (!/model not found/i.test(lastErrorMessage)) {
        break;
      }
    }

    return res.status(502).json({ message: lastErrorMessage });
  } catch {
    return res.status(502).json({ message: 'Unable to reach Grok API.' });
  }
});

router.post('/ai/syllabus-analyze', syllabusUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a syllabus file using field name "file".' });
  }

  const subject = String(req.body?.subject || 'General').trim();
  const level = String(req.body?.level || 'college').trim();
  const outputLanguage = String(req.body?.outputLanguage || 'english').trim().toLowerCase();

  const apiKey = String(process.env.GROK_API_KEY || '').trim();
  const configuredModel = String(process.env.GROK_MODEL || '').trim();

  let extractedText = '';
  try {
    const mimetype = String(req.file.mimetype || '').toLowerCase();
    const originalName = String(req.file.originalname || '').toLowerCase();
    const isPdf = mimetype.includes('pdf') || originalName.endsWith('.pdf');

    if (isPdf) {
      const parser = new PDFParse({ data: req.file.buffer });
      const parsed = await parser.getText();
      extractedText = String(parsed?.text || '').trim();
      await parser.destroy();
    } else {
      extractedText = req.file.buffer.toString('utf-8').trim();
    }
  } catch {
    return res.status(400).json({ message: 'Could not read syllabus file. Please upload a clean PDF or text file.' });
  }

  if (!extractedText) {
    return res.status(400).json({ message: 'No readable text found in syllabus file.' });
  }

  if (!apiKey) {
    const answer = buildLocalSyllabusAnalysis(extractedText, subject, level);
    return res.json({
      answer,
      model: 'local-syllabus-fallback-v1',
      provider: 'local',
      extractedChars: extractedText.length,
      fileName: req.file.originalname,
      fallback: true,
      warning: 'GROK_API_KEY is not configured, so local fallback analysis was used.',
    });
  }

  const provider = apiKey.startsWith('gsk_') ? 'groq' : 'xai';
  const endpoint = provider === 'groq'
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.x.ai/v1/chat/completions';

  const languageInstruction = outputLanguage === 'hindi'
    ? 'Write the response in Hindi.'
    : outputLanguage === 'hinglish'
      ? 'Write in Hinglish using simple student-friendly wording.'
      : 'Write in clear English.';

  const systemPrompt = [
    `You are EducoAssist Syllabus Analyzer for ${subject} (${level}).`,
    languageInstruction,
    'Analyze syllabus text and return sections in this exact order:',
    '1) Syllabus Snapshot',
    '2) Priority Buckets (High/Medium/Low with reasons)',
    '3) 4-Week Roadmap (Week-wise focus)',
    '4) Daily Study Flowchart (Mon-Sun tasks)',
    '5) Revision + Test Strategy',
    'Use concise bullets and practical timelines.',
  ].join(' ');

  const userPrompt = `Analyze this syllabus and generate roadmap + priorities:\n\n${extractedText.slice(0, 12000)}`;

  const modelCandidates = provider === 'groq'
    ? Array.from(new Set([
      configuredModel || 'llama-3.1-8b-instant',
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'mixtral-8x7b-32768',
    ].filter(Boolean)))
    : Array.from(new Set([
      configuredModel || 'grok-3-mini-beta',
      'grok-3-mini-beta',
      'grok-3-beta',
    ].filter(Boolean)));

  let lastErrorMessage = 'Syllabus analysis failed.';

  try {
    for (const model of modelCandidates) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.35,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      const rawText = await response.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (response.ok) {
        const rawAnswer = data?.choices?.[0]?.message?.content || 'No response generated.';
        const answer = rawAnswer;
        return res.json({
          answer,
          model,
          provider,
          extractedChars: extractedText.length,
          fileName: req.file.originalname,
        });
      }

      const upstreamMessage = data?.error || data?.message || rawText || 'Syllabus analysis failed.';
      lastErrorMessage = String(upstreamMessage);

      if (!/model not found/i.test(lastErrorMessage)) {
        break;
      }
    }

    const answer = buildLocalSyllabusAnalysis(extractedText, subject, level);
    return res.json({
      answer,
      model: 'local-syllabus-fallback-v1',
      provider: 'local',
      extractedChars: extractedText.length,
      fileName: req.file.originalname,
      fallback: true,
      warning: lastErrorMessage,
    });
  } catch (error) {
    const answer = buildLocalSyllabusAnalysis(extractedText, subject, level);
    return res.json({
      answer,
      model: 'local-syllabus-fallback-v1',
      provider: 'local',
      extractedChars: extractedText.length,
      fileName: req.file.originalname,
      fallback: true,
      warning: error?.message || 'Syllabus analysis fallback used after upstream failure.',
    });
  }
});

export default router;
