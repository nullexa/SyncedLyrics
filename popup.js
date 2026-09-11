const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const copyBtn = document.getElementById('copyBtn');
const refreshBtn = document.getElementById('refreshBtn');
const downloadBtn = document.getElementById('downloadBtn');

let lyricsData = null;
let currentLyricsText = null;
let songInfo = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function sanitizeFilename(name) {
  if (!name) return 'lyrics';
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim();
}

function formatLyricsToLRC(data) {
  const formatTime = (totalSeconds) => {
    const totalMs = Math.round(totalSeconds * 1000);
    const mins = Math.floor(totalMs / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = Math.floor((totalMs % 1000) / 10); // hundredths of a second

    const mm = mins.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    const xx = ms.toString().padStart(2, '0');
    return `${mm}:${ss}.${xx}`;
  };

  return data.map(line => {
    const lineStartTime = formatTime(line.start);
    const actualWords = line.words.filter(w => w.text.trim().length > 0);

    const formattedWords = actualWords.map((wordObj, index) => {
      const endTime = formatTime(wordObj.start + wordObj.duration);
      const text = wordObj.text.trim();
      const prefix = index === 0 ? '' : ' ';
      return `${prefix}${text}<${endTime}>`;
    }).join('');

    return `[${lineStartTime}]${formattedWords}`;
  }).join('\n');
}

function formatLyricsToTTML(data) {
  const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const formatTime = (totalSeconds) => {
    const totalMs = Math.round(totalSeconds * 1000);
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;

    const hh = hrs.toString().padStart(2, '0');
    const mm = mins.toString().padStart(2, '0');
    const ss = secs.toString().padStart(2, '0');
    const mmm = millis.toString().padStart(3, '0');

    return `${hh}:${mm}:${ss}.${mmm}`;
  };

  const linesXml = data.map(line => {
    const actualWords = line.words.filter(w => w.text.trim().length > 0);
    if (actualWords.length === 0) return '';

    const lineStart = formatTime(line.start);
    const lastWord = actualWords[actualWords.length - 1];
    const lineEnd = formatTime(lastWord.start + lastWord.duration);

    const wordSpans = actualWords.map((wordObj, index) => {
      const wordStart = formatTime(wordObj.start);
      const wordEnd = formatTime(wordObj.start + wordObj.duration);
      const text = escapeXml(wordObj.text.trim());
      const prefix = index === 0 ? '' : ' ';
      return `<span begin="${wordStart}" end="${wordEnd}">${prefix}${text}</span>`;
    }).join('');

    return `      <p begin="${lineStart}" end="${lineEnd}">${wordSpans}</p>`;
  }).filter(Boolean).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling" xml:lang="en">
  <head>
    <styling>
      <style xml:id="default" tts:fontSize="100%" tts:textAlign="center"/>
    </styling>
  </head>
  <body>
    <div>
${linesXml}
    </div>
  </body>
</tt>`;
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function isTTMLSelected() {
  const ttmlRadio = document.getElementById('ttml-opt');
  return ttmlRadio ? ttmlRadio.checked : false;
}

function updateLyricsFormat() {
  if (!lyricsData) return;

  currentLyricsText = isTTMLSelected() 
    ? formatLyricsToTTML(lyricsData) 
    : formatLyricsToLRC(lyricsData);

  previewEl.textContent = currentLyricsText;
}

async function refreshPreview() {
  setStatus('Fetching...');
  const tab = await getActiveTab();
  if (!tab) {
    setStatus('No active tab');
    previewEl.textContent = '—';
    return;
  }

  if (!/^https:\/\/music\.youtube\.com/.test(tab.url || '')) {
    setStatus('This extension runs on music.youtube.com only');
    previewEl.textContent = `Active tab: ${tab.url || 'Unknown'}`;
    return;
  }

  try {
    const response = await browser.tabs.sendMessage(tab.id, { action: 'getBlyrics' });
    songInfo = await browser.tabs.sendMessage(tab.id, { action: 'getInfo' });
    lyricsData = response?.lyrics || null;

    if (!lyricsData || lyricsData.length === 0) {
      setStatus('No synced lyrics found.');
      previewEl.textContent = '—';
      currentLyricsText = null;
      return;
    }

    setStatus('Extracted Lyrics — preview');
    updateLyricsFormat();
  } catch (e) {
    setStatus('Unable to communicate with tab.');
    previewEl.textContent = '—';
  }
}

/**
 * refer to this answer on stackoverflow
 * https://stackoverflow.com/a/61738856
 */

function downloadLrc(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

copyBtn.addEventListener('click', async () => {
  if (!currentLyricsText) {
    setStatus('Nothing to copy');
    return;
  }

  try {
    await navigator.clipboard.writeText(currentLyricsText);
    setStatus('FULL Lyrics copied');
  } catch {
    setStatus('Clipboard failed');
  }
});

downloadBtn.addEventListener('click', () => {
  if (!currentLyricsText) {
    setStatus('Nothing to Download');
    return;
  }

  try {
    const ext = isTTMLSelected() ? 'ttml' : 'lrc';
    const filename = `${sanitizeFilename(songInfo)}.${ext}`;
    downloadLrc(currentLyricsText, filename);
    setStatus('File downloaded');
  } catch {
    setStatus('Download failed');
  }
});

refreshBtn.addEventListener('click', refreshPreview);
window.addEventListener('load', refreshPreview);

document.querySelectorAll('input[name="format-view"]').forEach(radio => {
  radio.addEventListener('change', updateLyricsFormat);
});