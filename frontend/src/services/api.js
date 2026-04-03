export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function requestJson(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, options);

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const serverMessage = data?.message || `Request failed with status ${response.status}`;
      throw new Error(serverMessage);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to connect to server. Start backend and try again.');
    }
    throw error;
  }
}

export async function listUploadedFiles() {
  const data = await requestJson('/api/files');
  return Array.isArray(data?.files) ? data.files : [];
}

export async function uploadFile(file) {
  if (!(file instanceof File)) {
    throw new Error('Please select a valid file.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
    method: 'POST',
    body: formData,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Upload failed.');
  }

  return data?.file;
}

export async function askEducoAssist(prompt, options = 'chat') {
  const payload = typeof options === 'string' ? { mode: options } : { ...(options || {}) };

  const data = await requestJson('/api/ai/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, ...payload }),
  });

  return {
    answer: data?.answer || '',
    model: data?.model || 'grok',
  };
}

export async function fetchLectureTranscript(url) {
  const data = await requestJson('/api/lectures/transcript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  return {
    transcript: data?.transcript || '',
    parts: Array.isArray(data?.parts) ? data.parts : [],
    videoId: data?.videoId || '',
  };
}

export async function verifyLectureVideo(url) {
  const data = await requestJson('/api/lectures/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  return {
    ok: data?.ok === true,
    videoId: data?.videoId || '',
    watchUrl: data?.watchUrl || '',
    embedUrl: data?.embedUrl || '',
    title: data?.title || '',
    authorName: data?.authorName || '',
  };
}

export async function analyzeSyllabus(file, options = {}) {
  if (!(file instanceof File)) {
    throw new Error('Please upload a valid syllabus file.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('subject', options.subject || 'General');
  formData.append('level', options.level || 'college');
  formData.append('outputLanguage', options.outputLanguage || 'english');

  const response = await fetch(`${API_BASE_URL}/api/ai/syllabus-analyze`, {
    method: 'POST',
    body: formData,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Syllabus analysis failed.');
  }

  return {
    answer: data?.answer || '',
    model: data?.model || 'grok',
    provider: data?.provider || 'grok',
    extractedChars: data?.extractedChars || 0,
    fileName: data?.fileName || file.name,
  };
}
