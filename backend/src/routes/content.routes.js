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

  if (!apiKey) {
    return res.status(500).json({ message: 'GROK_API_KEY is not configured in backend environment.' });
  }

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

    return res.status(502).json({ message: lastErrorMessage });
  } catch (error) {
    return res.status(502).json({
      message: error?.message || 'Syllabus analysis failed.',
    });
  }
});

export default router;
