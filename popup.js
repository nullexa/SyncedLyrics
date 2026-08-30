const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const copyBtn = document.getElementById('copyBtn');
const refreshBtn = document.getElementById('refreshBtn');
const downloadBtn = document.getElementById('downloadBtn');

let fullHTML = null;
let Lyrics = null;
let info = null;
let filename = null;

function setStatus(text) {
  statusEl.textContent = text;
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function requestBlyricsFromTab(tab) {
  try {
    const response = await browser.tabs.sendMessage(tab.id, { action: 'getBlyrics' });
    // response expected: { html: ... , url: ... } or undefined
    return response && response.html ? response.html : null;
  } catch (e) {
    // no content script in tab or other error
    return null;
  }
}

async function requestSongInfoFromTab(tab) {
  try {
    const response = await browser.tabs.sendMessage(tab.id, { action: 'getInfo' });
    // response expected: { html: ... } or undefined
    return response ?? null;
  } catch (e) {
    // no content script in tab or other error
    return null;
  }
}

async function refreshPreview() {
  setStatus('Fetching...');
  const tab = await getActiveTab();
  if (!tab) {
    setStatus('No active tab');
    previewEl.textContent = '—';
    return;
  }

  if (!/^https:\/\/music\.youtube\.com/.test(tab.url)) {
    setStatus('This extension runs on music.youtube.com only');
    previewEl.textContent = `Active tab: ${tab.url}`;
    return;
  }

  const html = await requestBlyricsFromTab(tab);
  const songInfo = await requestSongInfoFromTab(tab);

  if (!html) {
    setStatus('No synced lyrics found.');
    previewEl.textContent = '—';
    fullHTML = null;
    return;
  }

  fullHTML = html; // store full html
  info = songInfo; // store song info
  filename = `${info}.lrc`

  setStatus('Extracted Lyrics — preview');

  // extract lyrics 

  function parseOuterHTML(html) {
    if (!html) return null;

    const doc = new DOMParser().parseFromString(html, "text/html");

    // Wrap body children in a container if multiple exist
    if (doc.body.children.length === 0) return null;
    if (doc.body.children.length === 1) return doc.body.firstElementChild;

    // If multiple top-level nodes, wrap them in a <div>
    const wrapper = document.createElement("div");
    Array.from(doc.body.children).forEach(c => wrapper.appendChild(c));
    return wrapper;
  }

  function extractLyricsJSON(containerEl) {
    const lines = [];

    const lineEls = containerEl.querySelectorAll(".blyrics--line");
    lineEls.forEach((lineEl) => {
      const lineWords = [];
      lineEl.querySelectorAll(".blyrics--word").forEach((wordEl) => {
        lineWords.push({
          text: wordEl.textContent,
          start: parseFloat(wordEl.dataset.time) || 0,
          duration: parseFloat(wordEl.dataset.duration) || 0,
        });
      });

      lines.push({
        lineNumber: parseInt(lineEl.dataset.lineNumber) || 0,
        start: parseFloat(lineEl.dataset.time) || 0,
        duration: parseFloat(lineEl.dataset.duration) || 0,
        words: lineWords,
      });
    });

    return lines;
  }

  const containerEl = parseOuterHTML(fullHTML);
  const lyricsJSON = extractLyricsJSON(containerEl);

  /**
   * Formats JSON lyrics into a single-line Enhanced LRC string.
   * @param {Array} data - The JSON input array.
   * @returns {string} - The formatted lyric string.
   */
  function formatLyrics(data) {
    // Helper to convert seconds to [mm:ss.xx]
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = (seconds % 60).toFixed(2);
      const mm = mins.toString().padStart(2, '0');
      const ss = secs.toString().padStart(5, '0');
      return `${mm}:${ss}`;
    };

    return data.map(line => {
      // Get the starting timestamp for the line
      const lineStartTime = formatTime(line.start);

      // Filter out objects that are just spaces or empty strings
      const actualWords = line.words.filter(w => w.text.trim().length > 0);

      // Build the word sequence with end-time tags: Word<end_time>
      const formattedWords = actualWords.map((wordObj, index) => {
        const endTime = formatTime(wordObj.start + wordObj.duration);
        const text = wordObj.text.trim();

        // Add a space before the word unless it's the first word of the line
        const prefix = index === 0 ? "" : " ";
        return `${prefix}${text}<${endTime}>`;
      }).join("");

      // Return the single formatted line
      return `[${lineStartTime}]${formattedWords}`;
    }).join("\n");
  }

  Lyrics = formatLyrics(lyricsJSON);
  // const output = formatLyrics(input);
  // console.log(output);

  previewEl.textContent = Lyrics;
  // console.log('this is the variable :)', Lyrics);

}

/**
 * If you have any doubts about how and why use this downloadLrc function
 * implimented they way it is, refer to this answer on stackoverflow
 * https://stackoverflow.com/a/61738856
 */

function downloadLrc(lrcText, filename = 'lyrics.lrc') {
  // Ensure the filename ends with .lrc
  if (!filename.endsWith('.lrc')) {
    filename += '.lrc';
  }

  // Create a Blob containing lyrics
  const blob = new Blob([lrcText], { type: 'text/plain;charset=utf-8;' });

  //Create an anchor element and trigger the download

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

filename = `${info}-lyrics.lrc`

copyBtn.addEventListener('click', async () => {
  if (!Lyrics) {
    setStatus('Nothing to copy');
    return;
  }

  try {
    await navigator.clipboard.writeText(Lyrics);
    setStatus('FULL Lyrics copied');
  } catch {
    setStatus('Clipboard failed');
  }
});

downloadBtn.addEventListener('click', async () => {
  if (!Lyrics) {
    setStatus('Nothing to Download');
    return;
  }

  try {
    downloadLrc(Lyrics, filename);
    setStatus('.lrc file downloaded');
  } catch {
    setStatus('Download failed');
  }
});

refreshBtn.addEventListener('click', refreshPreview);

window.addEventListener('load', refreshPreview);


